#pragma once
#include "settings.hpp"
#include <memory>
#include <string>
#include <mutex>

class Logger {
public:
    explicit Logger(std::shared_ptr<Settings>& pSettings);
    void logError(const std::string& context, const std::string& message) const;
    std::string getCurrentTimestamp() const;
private:
    std::string m_logPath;
    mutable std::mutex m_logMutex;
    std::shared_ptr<Settings> m_pSettings;
};

extern std::shared_ptr<Logger> LOGGER;
