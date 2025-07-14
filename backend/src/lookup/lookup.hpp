#pragma once
#include "../utils/lookup_utils/common_structs.hpp"
#include <atomic>
#include <thread>
#include <pcap.h>
#include <vector>
#include <string>

class IpTracker;

class Lookup {
public:
    Lookup(IpTracker* ipTracker);
    std::vector<hopInfo> runTraceroute(const std::string& ip);
    destInfo lookUpAPI(const std::string& ip);
    traceResult processIp(const uint32_t& ip);
    void lookupLoop();
    void start(size_t numThreads = 2);
    void stop();
private:
    std::atomic<bool> running;
    IpTracker* ipTracker;
    std::vector<std::thread> lookupThreads;
};
