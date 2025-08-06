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

// function to compute the checksum needed for ICMP packets
unsigned short checksum(void *data, int len) {
    unsigned short *buf = (unsigned short *)data;
    unsigned int sum = 0;

    while (len > 1) {
        sum += *buf++;
        len -= 2;
    }

    if (len == 1)
        sum += *(unsigned char *)buf;

    sum = (sum >> 16) + (sum & 0xFFFF);
    sum += (sum >> 16);

    return ~sum;
}

std::vector<hopInfo> traceroute(const char *targetIP, int maxHops,
                                uint32_t timeoutMS) {
    std::vector<hopInfo> hops;
    hops.reserve(static_cast<size_t>(
        maxHops / 1.5));  // reserve some space for the hops vector to avoid
                          // many reallocations
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

    // create a raw socket to send the ICMP packets
    if ((sockfd = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP)) < 0) {
        LOGGER->logError("Error: Socket error", "");
        return {};
    }

    struct sockaddr_in recv_addr;
    socklen_t recv_addr_len = sizeof(recv_addr);
    char recv_buffer[512];  // ICMP reply buffer

    for (int ttl = 1; ttl <= maxHops; ttl++) {
        if (setsockopt(sockfd, IPPROTO_IP, IP_TTL, &ttl, sizeof(ttl)) < 0) {
            LOGGER->logError("Error: Setsockopt failed", "");
            close(sockfd);
            return {};
        }

        // populate the icmp echo request packet
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
                // calculate latency in milliseconds
                hop.latency = (end_time.tv_sec - start_time.tv_sec) * 1000.0 +
                              (end_time.tv_usec - start_time.tv_usec) / 1000.0;
                // if the reply came from the destination IP, stop the
                // traceroute early
                if (recv_addr.sin_addr.s_addr == dest_addr.sin_addr.s_addr) {
                    break;
                }
                hops.push_back(hop);
            }
        }
    }
    close(sockfd);  // close the socket before returning
    return hops;    // return collected hops
}
