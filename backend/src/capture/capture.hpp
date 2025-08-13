#pragma once
#include <cstdint>
#include <thread>
#include <unordered_set>
#include <tins/tins.h>

class IpTracker;

class Capture {
    public:
        Capture(IpTracker* ipTracker);
        void startCapture();
        void stopCapture();

    private:
        std::thread m_captureThread;
        std::unique_ptr<Tins::Sniffer> m_pSniffer;
        IpTracker* m_ipTracker;
        inline bool isKnown(const uint32_t& ip);
        inline void addIp(const uint32_t& ip);
        void captureLoop();
        std::unordered_set<std::uint32_t> m_ipCache;
        bool packetHandler(const Tins::PDU& pdu);
};
