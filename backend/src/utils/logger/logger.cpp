#include "logger.hpp"
#include <string>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <fstream>
#include <memory>

std::shared_ptr<Logger> LOGGER;

Logger::Logger(std::shared_ptr<Settings>& pSettings)
    : m_pSettings(std::move(pSettings)) {}

std::string Logger::getCurrentTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto t_c = std::chrono::system_clock::to_time_t(now);

    std::stringstream ss;
    ss << std::put_time(std::localtime(&t_c), "%F %T");
    return ss.str();
}

void Logger::logData(const std::string& data) {
    std::lock_guard<std::mutex> lock(m_logMutex);
    std::ofstream ofs(m_pSettings->getLogPath(), std::ios::app);
    if (!ofs) return; // silently fail if file can't open

    ofs << " " << data << " ";
}

void Logger::logError(const std::string& context, const std::string& message) const {
    std::lock_guard<std::mutex> lock(m_logMutex);
    std::ofstream ofs(m_pSettings->getLogPath(), std::ios::app);
    if (!ofs) return;

    ofs << "[" << getCurrentTimestamp() << "] " << "[ERROR] [" << context << "] " << message << "\n";
}
