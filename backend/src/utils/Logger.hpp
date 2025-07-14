#pragma once
#include "settings.hpp"
#include <memory>
#include <string>
#include <mutex>

class Logger {
public:
    explicit Logger(std::shared_ptr<Settings>& settings);
    void logError(const std::string& context, const std::string& message) const;
    std::string getCurrentTimestamp() const;
private:
    std::string logFile;
    mutable std::mutex logMutex;
    std::shared_ptr<Settings> settings;
};

extern std::shared_ptr<Logger> LOGGER;