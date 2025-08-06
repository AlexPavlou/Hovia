#include "capture.hpp"
#include "ipTracker/ipTracker.hpp"
#include "platform-dependent/network_interface.hpp"
#include "utils/logger.hpp"
#include <pcap/pcap.h>
#include <tins/tins.h>
#include <thread>
#include <unordered_set>

using namespace Tins;

Capture::Capture(IpTracker* ipTracker) : m_ipTracker(ipTracker) {}

// check if a given ipv4 address is contained in the ipCache unordered_set
bool Capture::isKnown(const uint32_t& ip) {
    return (m_ipCache.find(ip) != m_ipCache.end());
}

inline void Capture::addIp(const uint32_t& ip) { m_ipCache.insert(ip); }

void printIp(uint32_t ip) {
    // If ip is in host byte order, convert to network order:
    uint32_t net_ip = htonl(ip);

    in_addr addr;
    addr.s_addr = net_ip;

    char buf[INET_ADDRSTRLEN];
    if (inet_ntop(AF_INET, &addr, buf, sizeof(buf)) != nullptr) {
        // std::cout << buf << std::endl;
    } else {
        std::perror("inet_ntop");
    }
}

bool Capture::packetHandler(const PDU& pdu) {
    if (!pdu.find_pdu<IP>())
        return true;

    uint32_t dst_ip_uint = pdu.rfind_pdu<IP>().dst_addr();

    if (!isKnown(dst_ip_uint)) {
        printIp(dst_ip_uint);
        addIp(dst_ip_uint);
        m_ipTracker->enqueueIp(dst_ip_uint);
        // std::cout<<"\n1.Added : " << dst_ip_uint << " to the queue";
    }
    return true;
}

void Capture::startCapture() {
    std::string interfaceOption = m_ipTracker->pSettings->getInterfaceOption();
    // use the correct network interface depending on settings' saved option
    std::string interface =
        (interfaceOption == "Auto") ? getDefaultInterface() : interfaceOption;

    try {
        Tins::SnifferConfiguration config;
        config.set_filter(m_ipTracker->pSettings->getFilter());
        config.set_promisc_mode(true);
        config.set_timeout(100);
        config.set_immediate_mode(true);

        m_pSniffer = std::make_unique<Sniffer>(interface, config);

        m_captureThread = std::thread(&Capture::captureLoop, this);
    } catch (const std::exception& ex) {
        LOGGER->logError("Error starting capture: ", ex.what());
    }
}

void Capture::stopCapture() {
    if (m_pSniffer)
        // notify the sniffer object to stop sniffing
        m_pSniffer->stop_sniff();
    if (m_captureThread.joinable())
        m_captureThread.join();

    m_pSniffer.reset();
}

void Capture::captureLoop() {
    try {
        m_pSniffer->sniff_loop(
            [this](const Tins::PDU& pdu) { return packetHandler(pdu); });
    } catch (const std::exception& ex) {
        LOGGER->logError("Error in sniff_loop: ", ex.what());
    }
}
