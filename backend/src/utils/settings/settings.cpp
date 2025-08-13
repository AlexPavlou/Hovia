#include "settings.hpp"
#include "utils/logger/logger.hpp"
#include "utils/settings/settings_utils/settings.hpp"
#include <fstream>
#include <memory>
#include <mutex>
#include <iostream>
#include <filesystem>
#include <exception>

constexpr char SETTINGS_FILE[] = "config.json";

using json = nlohmann::json;

uint16_t Settings::getWebsocket() const { return m_WebsocketPort.load(); }

void Settings::setWebsocket(uint16_t newWebsocket) {
    m_WebsocketPort.store(newWebsocket);
}

uint8_t Settings::getTimeout() const { return m_timeout.load(); }

void Settings::setTimeout(uint8_t newTimeout) { m_timeout.store(newTimeout); }

bool Settings::hasAnimation() const { return m_hasAnimation.load(); }

void Settings::setAnimation(bool newAnimationToggle) {
    m_hasAnimation.store(newAnimationToggle);
}

bool Settings::hasVerbose() const { return m_hasVerbose.load(); }

void Settings::setVerbose(bool newVerboseLogging) {
    m_hasVerbose.store(newVerboseLogging);
}

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

LookupMode Settings::getLookupMode() const { return m_lookupMode.load(); }

void Settings::setLookupMode(LookupMode mode) { m_lookupMode.store(mode); }

ActiveLanguage Settings::getLanguage() const { return m_activeLanguage.load(); }

void Settings::setLanguage(ActiveLanguage language) {
    m_activeLanguage.store(language);
};

ActiveTheme Settings::getTheme() const { return m_activeTheme.load(); }

void Settings::setTheme(ActiveTheme mode) { m_activeTheme.store(mode); }

// This function receives a path and begins to parse said json file, setting up
// all of the app's settings atomically and setting up mutexes for all string
// variables (logPath, interfaceToUse and pcapFilter)
std::shared_ptr<Settings> Settings::loadFromFile() {
    auto s = std::make_shared<Settings>();

    std::filesystem::path configDir = getConfigPath();
    std::filesystem::path configFilePath = configDir / SETTINGS_FILE;

    try {
        createConfigDir(configDir.string());
    } catch (const std::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Failed to create config directory: '" +
                                      configDir.string() + "': " + e.what());
        throw;
    }

    std::cout << "Attempting to read from " << configFilePath.string() << '\n';
    std::ifstream in(configFilePath);
    if (in) {
        std::cout << "WE ARE IN!!\n";
        try {
            json j;
            in >> j;

            // Strings with mutex locks
            {
                std::lock_guard<std::mutex> lock(s->m_logPathMutex);
                s->m_logPath = j.value("logPath", "app.log");
            }
            {
                std::lock_guard<std::mutex> lock(s->m_interfaceMutex);
                s->m_interfaceOption = j.value("interfaceOption", "Auto");
            }
            {
                std::lock_guard<std::mutex> lock(s->m_ipFilterMutex);
                s->m_ipFilter =
                    j.value("filter",
                            "(ip and (tcp or udp or icmp)) and not dst net "
                            "10.0.0.0/8 and not dst net 172.16.0.0/12 and not "
                            "dst net 192.168.0.0/16 and not dst net "
                            "224.0.0.0/4 and not dst net 240.0.0.0/4");
            }

            // Enum LookupMode
            std::string lookupModeStr = j.value("lookupMode", "AUTO");
            if (lookupModeStr == "DB")
                s->m_lookupMode.store(LookupMode::DB);
            else if (lookupModeStr == "API" || lookupModeStr == "API_ONLY")
                s->m_lookupMode.store(LookupMode::API);
            else
                s->m_lookupMode.store(LookupMode::AUTO);

            // Enum ActiveTheme
            std::string themeStr = j.value("activeTheme", "AUTO");
            if (themeStr == "DARK")
                s->m_activeTheme.store(ActiveTheme::DARK);
            else if (themeStr == "LIGHT")
                s->m_activeTheme.store(ActiveTheme::LIGHT);
            else
                s->m_activeTheme.store(ActiveTheme::AUTO);

            // Enum ActiveLanguage
            std::string langStr = j.value("activeLanguage", "ENGLISH");
            if (langStr == "ENGLISH")
                s->m_activeLanguage.store(ActiveLanguage::ENGLISH);
            else if (langStr == "SPANISH")
                s->m_activeLanguage.store(ActiveLanguage::SPANISH);
            else if (langStr == "GREEK")
                s->m_activeLanguage.store(ActiveLanguage::GREEK);
            else
                s->m_activeLanguage.store(ActiveLanguage::ENGLISH);

            // Integral and boolean values
            s->m_maxHops.store(j.value("maxHops", 15));
            s->m_timeout.store(j.value("timeout", 1));

            s->m_hasAnimation.store(j.value("hasAnimation", false));
            s->m_hasVerbose.store(j.value("hasVerbose", false));

            s->m_WebsocketPort.store(j.value("WebsocketPort", 9002));

        } catch (const std::exception& e) {
            Logger::getInstance().log(LogLevel::ERROR, __func__,
                                      "Failed to parse settings JSON: '" +
                                          configFilePath.string() +
                                          "': " + e.what());
        }
    }

    return s;
}

void Settings::saveToFile() {
    std::filesystem::path configDir = getConfigPath();
    std::filesystem::path configFilePath = configDir / SETTINGS_FILE;

    try {
        createConfigDir(configDir.string());
    } catch (const std::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Failed to create config directory: '" +
                                      configDir.string() + "': " + e.what());
        throw;
    }

    json j;

    // Strings with locks
    {
        std::lock_guard<std::mutex> lock(m_logPathMutex);
        j["logPath"] = m_logPath;
    }
    {
        std::lock_guard<std::mutex> lock(m_interfaceMutex);
        j["interfaceOption"] = m_interfaceOption;
    }
    {
        std::lock_guard<std::mutex> lock(m_ipFilterMutex);
        j["filter"] = m_ipFilter;
    }

    // Enums
    switch (m_lookupMode.load()) {
        case LookupMode::DB:
            j["lookupMode"] = "DB";
            break;
        case LookupMode::API:
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

    switch (m_activeLanguage.load()) {
        case ActiveLanguage::ENGLISH:
            j["activeLanguage"] = "ENGLISH";
            break;
        case ActiveLanguage::SPANISH:
            j["activeLanguage"] = "SPANISH";
            break;
        case ActiveLanguage::GREEK:
            j["activeLanguage"] = "GREEK";
            break;
        default:
            j["activeLanguage"] = "ENGLISH";
            break;
    }

    // Integral and boolean values
    j["maxHops"] = m_maxHops.load();
    j["timeout"] = m_timeout.load();
    j["hasAnimation"] = m_hasAnimation.load();
    j["hasVerbose"] = m_hasVerbose.load();

    j["WebsocketPort"] = m_WebsocketPort.load();

    std::ofstream out(configFilePath);
    if (!out) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Failed to open config file for writing: '" +
                                      configFilePath.string() + "'");
        throw std::runtime_error("Failed to open config file for writing: " +
                                 configFilePath.string());
    }

    out << j.dump(4);  // pretty print with 4-space indent

    if (out.fail()) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Failed to write config file completely: '" +
                                      configFilePath.string() + "'");
        throw std::runtime_error("Failed to fully write config file: " +
                                 configFilePath.string());
    }
}
