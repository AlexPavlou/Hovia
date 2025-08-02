#include "settings.hpp"
#include "Logger.hpp"
#include <fstream>
#include <memory>
#include <mutex>
#include <iostream>

using json = nlohmann::json;

uint8_t Settings::getTimeout() const {
    return timeout.load();
}
    
void Settings::setTimeout(uint8_t newTimeout) {
    timeout.store(newTimeout);
}

std::string Settings::getLogPath() const {
    std::lock_guard<std::mutex> lock(logPathMutex);
    return logPath;
}

std::string Settings::getInterfaceOption() const {
    std::lock_guard<std::mutex> lock(interfaceMutex);
    return interfaceToUse;
}

std::string Settings::getFilter() const {
    std::lock_guard<std::mutex> lock(filterMutex);
    return pcapFilter;
}

void Settings::setLogPath(const std::string& newLogPath) {
    std::lock_guard<std::mutex> lock(logPathMutex);
    logPath = newLogPath;
}

void Settings::setInterfaceOption(const std::string& interface) {
    std::lock_guard<std::mutex> lock(interfaceMutex);
    interfaceToUse = interface;
}

void Settings::setFilter(const std::string& newFilter) {
    std::lock_guard<std::mutex> lock(filterMutex);
    pcapFilter = newFilter;
}

int Settings::getMaxHops() const {
    return maxHops.load();
}

void Settings::setMaxHops(const int val) {
    maxHops.store(val);
}

ThemeMode Settings::getThemeMode() const {
    return themeMode.load();
}

void Settings::setLookupMode(LookupMode mode) {
    lookupMode.store(mode);
}

LookupMode Settings::getLookupMode() const {
    return lookupMode.load();
}

void Settings::setThemeMode(ThemeMode mode) {
    themeMode.store(mode);
}

std::shared_ptr<Settings> Settings::loadFromFile(const std::string& path) {
    auto s = std::make_shared<Settings>();
    std::ifstream in(path);
    if (in) {
        try {
            json j;
            in >> j;

            auto lp = j.value("logPath", "default.log");
            {
                std::lock_guard<std::mutex> lock(s->logPathMutex);
                s->logPath = lp;
            }

            auto lm = j.value("lookupMode", "AUTO");
            if (lm == "DB_ONLY") s->lookupMode.store(LookupMode::DB_ONLY);
            else if (lm == "API_ONLY") s->lookupMode.store(LookupMode::API_ONLY);
            else s->lookupMode.store(LookupMode::AUTO);

            auto tm = j.value("themeMode", "AUTO");
            if (tm == "DARK") s->themeMode.store(ThemeMode::DARK);
            else if (tm == "LIGHT") s->themeMode.store(ThemeMode::LIGHT);
            else s->themeMode.store(ThemeMode::AUTO);

            s->maxHops.store(j.value("maxHops", 30));

        } catch (...) {
            std::cerr << "Failed to parse settings JSON\n";
        }
    }
    return s;
}

void Settings::saveToFile(const std::string& path) const {
    json j;
    j["logPath"] = getLogPath();

    switch (lookupMode.load()) {
        case LookupMode::DB_ONLY: j["lookupMode"] = "DB_ONLY"; break;
        case LookupMode::API_ONLY: j["lookupMode"] = "API_ONLY"; break;
        default: j["lookupMode"] = "AUTO"; break;
    }

    switch (themeMode.load()) {
       case ThemeMode::DARK: j["themeMode"] = "DARK"; break;
        case ThemeMode::LIGHT: j["themeMode"] = "LIGHT"; break;
        default: j["themeMode"] = "AUTO"; break;
    }

    j["maxHops"] = maxHops.load();

    std::ofstream out(path);
    if (out) out << j.dump(4);
    else LOGGER->logError("Failed to open file for writing: ", path);
}
