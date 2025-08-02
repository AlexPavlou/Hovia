#pragma once
#include <cstdint>
#include <string>
#include <mutex>
#include <atomic>
#include <nlohmann/json.hpp>

enum class LookupMode { AUTO, DB_ONLY, API_ONLY };
enum class ThemeMode { AUTO, DARK, LIGHT };

struct Settings {
private:
    std::atomic<uint8_t> timeout{1};

    std::string logPath = "log.log";
    mutable std::mutex logPathMutex;

    std::string interfaceToUse = "wlan0";
    mutable std::mutex interfaceMutex;

    //std::string pcapFilter = "((tcp or udp or icmp) and ip) and not (src net 10.0.0.0/8 or dst net 10.0.0.0/8 or src net 172.16.0.0/12 or dst net 172.16.0.0/12 or src net 192.168.0.0/16 or dst net 192.168.0.0/16)";
    std::string pcapFilter = "(ip and (tcp or udp or icmp)) and not dst net 10.0.0.0/8 and not dst net 172.16.0.0/12 and not dst net 192.168.0.0/16 and not dst net 224.0.0.0/4 and not dst net 240.0.0.0/4";
    mutable std::mutex filterMutex;

    std::atomic<LookupMode> lookupMode = LookupMode::AUTO;
    std::atomic<ThemeMode> themeMode = ThemeMode::AUTO;

    std::atomic<int> maxHops = 30;

public:
    static std::shared_ptr<Settings> loadFromFile(const std::string& path);
    void saveToFile(const std::string& path) const;

    uint8_t getTimeout() const;
    void setTimeout(uint8_t newTimeout);

    std::string getLogPath() const;
    void setLogPath(const std::string& logPath);

    std::string getInterfaceOption() const;
    void setInterfaceOption(const std::string& interface);
    
    std::string getFilter() const;
    void setFilter(const std::string& newFilter);

    ThemeMode getThemeMode() const;
    void setThemeMode(ThemeMode mode);
    
    void setLookupMode(LookupMode mode);
    LookupMode getLookupMode() const;

    int getMaxHops() const;
    void setMaxHops(const int val);
};
