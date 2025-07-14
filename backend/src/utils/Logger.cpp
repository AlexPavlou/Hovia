#include "Logger.hpp"
#include <chrono>
#include <ctime>
#include <iomanip>
#include <fstream>

std::shared_ptr<Logger> LOGGER;

std::string Logger::getCurrentTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto t_c = std::chrono::system_clock::to_time_t(now);

    std::stringstream ss;
    ss << std::put_time(std::localtime(&t_c), "%F %T");
    return ss.str();
}

Logger::Logger(std::shared_ptr<Settings>& settings)
    : settings(std::move(settings)) {}

void Logger::logError(const std::string& context, const std::string& message) const {
    std::lock_guard<std::mutex> lock(logMutex);
    std::ofstream ofs(settings->getLogPath(), std::ios::app);
    if (!ofs) return; // silently fail if file can't open

    ofs << "[" << getCurrentTimestamp() << "] " << "[ERROR] [" << context << "] " << message << "\n";
}
