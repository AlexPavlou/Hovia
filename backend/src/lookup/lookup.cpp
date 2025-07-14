#include "lookup.hpp"
#include "../IpTracker.hpp"
#include "../utils/lookup_utils/traceroute.hpp"
//#include "../utils/Logger.hpp"
#include <cstdint>
//#include <filesystem>
#include <thread>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

#include <iostream>

Lookup::Lookup(IpTracker* ipTracker) 
    : running(false), ipTracker(ipTracker) {}

size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    auto* response = static_cast<std::string*>(userp);
    response->append(static_cast<char*>(contents), size * nmemb);
    return size * nmemb;
}

destInfo Lookup::lookUpAPI(const std::string& ip) {
    std::cout<<ip;
    destInfo info{};
    std::string url = "http://ip-api.com/json/" + ip +
                      "?fields=status,country,regionName,isp,org,as,asname,lat,lon,timezone";

    CURL* curl = curl_easy_init();
    if (!curl)
        return info;

    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.85.0");

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK)
        return info;

    auto json = nlohmann::json::parse(response, nullptr, false);
    if (!json.is_object() || json["status"] != "success")
        return info;

    strncpy(info.ip, ip.c_str(), sizeof(info.ip));
    info.ip[sizeof(info.ip) - 1] = '\0';
    info.country   = json["country"];
    info.region    = json["regionName"];
    info.isp       = json["isp"];
    info.org       = json["org"];
    info.as        = json["as"];
    info.asname    = json["asname"];
    info.latitude  = json["lat"];
    info.longitude = json["lon"];
    info.time_zone = json["timezone"];

    return info;
}

traceResult Lookup::processIp(const uint32_t& ip) {
    traceResult result;
    in_addr addr{};
    addr.s_addr = htonl(ip);
    char ipStr[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &addr, ipStr, sizeof(ipStr));
    result.hops = traceroute(ipStr, 15, 500);//ipTracker->settings->getMaxHops(), ipTracker->settings->getTimeout());
    result.dest_info = lookUpAPI(ipStr);

    /*if (ipTracker->settings->lookupMode.load() == LookupMode::AUTO) {
        if (!std::filesystem::exists("db.db")) {
            result.dest_info = lookUpAPI(ipStr);
        }
    } else if (ipTracker->settings->lookupMode.load() == LookupMode::API_ONLY) {
        result.dest_info = lookUpAPI(ipStr);
    } else {
        if (!std::filesystem::exists("db.db")) {
            LOGGER->logError("DB was not found. Process is exited.", "");
            return {};
        }
        //result.dest_info = lookUpDB(ipStr);
    }*/

    return result;
}

void Lookup::lookupLoop() {
    uint32_t ip;
    traceResult newResult;
    while (running.load()) {
        if (!ipTracker->dequeueIp(ip)) break;
        //std::cout<<"\n2.Popped : " << ip << " from the queue";
        newResult = processIp(ip);
        //std::cout<<"Enqueued result for ip: " << ip;
        ipTracker->enqueueResult(newResult);
        //std::cout<<"\n3.Added : " << ip << " to UI queue";
    }
}

void Lookup::start(size_t numThreads) {
    if (running.exchange(true)) return;   // already running?
    lookupThreads.clear();
    for (size_t i = 0; i < numThreads; ++i) {
        lookupThreads.emplace_back(&Lookup::lookupLoop, this);
    }
}

void Lookup::stop() {
    running.store(false);
    for (auto& t : lookupThreads) {
        if (t.joinable()) t.join();
    }
    lookupThreads.clear();
}
