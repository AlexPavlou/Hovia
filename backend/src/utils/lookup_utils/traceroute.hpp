#include <cstdint>
#include <vector>
#include "common_structs.hpp"

unsigned short checksum(void *b, int len);

std::vector<hopInfo> traceroute(const char *targetIP, int maxHops,
                                uint32_t timeoutMS);
