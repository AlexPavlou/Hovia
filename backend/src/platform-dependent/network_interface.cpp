#include "utils.hpp"
#include <string>

#if defined(_WIN32) || defined(_WIN64)
#include <winsock2.h>
#include <iphlpapi.h>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

std::string getDefaultInterface() {
    // Initialize Winsock
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2,2), &wsaData) != 0)
        return "";

    // Get the best interface index for default route (0.0.0.0)
    DWORD ifIndex = 0;
    ULONG destAddr = INADDR_ANY; // 0.0.0.0
    if (GetBestInterface(destAddr, &ifIndex) != NO_ERROR) {
        WSACleanup();
        return "";
    }

    ULONG size = 0;
    if (GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, nullptr, &size) != ERROR_BUFFER_OVERFLOW) {
        WSACleanup();
        return "";
    }

    std::vector<BYTE> buffer(size);
    PIP_ADAPTER_ADDRESSES adapters = reinterpret_cast<PIP_ADAPTER_ADDRESSES>(buffer.data());

    if (GetAdaptersAddresses(AF_UNSPEC, 0, nullptr, adapters, &size) != NO_ERROR) {
        WSACleanup();
        return "";
    }

    for (PIP_ADAPTER_ADDRESSES adapter = adapters; adapter != nullptr; adapter = adapter->Next) {
        if (adapter->IfIndex == ifIndex) {
            WSACleanup();
            if (adapter->AdapterName)
                return std::string(adapter->AdapterName);
        }
    }

    WSACleanup();
    return "";
}

#elif defined(__linux__)

#include <ifaddrs.h>
#include <net/if.h>
#include <cstring>
#include <fstream>
#include <sstream>

std::string getDefaultInterface() {
    std::ifstream routeFile("/proc/net/route");
    if (!routeFile.is_open()) return "";

    std::string line;
    while (std::getline(routeFile, line)) {
        std::istringstream iss(line);
        std::string iface, destination;
        //unsigned long destAddr = 0;
        iss >> iface >> destination;
        // Destination "00000000" means default route
        if (destination == "00000000") {
            return iface;
        }
    }
    return "";
}

#elif defined(__APPLE__) || defined(__FreeBSD__)

#include <ifaddrs.h>
#include <net/if.h>
#include <sys/sysctl.h>
#include <net/route.h>
#include <netinet/in.h>
#include <cstring>

std::string getDefaultInterface() {
    int mib[6];
    size_t needed;
    char *buf, *lim, *next;
    struct rt_msghdr *rtm;
    struct sockaddr *sa, *rti_info[RTAX_MAX];
    std::string defaultIface;

    mib[0] = CTL_NET;
    mib[1] = PF_ROUTE;
    mib[2] = 0;
    mib[3] = AF_INET;
    mib[4] = NET_RT_FLAGS;
    mib[5] = RTF_UP | RTF_GATEWAY;

    if (sysctl(mib, 6, NULL, &needed, NULL, 0) < 0)
        return "";

    buf = (char*)malloc(needed);
    if (!buf)
        return "";

    if (sysctl(mib, 6, buf, &needed, NULL, 0) < 0) {
        free(buf);
        return "";
    }

    lim = buf + needed;
    for (next = buf; next < lim; next += rtm->rtm_msglen) {
        rtm = (struct rt_msghdr *)next;
        sa = (struct sockaddr *)(rtm + 1);
        for (int i = 0; i < RTAX_MAX; i++) {
            if (rtm->rtm_addrs & (1 << i)) {
                rti_info[i] = sa;
                sa = (struct sockaddr *)((char*)sa + ((sa->sa_len) ? sa->sa_len : sizeof(long)));
            } else
                rti_info[i] = NULL;
        }

        if (rti_info[RTAX_DST] && rti_info[RTAX_GATEWAY]) {
            struct sockaddr_in *dst = (struct sockaddr_in *)rti_info[RTAX_DST];
            if (dst->sin_addr.s_addr == 0) { // default route
                struct sockaddr_dl *sdl = (struct sockaddr_dl *)rti_info[RTAX_IFP];
                if (sdl) {
                    defaultIface = std::string(sdl->sdl_data, sdl->sdl_nlen);
                    break;
                }
            }
        } }
    free(buf);
    return defaultIface;
}

#else

std::string getDefaultInterface() {
    return "";
}

#endif
