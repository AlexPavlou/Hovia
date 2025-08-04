#include "traceroute.hpp"
#include "../logger.hpp"
#include <cstdint>
#include <cstring>
#include <sys/socket.h>
#include <vector>
#include <netinet/ip_icmp.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#include <sys/time.h>

unsigned short checksum(void *b, int len) {
    unsigned short *buf = (unsigned short *)b;
    unsigned int sum = 0;
    unsigned short result;
    for (sum = 0; len > 1; len -= 2) sum += *buf++;
    if (len == 1)
        sum += *(unsigned char *)buf;
    sum = (sum >> 16) + (sum & 0xFFFF);
    sum += (sum >> 16);
    result = ~sum;
    return result;
}

std::vector<hopInfo> traceroute(const char *targetIP, int maxHops,
                                uint32_t timeoutMS) {
    std::vector<hopInfo> hops;
    hops.reserve(static_cast<size_t>(maxHops / 1.5));
    int sockfd;
    struct sockaddr_in dest_addr;
    struct hostent *host;

    if ((host = gethostbyname(targetIP)) == NULL) {
        LOGGER->logError("Error: Unable to resolve hostname", "");
        return {};
    }

    memset(&dest_addr, 0, sizeof(dest_addr));
    dest_addr.sin_family = AF_INET;
    memcpy(&dest_addr.sin_addr, host->h_addr, host->h_length);

    if ((sockfd = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP)) < 0) {
        LOGGER->logError("Error: Socket error", "");
        return {};
    }

    struct sockaddr_in recv_addr;
    socklen_t recv_addr_len = sizeof(recv_addr);
    char recv_buffer[512];

    for (int ttl = 1; ttl <= maxHops; ttl++) {
        if (setsockopt(sockfd, IPPROTO_IP, IP_TTL, &ttl, sizeof(ttl)) < 0) {
            LOGGER->logError("Error: Setsockopt failed", "");
            close(sockfd);
            return {};
        }

        struct icmp icmp_packet;
        memset(&icmp_packet, 0, sizeof(icmp_packet));
        icmp_packet.icmp_type = ICMP_ECHO;
        icmp_packet.icmp_code = 0;
        icmp_packet.icmp_id = getpid();
        icmp_packet.icmp_seq = ttl;
        icmp_packet.icmp_cksum = checksum(&icmp_packet, sizeof(icmp_packet));

        struct timeval start_time, end_time;
        gettimeofday(&start_time, NULL);

        if (sendto(sockfd, &icmp_packet, sizeof(icmp_packet), 0,
                   (struct sockaddr *)&dest_addr, sizeof(dest_addr)) <= 0) {
            continue;
        }

        fd_set fds;
        FD_ZERO(&fds);
        FD_SET(sockfd, &fds);
        struct timeval timeout;
        timeout.tv_sec = timeoutMS / 1000;
        timeout.tv_usec = (timeoutMS % 1000) * 1000;

        hopInfo hop{};
        if (select(sockfd + 1, &fds, NULL, NULL, &timeout) > 0) {
            if (recvfrom(sockfd, recv_buffer, sizeof(recv_buffer), 0,
                         (struct sockaddr *)&recv_addr, &recv_addr_len) > 0) {
                gettimeofday(&end_time, NULL);

                inet_ntop(AF_INET, &recv_addr.sin_addr, hop.hopIP,
                          sizeof(hop.hopIP));
                hop.latency = (end_time.tv_sec - start_time.tv_sec) * 1000.0 +
                              (end_time.tv_usec - start_time.tv_usec) / 1000.0;
                if (recv_addr.sin_addr.s_addr == dest_addr.sin_addr.s_addr) {
                    break;
                }
                hops.push_back(hop);
            }
        }
    }
    close(sockfd);
    return hops;
}
