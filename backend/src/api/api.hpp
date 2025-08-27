#pragma once

#include <websocketpp/server.hpp>
#include <websocketpp/config/asio_no_tls.hpp>
#include "utils/common_structs.hpp"
#include <nlohmann/json.hpp>
#include "utils/logger/logger.hpp"
#include <thread>
#include <atomic>
#include "crow_all.h"

class IpTracker;

typedef websocketpp::server<websocketpp::config::asio> server;

class CrowLogBridge : public crow::ILogHandler {
    public:
        using crow::ILogHandler::log;

        void log(std::string&& line);
        void log(const std::string& line);
        void log(std::string message, crow::LogLevel level);

        virtual ~CrowLogBridge();
};

class ApiServer {
    public:
        ApiServer(IpTracker* ipTracker);
        ~ApiServer();

        void startAPI();
        void stopAPI();
        void sendResult(const traceResult& result);

        static LogLevel convertCrowLogLevel(crow::LogLevel lvl);

    private:
        IpTracker* m_ipTracker;
        using connHandle = websocketpp::connection_hdl;

        std::thread m_httpThread;
        std::unique_ptr<crow::SimpleApp> m_pApp;

        std::atomic<bool> m_running;

        server m_server;
        connHandle m_hdl;

        std::thread m_sendThread;
        std::thread m_wsThread;

        void setCorsHeaders(crow::response& res) const;

        crow::response handleSettingsOptions() const;
        crow::response handleSettingsGet() const;
        crow::response handleSettingsPost(const crow::request& req);
        crow::response handleInterfacesOptions() const;
        crow::response handleInterfacesGet() const;

        void sendLoop();
        void setupHttp(crow::SimpleApp& app);
};
