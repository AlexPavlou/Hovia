#include "api.hpp"
#include "ipTracker/ipTracker.hpp"
#include "utils/common_structs.hpp"
#include "utils/logger/logger.hpp"
#include <websocketpp/server.hpp>
#include <nlohmann/json.hpp>
#include <thread>
#include <atomic>

using json = nlohmann::json;

// JSON serialization for hopInfo struct
void to_json(json& j, const hopInfo& h) {
    j = json{{"hopIP", std::string(h.hopIP)}, {"latency", h.latency}};
}

// JSON serialization for destInfo struct
void to_json(json& j, const destInfo& d) {
    j = json{{"ip", std::string(d.ip)},
             {"country", d.country},
             {"region", d.region},
             {"isp", d.isp},
             {"org", d.org},
             {"as", d.as},
             {"asname", d.asname},
             {"latitude", d.latitude},
             {"longitude", d.longitude},
             {"time_zone", d.time_zone}};
}

// JSON serialization for traceResult struct
void to_json(json& j, const traceResult& t) {
    j = json{{"dest_info", t.dest_info}, {"hops", t.hops}};
}

ApiServer::ApiServer(IpTracker* ipTracker)
    : m_ipTracker(ipTracker), m_running(false) {
    m_server.init_asio();  // initialize ASIO transport

    m_server.set_open_handler([this](connHandle hdl) {
        // store connection handle
        m_hdl = hdl;
    });

    m_server.set_message_handler(
        [this](connHandle hdl, server::message_ptr msg) {
            //
            m_server.send(hdl, msg->get_payload(),
                          websocketpp::frame::opcode::text);
        });

    m_server.set_close_handler([this](connHandle) {
        // reset stored handle when the connection closes
        m_hdl.reset();
    });
}

ApiServer::~ApiServer() { stopAPI(); }

// function to setup the crow HTTP routes for the different API endpoints
// also handles CORS headers and GET/POST/OPTIONS for /api/settings
void ApiServer::setupHttp(crow::SimpleApp& app) {
    auto setCorsHeaders = [](crow::response& res) {
        // allow localhost React app to access the API
        res.set_header("Access-Control-Allow-Origin", "http://localhost:3000");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers",
                       "Content-Type, Authorization");
    };

    // Handle OPTIONS preflight request
    CROW_ROUTE(app, "/api/settings")
        .methods("OPTIONS"_method)([setCorsHeaders]() {
            crow::response res;
            setCorsHeaders(res);
            res.code = 204;  // No Content
            return res;
        });

    CROW_ROUTE(app, "/api/settings")
        .methods("GET"_method)([this, setCorsHeaders]() {
            crow::json::wvalue res;

            // Basic strings
            res["logPath"] = m_ipTracker->pSettings->getLogPath();
            res["interfaceOption"] =
                m_ipTracker->pSettings->getInterfaceOption();
            res["filter"] = m_ipTracker->pSettings->getFilter();

            // LookupMode as string
            switch (m_ipTracker->pSettings->getLookupMode()) {
                case LookupMode::DB:
                    res["lookupMode"] = "DB";
                    break;
                case LookupMode::API:
                    res["lookupMode"] = "API";
                    break;
                default:
                    res["lookupMode"] = "AUTO";
                    break;
            }

            // Theme as string
            switch (m_ipTracker->pSettings->getTheme()) {
                case ActiveTheme::DARK:
                    res["activeTheme"] = "DARK";
                    break;
                case ActiveTheme::LIGHT:
                    res["activeTheme"] = "LIGHT";
                    break;
                default:
                    res["activeTheme"] = "AUTO";
                    break;
            }

            // Language as string
            switch (m_ipTracker->pSettings->getLanguage()) {
                case ActiveLanguage::ENGLISH:
                    res["activeLanguage"] = "ENGLISH";
                    break;
                case ActiveLanguage::SPANISH:
                    res["activeLanguage"] = "SPANISH";
                    break;
                case ActiveLanguage::GREEK:
                    res["activeLanguage"] = "GREEK";
                    break;
                default:
                    res["activeLanguage"] = "ENGLISH";
                    break;
            }

            // Other values
            res["maxHops"] = m_ipTracker->pSettings->getMaxHops();
            res["timeout"] = m_ipTracker->pSettings->getTimeout();

            // Boolean flags
            res["hasAnimation"] = m_ipTracker->pSettings->hasAnimation();
            res["hasVerbose"] = m_ipTracker->pSettings->hasVerbose();

            res["WebsocketPort"] = m_ipTracker->pSettings->getWebsocket();

            crow::response response{res};
            setCorsHeaders(response);
            return response;
        });

    CROW_ROUTE(app, "/api/settings")
        .methods(
            "POST"_method)([this, setCorsHeaders](const crow::request& req) {
            auto body = crow::json::load(req.body);
            if (!body) {
                crow::response res(400, "Invalid JSON");
                setCorsHeaders(res);
                return res;
            }

            if (body.has("logPath"))
                m_ipTracker->pSettings->setLogPath(body["logPath"].s());

            if (body.has("interfaceOption"))
                m_ipTracker->pSettings->setInterfaceOption(
                    body["interfaceOption"].s());

            if (body.has("filter"))
                m_ipTracker->pSettings->setFilter(body["filter"].s());

            if (body.has("lookupMode")) {
                auto lookupMode = body["lookupMode"].s();
                if (lookupMode == "DB")
                    m_ipTracker->pSettings->setLookupMode(LookupMode::DB);
                else if (lookupMode == "API")
                    m_ipTracker->pSettings->setLookupMode(LookupMode::API);
                else
                    m_ipTracker->pSettings->setLookupMode(LookupMode::AUTO);
            }

            if (body.has("activeTheme")) {
                auto theme = body["activeTheme"].s();
                if (theme == "DARK")
                    m_ipTracker->pSettings->setTheme(ActiveTheme::DARK);
                else if (theme == "LIGHT")
                    m_ipTracker->pSettings->setTheme(ActiveTheme::LIGHT);
                else
                    m_ipTracker->pSettings->setTheme(ActiveTheme::AUTO);
            }

            if (body.has("activeLanguage")) {
                auto lang = body["activeLanguage"].s();
                if (lang == "ENGLISH")
                    m_ipTracker->pSettings->setLanguage(
                        ActiveLanguage::ENGLISH);
                else if (lang == "SPANISH")
                    m_ipTracker->pSettings->setLanguage(
                        ActiveLanguage::SPANISH);
                else if (lang == "GREEK")
                    m_ipTracker->pSettings->setLanguage(ActiveLanguage::GREEK);
                else
                    m_ipTracker->pSettings->setLanguage(
                        ActiveLanguage::ENGLISH);
            }

            if (body.has("maxHops"))
                m_ipTracker->pSettings->setMaxHops(body["maxHops"].i());

            if (body.has("timeout"))
                m_ipTracker->pSettings->setTimeout(body["timeout"].i());

            if (body.has("hasAnimation"))
                m_ipTracker->pSettings->setAnimation(body["hasAnimation"].b());

            if (body.has("hasVerbose"))
                m_ipTracker->pSettings->setVerbose(body["hasVerbose"].b());

            if (body.has("WebsocketPort"))
                m_ipTracker->pSettings->setWebsocket(body["WebsocketPort"].i());

            // m_ipTracker->pSettings->saveToFile();

            crow::response res(200, "Settings updated");
            setCorsHeaders(res);
            return res;
        });
}

