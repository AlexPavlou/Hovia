#pragma once
#include "utils/settings/settings.hpp"
#include <memory>
#include <string>
#include <mutex>

enum LogLevel { DEBUG, INFO, WARNING, ERROR, CRITICAL };

class Logger {
    public:
        static Logger& getInstance();
        static Logger& getInstance(const std::shared_ptr<Settings> pSettings);
        void log(const LogLevel level, const std::string& functionName,
                 const std::string& message) const;
        std::string getCurrentTimestamp() const;

    private:
        Logger() = default;
        Logger(const Logger&) = delete;
        Logger& operator=(const Logger&) = delete;

        std::shared_ptr<Settings> m_pSettings;

        mutable std::mutex m_logMutex;

        static std::string levelToString(const LogLevel level);
};

extern std::shared_ptr<Logger> LOGGER;
