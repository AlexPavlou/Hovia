#pragma once
#include "utils/settings/settings.hpp"
#include <memory>
#include <string>
#include <mutex>
#include <fstream>

enum LogLevel { DEBUG, INFO, WARNING, ERROR, CRITICAL };

class Logger {
    public:
        static Logger& getInstance();

        void log(const LogLevel level, const std::string& functionName,
                 const std::string& message,
                 const std::string& logPath = "") const;

        std::string getCurrentTimestamp() const;

    private:
        Logger() = default;
        Logger(const Logger&) = delete;
        Logger& operator=(const Logger&) = delete;

        void openLogStream(const std::string& logPath);
        void closeLogStream();

        mutable std::mutex m_logMutex;
        std::shared_ptr<Settings> m_pSettings;
        mutable std::ofstream m_logStream;
        mutable std::string m_currentLogPath;

        static std::string levelToString(const LogLevel level);
};

extern std::shared_ptr<Logger> LOGGER;
