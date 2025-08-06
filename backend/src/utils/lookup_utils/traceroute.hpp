#include <cstdint>
#include <vector>
#include "common_structs.hpp"

// ICMP checksum function
unsigned short checksum(void* data, int len);

std::vector<hopInfo> traceroute(const char* targetIP, int maxHops,
                                uint32_t timeoutMS);
