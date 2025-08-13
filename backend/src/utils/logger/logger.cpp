#include "logger.hpp"
#include <string>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <fstream>
#include <memory>

std::shared_ptr<Logger> LOGGER;

Logger& Logger::getInstance(const std::shared_ptr<Settings> pSettings) {
    static Logger instance;
    static bool initialised = false;
    if (!initialised) {
        if (!pSettings) {
            throw std::runtime_error(
                "Logger must be initialised with valid Settings on first use.");
        }
        instance.m_pSettings = std::move(pSettings);
        initialised = true;
    }
    return instance;
}

Logger& Logger::getInstance() { return getInstance(nullptr); }

std::string Logger::getCurrentTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto t_c = std::chrono::system_clock::to_time_t(now);

    std::stringstream ss;
    ss << std::put_time(std::localtime(&t_c), "%F %T");
    return ss.str();
}

std::string Logger::levelToString(const LogLevel level) {
    switch (level) {
        case DEBUG:
            return "DEBUG";
        case INFO:
            return "INFO";
        case WARNING:
            return "WARNING";
        case ERROR:
            return "ERROR";
        case CRITICAL:
            return "CRITICAL";
        default:
            return "UNKNOWN";
    }
}

void Logger::log(const LogLevel level, const std::string& functionName,
                 const std::string& message) const {
    std::lock_guard<std::mutex> lock(m_logMutex);
    std::ofstream ofs(m_pSettings->getLogPath(), std::ios::app);
    if (!ofs)
        return;

    ofs << "[" << getCurrentTimestamp() << "] " << "[" << levelToString(level)
        << "] [" << functionName << "()]: " << message << "\n";
}
