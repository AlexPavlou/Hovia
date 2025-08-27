#pragma once

#include <nlohmann/json.hpp>
#include "utils/common_structs.hpp"

using json = nlohmann::json;

inline void to_json(json& j, const hopInfo& h) {
    j = json{{"hopIP", std::string(h.hopIP)}, {"latency", h.latency}};
}

inline void to_json(json& j, const destInfo& d) {
    j = json{{"ip", std::string(d.ip)},
             {"country", d.country},
             {"region", d.region},
             {"isp", d.isp},
             {"org", d.org},
             {"as", d.as},
             {"asname", d.asname},
             {"latitude", d.latitude},
             {"longitude", d.longitude},
             {"time_zone", d.time_zone}};
}

inline void to_json(json& j, const traceResult& t) {
    j = json{{"dest_info", t.dest_info}, {"hops", t.hops}};
}
