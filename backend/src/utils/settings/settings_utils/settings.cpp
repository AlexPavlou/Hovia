#include "settings.hpp"
#include "utils/logger/logger.hpp"
#include <filesystem>
#include <cstdlib>
#include <string>
#include <stdexcept>

std::string getConfigPath() {
    std::string configDir;
#if defined(_WIN32)
    const char* basePath = std::getenv("APPDATA");
    if (basePath) {
        configDir = std::filesystem::path(basePath) / "hovia";
    } else {
        LOGGER->logError("createConfigFile()",
                         "APPDATA env var not set, falling back to TEMP");
        const char* tempPath = std::getenv("TEMP");
        if (tempPath) {
            configDir = std::filesystem::path(tempPath) / "hovia";
        } else {
            LOGGER->logError(
                "createConfigFile()",
                "Neither APPDATA nor TEMP environment variables are set");
            throw std::runtime_error(
                "Neither APPDATA nor TEMP environment variables are set");
        }
    }
#elif defined(__APPLE__)
    const char* home = std::getenv("HOME");
    if (home) {
        configDir = std::filesystem::path(home) / "Library" /
                    "Application Support" / "hovia";
    } else {
        LOGGER->logError("createConfigFile()",
                         "HOME env var not set, falling back to /tmp");
        configDir = "/tmp/hovia/";
    }
#else
    const char* home = std::getenv("HOME");
    if (home) {
        configDir = std::filesystem::path(home) / ".config" / "hovia";
    } else {
        LOGGER->logData(
            "createConfigFile(): HOME env var not set, falling back to /tmp");
        configDir = "/tmp/hovia/";
    }
#endif
    return configDir;
}

void createConfigDir(const std::string& configDir) {
    std::error_code ec;
    std::filesystem::create_directories(configDir, ec);
    if (ec) {
        LOGGER->logError("createConfigDir()",
                         "Failed to create config directory '" + configDir +
                             "': " + ec.message());
        throw std::runtime_error("Failed to create config directory '" +
                                 configDir + "': " + ec.message());
    }
}
