#include <cstdint>
#include <vector>
#include "common_structs.hpp"

unsigned short checksum(void *b, int len);

std::vector<hopInfo> traceroute(const char *targetIP, int MAX_HOPS, uint32_t TIMEOUT_MS);
