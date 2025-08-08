#pragma once
#include <cstdint>
#include <websocketpp/server.hpp>
#include <websocketpp/config/asio_no_tls.hpp>
#include "utils/common_structs.hpp"
#include <nlohmann/json.hpp>
#include <thread>
#include <atomic>
#include "crow_all.h"

class IpTracker;

typedef websocketpp::server<websocketpp::config::asio> server;

class ApiServer {
    public:
        ApiServer(IpTracker* ipTracker);
        ~ApiServer();

        // start webbsocket and HTTP servers on the specified ports
        void startAPI(uint16_t port, uint16_t http_port);
        void stopAPI();
        // send traceResult to the connected websocket client
        void sendResult(const traceResult& result);

    private:
        IpTracker* m_ipTracker;
        using connHandle = websocketpp::connection_hdl;
        std::thread m_httpThread;  // http server thread

        std::atomic<bool> m_running;
        server m_server;           // websocket server instance
        connHandle m_hdl;          // websocket connection handle
        std::thread m_sendThread;  // thread that runs asynchronously to send
                                   // websocket messages

        std::thread m_wsThread;

        void sendLoop();
        void setupHttp(crow::SimpleApp& app);
};
