// common.hpp
#pragma once
#include <string>
#include <vector>

struct hopInfo {
    char hopIP[16];
    double latency;
};

struct destInfo {
    char ip[16];
    std::string country, region, isp, org, as, asname;
    double latitude = 0.0;
    double longitude = 0.0;
    std::string time_zone;
};

struct traceResult {
    destInfo dest_info;
    std::vector<hopInfo> hops;
};
