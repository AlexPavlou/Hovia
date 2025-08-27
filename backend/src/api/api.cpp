#include "api.hpp"
#include "ipTracker/ipTracker.hpp"
#include "utils/api/apiHelpers.hpp"
#include "utils/api/serialization.hpp"
#include "platform_dependent/network_interface/network_interface.hpp"
#include "utils/logger/logger.hpp"

using json = nlohmann::json;

LogLevel ApiServer::convertCrowLogLevel(crow::LogLevel lvl) {
    switch (lvl) {
        case crow::LogLevel::Debug:
            return LogLevel::DEBUG;
        case crow::LogLevel::Info:
            return LogLevel::INFO;
        case crow::LogLevel::Warning:
            return LogLevel::WARNING;
        case crow::LogLevel::Error:
            return LogLevel::ERROR;
        default:
            return LogLevel::INFO;
    }
}

// CrowLogBridge Implementation
void CrowLogBridge::log(std::string&& line) {
    Logger::getInstance().log(LogLevel::INFO, "crow", std::move(line));
}

void CrowLogBridge::log(const std::string& line) {
    Logger::getInstance().log(LogLevel::INFO, "crow", line);
}

void CrowLogBridge::log(std::string message, crow::LogLevel level) {
    Logger::getInstance().log(ApiServer::convertCrowLogLevel(level), "crow",
                              std::move(message));
}

CrowLogBridge::~CrowLogBridge() = default;

// ApiServer Implementation

ApiServer::ApiServer(IpTracker* ipTracker)
    : m_ipTracker(ipTracker), m_running(false) {
    m_server.init_asio();

    m_server.set_open_handler([this](connHandle hdl) { m_hdl = hdl; });

    m_server.set_message_handler(
        [this](connHandle hdl, server::message_ptr msg) {
            m_server.send(hdl, msg->get_payload(),
                          websocketpp::frame::opcode::text);
        });

    m_server.set_close_handler([this](connHandle) { m_hdl.reset(); });
}

ApiServer::~ApiServer() { stopAPI(); }

void ApiServer::setCorsHeaders(crow::response& res) const {
    res.set_header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers",
                   "Content-Type, Authorization");
}

crow::response ApiServer::handleSettingsOptions() const {
    crow::response res;
    setCorsHeaders(res);
    res.code = 204;
    return res;
}

crow::response ApiServer::handleSettingsGet() const {
    crow::json::wvalue res;
    auto& settings = m_ipTracker->pSettings;

    res["logPath"] = settings->getLogPath();
    res["interfaceOption"] = settings->getInterfaceOption();
    res["filter"] = settings->getFilter();
    res["lookupMode"] = lookupModeToString(settings->getLookupMode());
    res["theme"] = themeToString(settings->getTheme());
    res["activeLanguage"] = languageToString(settings->getLanguage());
    res["maxHops"] = settings->getMaxHops();
    res["timeout"] = settings->getTimeout();
    res["animationToggle"] = settings->getAnimationToggle();
    res["hasVerbose"] = settings->hasVerbose();
    res["websocketPort"] = settings->getWebsocket();

    crow::response response{res};
    setCorsHeaders(response);
    return response;
}

