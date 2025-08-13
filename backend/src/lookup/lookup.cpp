#include "lookup.hpp"
#include "ipTracker/ipTracker.hpp"
#include "platform_dependent/traceroute/traceroute.hpp"
#include "utils/logger/logger.hpp"
#include <cstdint>
// #include <filesystem>
#include <thread>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

Lookup::Lookup(IpTracker* ipTracker)
    : m_running(false), m_ipTracker(ipTracker) {}

size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    auto* response = static_cast<std::string*>(userp);
    response->append(static_cast<char*>(contents), size * nmemb);
    return size * nmemb;
}

destInfo Lookup::lookupAPI(const std::string& ip) {
    destInfo info{};
    std::string url =
        "http://ip-api.com/json/" + ip +
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

    // return early if unsuccessful
    if (res != CURLE_OK)
        return info;

    // otherwise parse info and populate teh destInfo struct with the API's
    // response
    auto json = nlohmann::json::parse(response, nullptr, false);
    if (!json.is_object() || json["status"] != "success")
        return info;

    strncpy(info.ip, ip.c_str(), sizeof(info.ip));
    info.ip[sizeof(info.ip) - 1] = '\0';
    info.country = json["country"];
    info.region = json["regionName"];
    info.isp = json["isp"];
    info.org = json["org"];
    info.as = json["as"];
    info.asname = json["asname"];
    info.latitude = json["lat"];
    info.longitude = json["lon"];
    info.time_zone = json["timezone"];

    return info;
}

// Converts a uint32_t IP (in host byte order) to dotted-decimal string
std::string ipToStr(uint32_t ip) {
    in_addr addr{};
    addr.s_addr = htonl(ip);  // Convert to network byte order
    char ipStr[INET_ADDRSTRLEN] = {};

    // Convert IPv4 address to string
    const char* res = inet_ntop(AF_INET, &addr, ipStr, sizeof(ipStr));
    if (res == nullptr) {
        return "";
    }

    return std::string(ipStr);
}

traceResult Lookup::processIp(const uint32_t& ip) {
    traceResult result;
    std::string ipStr = ipToStr(ip);
    result.timestamp = Logger::getInstance().getCurrentTimestamp();
    result.hops = traceroute(ipStr, m_ipTracker->pSettings->getMaxHops(),
                             m_ipTracker->pSettings->getTimeout());

    if (m_ipTracker->pSettings->getLookupMode() == LookupMode::API) {
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Calling lookupAPI()");
        result.dest_info = lookupAPI(ipStr);
    } else {
        if (!std::filesystem::exists("db.db")) {
            Logger::getInstance().log(LogLevel::ERROR, __func__,
                                      "Db was not found, process exited.");
            return {};
        }
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Calling lookupDB()");
        // result.dest_info = lookupDB(ipStr);
    }

    return result;
}

void Lookup::lookupLoop() {
    uint32_t ip;
    traceResult newResult;
    while (m_running.load()) {
        if (!m_ipTracker->dequeueIp(ip))
            break;
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Dequeued '" + ipToStr(ip) +
                                          "' IP from the IP Queue");

        newResult = processIp(ip);
        m_ipTracker->enqueueResult(newResult);
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Pushed results of '" + ipToStr(ip) +
                                          "' IP from the Results Queue");
    }
}

void Lookup::startLookup(size_t numThreads) {
    if (m_running.exchange(true))
        return;
    m_lookupThreads.clear();
    // generate numThreads threads that run lookupLoop
    for (size_t i = 0; i < numThreads; ++i) {
        if (m_ipTracker->pSettings->hasVerbose())
            Logger::getInstance().log(LogLevel::INFO, __func__,
                                      "Initialized lookup thread no. #" +
                                          std::to_string(i));
        m_lookupThreads.emplace_back(&Lookup::lookupLoop, this);
    }
}

void Lookup::stopLookup() {
    m_running.store(false);
    if (m_ipTracker->pSettings->hasVerbose())
        Logger::getInstance().log(LogLevel::INFO, __func__,
                                  "Attempting to join all lookup threads");
    for (auto& t : m_lookupThreads) {
        // try and join each of the threads in m_lookupThreads
        if (t.joinable())
            t.join();
    }
    m_lookupThreads.clear();
}
