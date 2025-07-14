#pragma once

#include <cstdint>
#include <websocketpp/server.hpp>
#include <websocketpp/config/asio_no_tls.hpp>
#include "../utils/lookup_utils/common_structs.hpp"
#include <nlohmann/json.hpp>
#include <thread>
#include <atomic>

class IpTracker;

class UserInterface {
public:
    UserInterface(IpTracker* ipTracker);
    UserInterface();
    ~UserInterface();

    void start(uint16_t port);
    void stop();
    void send_traceResult(const traceResult& tr);

private:
    IpTracker* ipTracker;
    using server = websocketpp::server<websocketpp::config::asio>;
    using connection_hdl = websocketpp::connection_hdl;

    std::atomic<bool> m_running;
    server m_server;
    connection_hdl m_hdl;
    std::thread m_send_thread;

    void send_loop();
    traceResult generate_sample_traceResult();
};
