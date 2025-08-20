#include "logger.hpp"
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <stdexcept>

std::shared_ptr<Logger> LOGGER;

Logger& Logger::getInstance() {
    static Logger instance;
    return instance;
}

void Logger::openLogStream(const std::string& logPath) {
    if (m_currentLogPath == logPath && m_logStream.is_open()) {
        // Same file already open, no action needed.
        return;
    }

    // Close current file if open
    if (m_logStream.is_open()) {
        m_logStream.flush();
        m_logStream.close();
    }

    // Open new log file
    m_logStream.open(logPath, std::ios::app);
    if (!m_logStream) {
        throw std::runtime_error("Failed to open log file: " + logPath);
    }
    m_currentLogPath = logPath;
}

void Logger::closeLogStream() {
    if (m_logStream.is_open()) {
        m_logStream.flush();
        m_logStream.close();
        m_currentLogPath.clear();
    }
}

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
                 const std::string& message, const std::string& logPath) const {
    static const std::string fallbackLogPath = "app.log";

    // ensures concurrent access to the log stream
    std::lock_guard<std::mutex> lock(m_logMutex);
    std::ostream* outStream = nullptr;

    // Determine default path safely: if m_pSettings is not initialized, use
    // fallback path
    const std::string defaultPath =
        (m_pSettings && !m_pSettings->getLogPath().empty())
            ? m_pSettings->getLogPath()
            : fallbackLogPath;

    const std::string& targetPath = logPath.empty() ? defaultPath : logPath;

    // Switch/open log streams if needed
    if (targetPath != m_currentLogPath) {
        // Close existing stream if open
        if (m_logStream.is_open()) {
            m_logStream.flush();
            m_logStream.close();
        }

        // Try opening the new log stream
        m_logStream.open(targetPath, std::ios::app);
        if (!m_logStream) {
            // Failed to open new log file
            // If we are not already on default log, fallback to default or
            // fallback path
            if (targetPath != defaultPath) {
                m_logStream.clear();
                m_logStream.open(defaultPath, std::ios::app);
                if (m_logStream) {
                    m_logStream
                        << "[" << getCurrentTimestamp()
                        << "] [ERROR] [Logger::log()]: "
                        << "Failed to open custom log file: " << targetPath
                        << ". Logging to default log instead.\n";
                    m_logStream.flush();
                    m_currentLogPath = defaultPath;
                } else {
                    // Failed to open default log itself; silently fail here
                    return;
                }
            } else {
                // Failed to open default log itself; silently fail here
                return;
            }
        } else {
            m_currentLogPath = targetPath;
        }
    }

    outStream = &m_logStream;

    (*outStream) << "[" << getCurrentTimestamp() << "] "
                 << "[" << levelToString(level) << "] "
                 << "[" << functionName << "()]: " << message << "\n";
    outStream->flush();
}
