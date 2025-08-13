#pragma once
#include "utils/common_structs.hpp"
#include <atomic>
#include <thread>
#include <pcap.h>
#include <vector>
#include <string>

class IpTracker;

class Lookup {
    public:
        Lookup(IpTracker* ipTracker);
        destInfo lookupAPI(const std::string& ip);
        traceResult processIp(const uint32_t& ip);
        void lookupLoop();
        void startLookup(size_t numThreads = 2);
        void stopLookup();

    private:
        std::atomic<bool> m_running;
        IpTracker* m_ipTracker;
        std::vector<std::thread> m_lookupThreads;
};
