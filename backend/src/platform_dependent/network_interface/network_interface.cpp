#include "network_interface.hpp"
#include "utils/logger/logger.hpp"

#if defined(_WIN32) || defined(_WIN64)

#include <winsock2.h>
#include <iphlpapi.h>
#include <vector>
#include <windows.h>  // For WideCharToMultiByte

#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

static std::string WideCharToString(PWSTR wstr) {
    if (!wstr)
        return {};
    int size =
        WideCharToMultiByte(CP_UTF8, 0, wstr, -1, nullptr, 0, nullptr, nullptr);
    if (size <= 0)
        return {};
    std::string result(size, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr, -1, &result[0], size, nullptr,
                        nullptr);
    result.resize(size - 1);  // Remove trailing null
    return result;
}

std::string getDefaultInterface() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "WSAStartup failed");
        return "";
    }

    DWORD interfaceIndex = 0;
    if (GetBestInterface(INADDR_ANY, &interfaceIndex) != NO_ERROR) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "GetBestInterface failed");
        WSACleanup();
        return "";
    }

    ULONG size = 0;
    if (GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, nullptr, &size) !=
        ERROR_BUFFER_OVERFLOW) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "GetAdaptersAddresses size query failed");
        WSACleanup();
        return "";
    }

    std::vector<BYTE> buffer(size);
    PIP_ADAPTER_ADDRESSES adapters =
        reinterpret_cast<PIP_ADAPTER_ADDRESSES>(buffer.data());

    if (GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, adapters, &size) !=
        NO_ERROR) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "GetAdaptersAddresses data query failed");
        WSACleanup();
        return "";
    }

    for (PIP_ADAPTER_ADDRESSES adapter = adapters; adapter != nullptr;
         adapter = adapter->Next) {
        if (adapter->IfIndex == interfaceIndex) {
            WSACleanup();
            return WideCharToString(adapter->FriendlyName);
        }
    }

    Logger::getInstance().log(LogLevel::ERROR, __func__,
                              "No adapter matched default interface index");
    WSACleanup();
    return "";
}

#elif defined(__linux__)

#include <fstream>
#include <sstream>
#include <string>

std::string getDefaultInterface() {
    std::ifstream routeFile("/proc/net/route");
    if (!routeFile.is_open()) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Failed to open /proc/net/route");
        return "";
    }

    std::string line;
    if (!std::getline(routeFile, line))  // Skip header
        return "";

    while (std::getline(routeFile, line)) {
        std::istringstream iss(line);
        std::string iface, destination;
        iss >> iface >> destination;
        if (destination == "00000000")
            return iface;
    }

    Logger::getInstance().log(LogLevel::ERROR, __func__,
                              "Default interface not found in /proc/net/route");
    return "";
}

#elif defined(__APPLE__) || defined(__FreeBSD__)

#include <sys/sysctl.h>
#include <net/route.h>
#include <net/if_dl.h>
#include <netinet/in.h>
#include <string>
#include <cstdlib>

std::string getDefaultInterface() {
    int mib[6] = {CTL_NET, PF_ROUTE,     0,
                  AF_INET, NET_RT_FLAGS, RTF_UP | RTF_GATEWAY};
    size_t needed = 0;

    if (sysctl(mib, 6, nullptr, &needed, nullptr, 0) < 0) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "sysctl size query failed");
        return "";
    }

    char* buf = static_cast<char*>(malloc(needed));
    if (!buf) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Memory allocation failed");
        return "";
    }

    if (sysctl(mib, 6, buf, &needed, nullptr, 0) < 0) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "sysctl data query failed");
        free(buf);
        return "";
    }

    char* lim = buf + needed;
    std::string defaultIface;

    for (char* next = buf; next < lim;
         next += reinterpret_cast<struct rt_msghdr*>(next)->rtm_msglen) {
        struct rt_msghdr* rtm = reinterpret_cast<struct rt_msghdr*>(next);
        struct sockaddr* sa = reinterpret_cast<struct sockaddr*>(rtm + 1);
        struct sockaddr* rti_info[RTAX_MAX] = {nullptr};

        for (int i = 0; i < RTAX_MAX; i++) {
            if (rtm->rtm_addrs & (1 << i)) {
                rti_info[i] = sa;
                sa = reinterpret_cast<struct sockaddr*>(
                    reinterpret_cast<char*>(sa) +
                    (sa->sa_len ? sa->sa_len : sizeof(long)));
            }
        }

        if (rti_info[RTAX_DST] && rti_info[RTAX_GATEWAY]) {
            struct sockaddr_in* dst =
                reinterpret_cast<struct sockaddr_in*>(rti_info[RTAX_DST]);
            if (dst->sin_addr.s_addr == 0) {
                struct sockaddr_dl* sdl =
                    reinterpret_cast<struct sockaddr_dl*>(rti_info[RTAX_IFP]);
                if (sdl && sdl->sdl_nlen > 0) {
                    defaultIface.assign(sdl->sdl_data, sdl->sdl_nlen);
                    break;
                }
            }
        }
    }

    free(buf);

    if (defaultIface.empty()) {
        Logger::getInstance().log(LogLevel::ERROR, __func__,
                                  "Default interface not found via sysctl");
        return "";
    }

    return defaultIface;
}

#else

std::string getDefaultInterface() {
    Logger::getInstance().log(LogLevel::ERROR, __func__,
                              "Unsupported platform");
    return "";
}

#endif
