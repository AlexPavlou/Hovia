#include "settings.hpp"
#include "utils/logger/logger.hpp"
#include <fstream>
#include <memory>
#include <mutex>
#include <iostream>

using json = nlohmann::json;

uint8_t Settings::getTimeout() const { return m_timeout.load(); }

void Settings::setTimeout(uint8_t newTimeout) { m_timeout.store(newTimeout); }

std::string Settings::getLogPath() const {
    const std::lock_guard<std::mutex> lock(m_logPathMutex);
    return m_logPath;
}

void Settings::setLogPath(const std::string& newLogPath) {
    const std::lock_guard<std::mutex> lock(m_logPathMutex);
    m_logPath = newLogPath;
}

std::string Settings::getInterfaceOption() const {
    const std::lock_guard<std::mutex> lock(m_interfaceMutex);
    return m_interfaceOption;
}

void Settings::setInterfaceOption(const std::string& interface) {
    const std::lock_guard<std::mutex> lock(m_interfaceMutex);
    m_interfaceOption = interface;
}

std::string Settings::getFilter() const {
    const std::lock_guard<std::mutex> lock(m_ipFilterMutex);
    return m_ipFilter;
}

void Settings::setFilter(const std::string& newFilter) {
    const std::lock_guard<std::mutex> lock(m_ipFilterMutex);
    m_ipFilter = newFilter;
}

int Settings::getMaxHops() const { return m_maxHops.load(); }

void Settings::setMaxHops(const int val) { m_maxHops.store(val); }

ActiveTheme Settings::getTheme() const { return m_activeTheme.load(); }

void Settings::setTheme(ActiveTheme mode) { m_activeTheme.store(mode); }

LookupMode Settings::getLookupMode() const { return m_lookupMode.load(); }

void Settings::setLookupMode(LookupMode mode) { m_lookupMode.store(mode); }

// This function receives a path and begins to parse said json file, setting up
// all of the app's settings atomically and setting up mutexes for all string
// variables (logPath, interfaceToUse and pcapFilter)
std::shared_ptr<Settings> Settings::loadFromFile(const std::string& path) {
    auto s = std::make_shared<Settings>();
    std::ifstream in(path);
    if (in) {
        try {
            json j;
            in >> j;

            auto logPath = j.value("logPath", "log.log");
            {
                const std::lock_guard<std::mutex> lock(s->m_logPathMutex);
                s->m_logPath = logPath;
            }

            auto lookupMode = j.value("lookupMode", "AUTO");
            if (lookupMode == "DB_ONLY")
                s->m_lookupMode.store(LookupMode::DB_ONLY);
            else if (lookupMode == "API_ONLY")
                s->m_lookupMode.store(LookupMode::API_ONLY);
            else
                s->m_lookupMode.store(LookupMode::AUTO);

            auto activeTheme = j.value("activeTheme", "AUTO");
            if (activeTheme == "DARK")
                s->m_activeTheme.store(ActiveTheme::DARK);
            else if (activeTheme == "LIGHT")
                s->m_activeTheme.store(ActiveTheme::LIGHT);
            else
                s->m_activeTheme.store(ActiveTheme::AUTO);

            s->m_maxHops.store(j.value("maxHops", 15));

        } catch (...) {
            std::cerr << "Failed to parse settings JSON\n";
            LOGGER->logError("Failed to parse settings JSON: ", path);
        }
    }
    return s;
}

void Settings::saveToFile(const std::string& path) const {
    json j;
    j["logPath"] = getLogPath();

    switch (m_lookupMode.load()) {
        case LookupMode::DB_ONLY:
            j["lookupMode"] = "DB_ONLY";
            break;
        case LookupMode::API_ONLY:
            j["lookupMode"] = "API_ONLY";
            break;
        default:
            j["lookupMode"] = "AUTO";
            break;
    }

    switch (m_activeTheme.load()) {
        case ActiveTheme::DARK:
            j["activeTheme"] = "DARK";
            break;
        case ActiveTheme::LIGHT:
            j["activeTheme"] = "LIGHT";
            break;
        default:
            j["activeTheme"] = "AUTO";
            break;
    }

    j["maxHops"] = m_maxHops.load();

    std::ofstream out(path);
    if (out)
        out << j.dump(4);  // checks if the ofstream is valid and if it is,
                           // writes the settings json into destination path,
                           // pretty-printed with 4-space indentations
    else
        LOGGER->logError("Failed to open file for writing: ", path);  // otherwise logs an error to the user
}