crow::response ApiServer::handleSettingsPost(const crow::request& req) {
    auto body = crow::json::load(req.body);
    if (!body) {
        crow::response res(400, "Invalid JSON");
        setCorsHeaders(res);
        return res;
    }
    auto& settings = m_ipTracker->pSettings;

    if (body.has("logPath"))
        settings->setLogPath(body["logPath"].s());
    if (body.has("interfaceOption"))
        settings->setInterfaceOption(body["interfaceOption"].s());
    if (body.has("filter"))
        settings->setFilter(body["filter"].s());

    if (body.has("lookupMode")) {
        auto lm = body["lookupMode"].s();
        if (lm == "DB")
            settings->setLookupMode(LookupMode::DB);
        else if (lm == "API")
            settings->setLookupMode(LookupMode::API);
        else
            settings->setLookupMode(LookupMode::AUTO);
    }

    if (body.has("theme")) {
        auto theme = body["theme"].s();
        if (theme == "Dark")
            settings->setTheme(ActiveTheme::DARK);
        else if (theme == "Light")
            settings->setTheme(ActiveTheme::LIGHT);
        else
            settings->setTheme(ActiveTheme::AUTO);
    }

    if (body.has("activeLanguage")) {
        auto lang = body["activeLanguage"].s();
        if (lang == "Spanish")
            settings->setLanguage(ActiveLanguage::SPANISH);
        else if (lang == "Greek")
            settings->setLanguage(ActiveLanguage::GREEK);
        else
            settings->setLanguage(ActiveLanguage::ENGLISH);
    }

    if (body.has("maxHops"))
        settings->setMaxHops(body["maxHops"].i());
    if (body.has("timeout"))
        settings->setTimeout(body["timeout"].i());
    if (body.has("animationToggle"))
        settings->setAnimationToggle(body["animationToggle"].b());
    if (body.has("hasVerbose"))
        settings->setVerbose(body["hasVerbose"].b());
    if (body.has("WebsocketPort"))
        settings->setWebsocket(body["WebsocketPort"].i());

    crow::response res(200, "Settings updated");
    setCorsHeaders(res);
    return res;
}

crow::response ApiServer::handleInterfacesOptions() const {
    crow::response res;
    setCorsHeaders(res);
    res.code = 204;
    return res;
}

crow::response ApiServer::handleInterfacesGet() const {
    crow::json::wvalue res = crow::json::wvalue::list();
    int i = 0;
    for (const auto& iface : getAllInterfaces()) {
        res[i++] = iface;
    }
    crow::response response{res};
    setCorsHeaders(response);
    return response;
}

void ApiServer::setupHttp(crow::SimpleApp& app) {
    CROW_ROUTE(app, "/api/settings").methods("OPTIONS"_method)([this]() {
        return handleSettingsOptions();
    });
    CROW_ROUTE(app, "/api/settings").methods("GET"_method)([this]() {
        return handleSettingsGet();
    });
    CROW_ROUTE(app, "/api/settings")
        .methods("POST"_method)([this](const crow::request& req) {
            return handleSettingsPost(req);
        });
    CROW_ROUTE(app, "/api/interfaces").methods("OPTIONS"_method)([this]() {
        return handleInterfacesOptions();
    });
    CROW_ROUTE(app, "/api/interfaces").methods("GET"_method)([this]() {
        return handleInterfacesGet();
    });
}

void ApiServer::startAPI() {
    m_running.store(true);
    crow::logger::setHandler(new CrowLogBridge());

    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Initialising HTTP API at port 8080");

    m_httpThread = std::thread([this]() {
        m_pApp = std::make_unique<crow::SimpleApp>();
        setupHttp(*m_pApp);
        m_pApp->port(8080).concurrency(1).run();
    });

    boost::system::error_code ec;
    uint16_t ws_port = m_ipTracker->pSettings->getWebsocket();

    m_server.listen(ws_port, ec);
    if (ec) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Websocket server listen error:" +
                                      ec.message());
        return;
    }

    if (m_ipTracker->pSettings->hasVerbose()) {
        m_server.set_access_channels(websocketpp::log::alevel::none);
        m_server.set_error_channels(websocketpp::log::elevel::warn |
                                    websocketpp::log::elevel::rerror);
    } else {
        m_server.set_access_channels(websocketpp::log::alevel::none);
        m_server.set_error_channels(websocketpp::log::elevel::none);
    }

    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Starting WS server on port " +
                                      std::to_string(ws_port));

    m_server.start_accept();

    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(
            LogLevel::INFO, __func__,
            "WS server started and accepting connections");

    m_sendThread = std::thread(&ApiServer::sendLoop, this);
    m_wsThread = std::thread([this]() { m_server.run(); });
}

void ApiServer::stopAPI() {
    if (!m_running.exchange(false))
        return;

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

void ApiServer::sendLoop() {
    try {
        while (m_running.load()) {
            traceResult tr;
            if (!m_ipTracker->dequeueResult(tr)) {
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
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
