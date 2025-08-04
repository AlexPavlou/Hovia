#pragma once
#include <cstdint>
#include <string>
#include <mutex>
#include <atomic>
#include <nlohmann/json.hpp>

enum class LookupMode { AUTO, DB_ONLY, API_ONLY };
enum class ActiveTheme { AUTO, DARK, LIGHT };

struct Settings {
    private:
        std::atomic<uint8_t> m_timeout{1};

        std::string m_logPath = "log.log";
        mutable std::mutex m_logPathMutex;

        std::string m_interfaceOption = "wlan0";
        mutable std::mutex m_interfaceMutex;

        std::string m_pcapFilter =
            "(ip and (tcp or udp or icmp)) and not dst net 10.0.0.0/8 and not "
            "dst net 172.16.0.0/12 and not dst net 192.168.0.0/16 and not dst "
            "net 224.0.0.0/4 and not dst net 240.0.0.0/4";
        mutable std::mutex m_filterMutex;

        std::atomic<LookupMode> m_lookupMode = LookupMode::AUTO;
        std::atomic<ActiveTheme> m_activeTheme = ActiveTheme::AUTO;

        std::atomic<int> m_maxHops = 30;

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

        ActiveTheme getTheme() const;
        void setTheme(ActiveTheme mode);

        LookupMode getLookupMode() const;
        void setLookupMode(LookupMode mode);

        int getMaxHops() const;
        void setMaxHops(const int val);
};
