#pragma once
#include <cstdint>
#include <thread>
#include <unordered_set>
#include <tins/tins.h>

class IpTracker;

class Capture {
public:
    Capture(IpTracker* ipTracker);
    void start();
    void stop();
private:
    std::thread captureThread;
    std::unique_ptr<Tins::Sniffer> sniffer;
    IpTracker* ipTracker;
    bool isKnown(const uint32_t& ip);
    void addIp(const uint32_t& ip);
    void captureLoop();
    std::unordered_set<std::uint32_t> ipCache;
    bool packet_handler(const Tins::PDU& pdu);
};
