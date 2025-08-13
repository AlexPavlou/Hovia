#include "capture.hpp"
#include "ipTracker/ipTracker.hpp"
#include "platform_dependent/network_interface/network_interface.hpp"
#include "utils/logger/logger.hpp"
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

void Capture::addIp(const uint32_t& ip) { m_ipCache.insert(ip); }

std::string decodeIP(uint32_t ip) {
    // If ip is in host byte order, convert to network order:
    uint32_t net_ip = htonl(ip);

    in_addr addr;
    addr.s_addr = net_ip;

    char buf[INET_ADDRSTRLEN];
    if (inet_ntop(AF_INET, &addr, buf, sizeof(buf)) != nullptr) {
        return buf;
    } else {
        std::perror("inet_ntop");
        return "error occured";
    }
}

bool Capture::packetHandler(const PDU& pdu) {
    if (!pdu.find_pdu<IP>())
        return true;

    uint32_t dst_ip_uint = pdu.rfind_pdu<IP>().dst_addr();

    if (!isKnown(dst_ip_uint)) {
        addIp(dst_ip_uint);
        m_ipTracker->enqueueIp(dst_ip_uint);
        if (m_ipTracker->pSettings->hasVerbose()) {
            std::string decodedIP = decodeIP(dst_ip_uint);
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Added '" + decodedIP +
                                          "' IP to the cache");
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Pushed '" + decodedIP +
                                          "' to the IP Queue");
        }
    }
    return true;
}

void Capture::startCapture() {
    std::string interfaceOption = m_ipTracker->pSettings->getInterfaceOption();
    // use the correct network interface depending on settings' saved option
    std::string interface =
        (interfaceOption == "AUTO") ? getDefaultInterface() : interfaceOption;

    if (interface.empty())
        return;

    try {
        Tins::SnifferConfiguration config;
        config.set_filter(m_ipTracker->pSettings->getFilter());
        config.set_promisc_mode(true);
        config.set_timeout(100);
        config.set_immediate_mode(true);

        m_pSniffer = std::make_unique<Sniffer>(interface, config);

        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Created sniffer object for the '" +
                                          interface + "' interface");

        m_captureThread = std::thread(&Capture::captureLoop, this);
    } catch (const std::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Error starting capture: " +
                                      std::string(e.what()));
    }
}

void Capture::stopCapture() {
    if (m_pSniffer) {
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Stopping sniffer object");
        // notify the sniffer object to stop sniffing
        m_pSniffer->stop_sniff();
    }
    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Attempting to join the capture thread");
    if (m_captureThread.joinable())
        m_captureThread.join();

    m_pSniffer.reset();
}

void Capture::captureLoop() {
    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Thread is initialising the captureLoop");
    try {
        m_pSniffer->sniff_loop(
            [this](const Tins::PDU& pdu) { return packetHandler(pdu); });
    } catch (const std::exception& e) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Error in sniff_loop: " +
                                      std::string(e.what()));
    }
}
