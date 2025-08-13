#pragma once
#include <cstdint>
#include <string>
#include <mutex>
#include <atomic>
#include <nlohmann/json.hpp>
#include <cstdint>

enum class LookupMode { AUTO, DB, API };
enum class ActiveLanguage { ENGLISH, SPANISH, GREEK };
enum class ActiveTheme { AUTO, DARK, LIGHT };

struct Settings {
    private:
        std::atomic<uint16_t> m_WebsocketPort{9002};
        std::atomic<uint8_t> m_timeout{1};

        std::atomic<bool> m_hasAnimation{false};

        std::atomic<bool> m_hasVerbose{false};

        std::string m_logPath = "app.log";
        mutable std::mutex m_logPathMutex;

        std::string m_interfaceOption = "Auto";
        mutable std::mutex m_interfaceMutex;

        std::string m_ipFilter =
            "(ip and (tcp or udp or icmp)) and not dst net 10.0.0.0/8 and not "
            "dst net 172.16.0.0/12 and not dst net 192.168.0.0/16 and not dst "
            "net 224.0.0.0/4 and not dst net 240.0.0.0/4";
        mutable std::mutex m_ipFilterMutex;

        std::atomic<LookupMode> m_lookupMode = LookupMode::AUTO;
        std::atomic<ActiveLanguage> m_activeLanguage = ActiveLanguage::ENGLISH;
        std::atomic<ActiveTheme> m_activeTheme = ActiveTheme::AUTO;

        std::atomic<int> m_maxHops = 15;

    public:
        static std::shared_ptr<Settings> loadFromFile();
        void saveToFile();

        uint16_t getWebsocket() const;
        void setWebsocket(uint16_t newWebsocket);

        uint8_t getTimeout() const;
        void setTimeout(uint8_t newTimeout);

        bool hasAnimation() const;
        void setAnimation(bool newAnimationToggle);

        bool hasVerbose() const;
        void setVerbose(bool newVerboseLogging);

        std::string getLogPath() const;
        void setLogPath(const std::string& logPath);

        std::string getInterfaceOption() const;
        void setInterfaceOption(const std::string& interface);

        std::string getFilter() const;
        void setFilter(const std::string& newFilter);

        LookupMode getLookupMode() const;
        void setLookupMode(LookupMode mode);

        ActiveLanguage getLanguage() const;
        void setLanguage(ActiveLanguage language);

        ActiveTheme getTheme() const;
        void setTheme(ActiveTheme mode);

        int getMaxHops() const;
        void setMaxHops(const int val);
};
