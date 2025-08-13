#include <cstdint>
#include <vector>
#include "utils/common_structs.hpp"

// ICMP checksum function
unsigned short checksum(void* data, int len);

std::vector<hopInfo> traceroute(const std::string targetIP, int maxHops,
                                uint32_t timeoutMS);
