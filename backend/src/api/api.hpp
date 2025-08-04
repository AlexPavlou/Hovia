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

class ApiServer {
    public:
        ApiServer(IpTracker* ipTracker);
        ApiServer();
        ~ApiServer();

        void startAPI(uint16_t port, uint16_t http_port);
        void stopAPI();
        void sendResult(const traceResult& result);

    private:
        IpTracker* m_ipTracker;
        using connHandle = websocketpp::connection_hdl;
        std::thread m_httpThread;

        std::atomic<bool> m_running;
        server m_server;
        connHandle m_hdl;
        std::thread m_sendThread;

        std::thread m_wsThread;

        void sendLoop();
        void setupHttp(crow::SimpleApp& app);
};
