#include "settings.hpp"
#include "utils/logger/logger.hpp"
#include <filesystem>
#include <cstdlib>
#include <string>
#include <stdexcept>
#include <unistd.h>  // geteuid()
#include <pwd.h>     // getpwnam(), getpwuid()
#include <iostream>  // optional for fallback logging

// Helper: get home directory of a username
std::string homeDirFromUser(const char* username) {
    if (!username)
        return "";
    struct passwd* pw = getpwnam(username);
    if (pw && pw->pw_dir) {
        return std::string(pw->pw_dir);
    }
    return "";
}

// Helper: get home directory of given uid
std::string homeDirFromUid(uid_t uid) {
    struct passwd* pw = getpwuid(uid);
    if (pw && pw->pw_dir) {
        return std::string(pw->pw_dir);
    }
    return "";
}

// Main function to get the real user's home directory when running as root or
// normally
std::string getRealUserHomeDir() {
    if (geteuid() == 0) {
        // Running as root, try environment variables for original user name
        const char* user = nullptr;

        user = std::getenv("SUDO_USER");  // sudo sets this
        if (!user)
            user = std::getenv("DOAS_USER");  // doas sets this
        if (!user)
            user = std::getenv("USER");  // fallback, might be root

        std::string homeDir = homeDirFromUser(user);
        if (!homeDir.empty()) {
            return homeDir;
        }

        // Fallback: look for uid 1000 (usually first normal user on Linux)
        homeDir = homeDirFromUid(1000);
        if (!homeDir.empty()) {
            return homeDir;
        }

        // Fallback to root home directory
        homeDir = homeDirFromUid(0);
        if (!homeDir.empty()) {
            return homeDir;
        }

        // Last resort
        return "/";
    } else {
        // Not running as root: normal user
        const char* homeEnv = std::getenv("HOME");
        if (homeEnv && homeEnv[0] != '\0') {
            return std::string(homeEnv);
        }
        // Fallback to passwd db
        std::string homeDir = homeDirFromUid(geteuid());
        if (!homeDir.empty()) {
            return homeDir;
        }
        // Fallback last resort
        return "/";
    }
}

std::string getConfigPath() {
    std::string configDir;
#if defined(_WIN32)
    const char* basePath = std::getenv("APPDATA");
    if (basePath) {
        configDir = std::filesystem::path(basePath) / "hovia";
    } else {
        Logger::getInstance().log(
            LogLevel::ERROR, __func__,
            "APPDATA env var not set, falling back to TEMP");
        const char* tempPath = std::getenv("TEMP");
        if (tempPath) {
            configDir = std::filesystem::path(tempPath) / "hovia";
        } else {
            Logger::getInstance().log(
                LogLevel::ERROR, __func__,
                "Neither APPDATA nor TEMP environment variables are set");
            // fallback in worst case to current dir
            configDir = "hovia";
        }
    }
#elif defined(__APPLE__)
    std::string home = getRealUserHomeDir();
    if (!home.empty()) {
        configDir = std::filesystem::path(home) / "Library" /
                    "Application Support" / "hovia";
    } else {
        Logger::getInstance().log(
            LogLevel::ERROR, __func__,
            "Could not determine home directory, falling back to /tmp");
        configDir = "/tmp/hovia/";
    }
#else
    std::string home = getRealUserHomeDir();
    if (!home.empty()) {
        configDir = std::filesystem::path(home) / ".config" / "hovia";
    } else {
        Logger::getInstance().log(
            LogLevel::ERROR, __func__,
            "Could not determine home directory, falling back to /tmp");
        configDir = "/tmp/hovia/";
    }
#endif
    return configDir;
}

void createConfigDir(const std::string& configDir) {
    std::error_code ec;
    std::filesystem::create_directories(configDir, ec);
    if (ec) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Failed to create config directory '" +
                                      configDir + "': " + ec.message());
        throw std::runtime_error("Failed to create config directory '" +
                                 configDir + "': " + ec.message());
    }
}
