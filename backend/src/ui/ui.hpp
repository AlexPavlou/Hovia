#pragma once

#include <cstdint>
#include <websocketpp/server.hpp>
#include <websocketpp/config/asio_no_tls.hpp>
#include "../utils/lookup_utils/common_structs.hpp"
#include <nlohmann/json.hpp>
#include <thread>
#include <atomic>
#include "crow_all.h"

class IpTracker;

typedef websocketpp::server<websocketpp::config::asio> server;

class UserInterface {
public:
    UserInterface(IpTracker* ipTracker);
    UserInterface();
    ~UserInterface();

    void start(uint16_t port, uint16_t http_port);
    void stop();
    void send_traceResult(const traceResult& tr);

private:
    IpTracker* ipTracker;
    //using server = websocketpp::server<websocketpp::config::asio>;
    using connection_hdl = websocketpp::connection_hdl;
    std::thread m_http_thread;

    std::atomic<bool> m_running;
    server m_server;
    connection_hdl m_hdl;
    std::thread m_send_thread;

    std::thread m_ws_thread;

    void send_loop();
    void setupHttp(crow::SimpleApp& app);
};
