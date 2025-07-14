#include "capture.hpp"
#include "../IpTracker.hpp"
#include "../platform-dependent/utils.hpp"
#include "../utils/Logger.hpp"
#include <pcap/pcap.h>
#include <tins/tins.h>
#include <thread>
#include <unordered_set>

#include <iostream>

using namespace Tins;

Capture::Capture(IpTracker* ipTracker)
    : ipTracker(ipTracker) {}

// implement IpTracker methods
bool Capture::isKnown(const uint32_t& ip) {
    return (ipCache.find(ip) != ipCache.end());
}

inline void Capture::addIp(const uint32_t& ip) {
    ipCache.insert(ip);
}

void printIp(uint32_t ip) {
    // If ip is in host byte order, convert to network order:
    uint32_t net_ip = htonl(ip);

    in_addr addr;
    addr.s_addr = net_ip;

    char buf[INET_ADDRSTRLEN];
    if (inet_ntop(AF_INET, &addr, buf, sizeof(buf)) != nullptr) {
        //std::cout << buf << std::endl;
    } else {
        std::perror("inet_ntop");
    }
}

bool Capture::packet_handler(const PDU& pdu) {
    if (!pdu.find_pdu<IP>()) return true;

    uint32_t dst_ip_uint = pdu.rfind_pdu<IP>().dst_addr();

    if (!isKnown(dst_ip_uint)) {
        printIp(dst_ip_uint);
        addIp(dst_ip_uint);
        ipTracker->enqueueIp(dst_ip_uint);
        //std::cout<<"\n1.Added : " << dst_ip_uint << " to the queue";
    }
    return true;
}

void Capture::start() {
    std::string interfaceOption = ipTracker->settings->getInterfaceOption();
    std::string interface = (interfaceOption == "Auto")
        ? getDefaultInterface()
        : interfaceOption;

    try {
        Tins::SnifferConfiguration config;
        config.set_filter(ipTracker->settings->getFilter());             
        config.set_promisc_mode(true);     
        config.set_timeout(100);           
        config.set_immediate_mode(true);   

        sniffer = std::make_unique<Sniffer>(interface, config);

        captureThread = std::thread(&Capture::captureLoop, this);
    } catch (const std::exception& ex) {
        LOGGER->logError("Error starting capture: ", ex.what());
    }
}

void Capture::captureLoop() {
    try {
        sniffer->sniff_loop([this](const Tins::PDU& pdu) {
            return packet_handler(pdu);
        });
    } catch (const std::exception& ex) {
        LOGGER->logError("Error in sniff_loop: ", ex.what());
    }
}

void Capture::stop() {
    if (sniffer)
         sniffer->stop_sniff();
    if (captureThread.joinable())
        captureThread.join();

    sniffer.reset();
}