void ApiServer::startAPI() {
    m_running.store(true);

    // HTTP server thread
    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Initialising HTTP API at port 8080");
    m_httpThread = std::thread([this]() {
        crow::SimpleApp app;
        setupHttp(app);
        app.port(8080).concurrency(1).run();
    });

    // start websocket server listening on the given port
    boost::system::error_code ec;
    uint16_t ws_port = m_ipTracker->pSettings->getWebsocket();
    m_server.listen(ws_port, ec);
    if (ec) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Websocket server listen error:" +
                                      ec.message());
        return;
    }

    m_server.set_access_channels(websocketpp::log::alevel::all);
    m_server.set_error_channels(websocketpp::log::elevel::all);

    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Starting WS server on port " +
                                      std::to_string(ws_port));

    m_server.start_accept();

    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(
            LogLevel::INFO, __func__,
            "WS server started and accepting connections");

    // WebSocket message sending thread
    m_sendThread = std::thread(&ApiServer::sendLoop, this);

    // Run WebSocket server on its own thread
    m_wsThread = std::thread([this]() { m_server.run(); });
}

void ApiServer::stopAPI() {
    if (!m_running.exchange(false))
        return;  // prevent double stop

    try {
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(
                LogLevel::INFO, __func__,
                "Attempting to stop the webSocket server thread");
        if (m_server.is_listening())
            m_server.stop_listening();

        m_server.stop();

        m_server.get_io_service().stop();
    } catch (const std::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__, e.what());
    }

    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Attempting to join all API threads");

    if (m_sendThread.joinable())
        m_sendThread.join();

    if (m_wsThread.joinable())
        m_wsThread.join();

    if (m_httpThread.joinable())
        m_httpThread.join();
}

void ApiServer::sendResult(const traceResult& result) {
    if (m_hdl.expired())
        return;

    json j = result;
    std::string msg = j.dump();

    try {
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Sent message: '" + msg +
                                          "' through websocket");
        m_server.send(m_hdl, msg, websocketpp::frame::opcode::text);
    } catch (const websocketpp::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Websocket send error: " +
                                      std::string(e.what()));
    }
}

// loop thread that dequeues trace results and sends them over websocket using
// the dequeueResult(traceResult& tr) and sendResult(const traceResult& result)
// functions
void ApiServer::sendLoop() {
    try {
        while (m_running.load()) {
            traceResult tr;
            if (!m_ipTracker->dequeueResult(tr)) {
                std::this_thread::sleep_for(
                    std::chrono::milliseconds(50));  // prevent busy wait
                continue;
            }
            if (m_ipTracker->pSettings->hasVerbose())
                Logger::getInstance().log(LogLevel::INFO, __func__,
                                          "Dequeued '" +
                                              std::string(tr.dest_info.ip) +
                                              "' from the result queue");

            if (!m_hdl.expired())
                sendResult(tr);
        }
    } catch (const std::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  std::string("Unexpected exception: ") +
                                      e.what());
    } catch (...) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Unknown exception caught");
    }
}
