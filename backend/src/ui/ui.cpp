#include "ui.hpp"
#include "../IpTracker.hpp"
#include "../utils/lookup_utils/common_structs.hpp"
#include <websocketpp/server.hpp>
#include <nlohmann/json.hpp>
#include <thread>
#include <atomic>

// JSON serialization for your structs:
using json = nlohmann::json;

void to_json(json& j, const hopInfo& h) {
    j = json{{"hopIP", std::string(h.hopIP)}, {"latency", h.latency}};
}

void to_json(json& j, const destInfo& d) {
    j = json{
        {"ip", std::string(d.ip)},
        {"country", d.country},
        {"region", d.region},
        {"isp", d.isp},
        {"org", d.org},
        {"as", d.as},
        {"asname", d.asname},
        {"latitude", d.latitude},
        {"longitude", d.longitude},
        {"time_zone", d.time_zone}
    };
}

void to_json(json& j, const traceResult& t) {
    j = json{{"dest_info", t.dest_info}, {"hops", t.hops}};
}

UserInterface::UserInterface(IpTracker* ipTracker) 
    : ipTracker(ipTracker), m_running(false) {
    m_server.init_asio();

    m_server.set_open_handler([this](connection_hdl hdl) {
        m_hdl = hdl;
    });

    m_server.set_message_handler([this](connection_hdl hdl, server::message_ptr msg) {
        m_server.send(hdl, msg->get_payload(), websocketpp::frame::opcode::text);
    });

    m_server.set_close_handler([this](connection_hdl) {
        m_hdl.reset();
    });
}

UserInterface::~UserInterface() {
    stop();
}

void UserInterface::setupHttp(crow::SimpleApp& app) {
    auto setCorsHeaders = [](crow::response& res) {
        res.set_header("Access-Control-Allow-Origin", "http://localhost:3000");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    };

    // Handle OPTIONS preflight request
    CROW_ROUTE(app, "/api/settings").methods("OPTIONS"_method)([setCorsHeaders]() {
        crow::response res;
        setCorsHeaders(res);
        res.code = 204; // No Content
        return res;
    });

    CROW_ROUTE(app, "/api/settings").methods("GET"_method)([this, setCorsHeaders]() {
        crow::json::wvalue res;

        res["logPath"] = ipTracker->settings->getLogPath();

        switch (ipTracker->settings->getLookupMode()) {
            case LookupMode::DB_ONLY: res["lookupMode"] = "DB_ONLY"; break;
            case LookupMode::API_ONLY: res["lookupMode"] = "API_ONLY"; break;
            default: res["lookupMode"] = "AUTO"; break;
        }

        switch (ipTracker->settings->getThemeMode()) {
            case ThemeMode::DARK: res["themeMode"] = "DARK"; break;
            case ThemeMode::LIGHT: res["themeMode"] = "LIGHT"; break;
            default: res["themeMode"] = "AUTO"; break;
        }

        res["maxHops"] = ipTracker->settings->getMaxHops();

        crow::response response{res};
        setCorsHeaders(response);
        return response;
    });

    CROW_ROUTE(app, "/api/settings").methods("POST"_method)([this, setCorsHeaders](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body) {
            crow::response res(400, "Invalid JSON");
            setCorsHeaders(res);
            return res;
        }

        if (body.has("logPath"))
            ipTracker->settings->setLogPath(body["logPath"].s());

        if (body.has("lookupMode")) {
            auto lm = body["lookupMode"].s();
            if (lm == "DB_ONLY")
                ipTracker->settings->setLookupMode(LookupMode::DB_ONLY);
            else if (lm == "API_ONLY")
                ipTracker->settings->setLookupMode(LookupMode::API_ONLY);
            else
                ipTracker->settings->setLookupMode(LookupMode::AUTO);
        }

        if (body.has("themeMode")) {
            auto tm = body["themeMode"].s();
            if (tm == "DARK")
                ipTracker->settings->setThemeMode(ThemeMode::DARK);
            else if (tm == "LIGHT")
                ipTracker->settings->setThemeMode(ThemeMode::LIGHT);
            else
                ipTracker->settings->setThemeMode(ThemeMode::AUTO);
        }

        if (body.has("maxHops"))
            ipTracker->settings->setMaxHops(body["maxHops"].i());

        ipTracker->settings->saveToFile("settings.json");

        crow::response res(200, "Settings updated");
        setCorsHeaders(res);
        return res;
    });
}

void UserInterface::start(uint16_t ws_port, uint16_t http_port) {
    m_running.store(true);

    // HTTP server thread
    m_http_thread = std::thread([this, http_port]() {
        crow::SimpleApp app;
        setupHttp(app);
        app.port(http_port).concurrency(2).run();
    });

    // Just tell the server to listen on the given port:
    boost::system::error_code ec;
    m_server.listen(ws_port, ec);
    if (ec) {
        std::cerr << "WebSocket server listen error: " << ec.message() << std::endl;
        return;
    }

    m_server.set_access_channels(websocketpp::log::alevel::all);
    m_server.set_error_channels(websocketpp::log::elevel::all);

    std::cout << "Starting WS server on port " << ws_port << std::endl;

    m_server.start_accept();

    std::cout << "WS server started and accepting connections" << std::endl;

    // WebSocket message sending thread
    m_send_thread = std::thread(&UserInterface::send_loop, this);

    // Run WebSocket server on its own thread
    m_ws_thread = std::thread([this]() {
        m_server.run();
    });
}

void UserInterface::stop() {
    if (!m_running.exchange(false)) return; // prevent double stop

    try {
        if (m_server.is_listening())
            m_server.stop_listening();

        m_server.stop();

        m_server.get_io_service().stop();

    } catch (const std::exception& e) {
        std::cerr << "Stop error: " << e.what() << std::endl;
    }

    if (m_send_thread.joinable())
        m_send_thread.join();

    if (m_ws_thread.joinable())
        m_ws_thread.join();

    if (m_http_thread.joinable())
        m_http_thread.join();
}

void UserInterface::send_traceResult(const traceResult& tr) {
    if (m_hdl.expired()) return;

    json j = tr;
    std::string msg = j.dump();

    try {
        m_server.send(m_hdl, msg, websocketpp::frame::opcode::text);
    } catch (const websocketpp::exception& e) {
        std::cerr << "WebSocket send error: " << e.what() << '\n';
    }
}

void UserInterface::send_loop() {
    while (m_running.load()) {
        traceResult tr;
        if (!ipTracker->dequeueResult(tr)) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50)); // prevent busy wait
            continue;
        }
        if (!m_hdl.expired()) send_traceResult(tr);
    }
}
