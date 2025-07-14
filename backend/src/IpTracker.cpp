#include "IpTracker.hpp"
#include "capture/capture.hpp"
#include "utils/Logger.hpp"
#include "utils/lookup_utils/common_structs.hpp"
#include "utils/settings.hpp"
#include <memory>
#include <queue>
#include <mutex>
#include <iostream>
#include <curl/curl.h>
//#include <arpa/inet.h>
//#include <netinet/in.h>

// implement IpTracker methods
IpTracker::IpTracker()
    : settings(Settings::loadFromFile("settings.json")), capture(this), lookup(this), ui(this){}

/*Settings IpTracker::getSettings() {
    return settings;
}*/

void IpTracker::saveSettings() {
    settings->saveToFile("settings.json");
}

// Enqueue IP - notify one waiting thread
void IpTracker::enqueueIp(const uint32_t ip) {
    {
        std::lock_guard<std::mutex> lock(queueMutex);
        ipQueue.push(ip);
    }
    queueCond.notify_one();
}

// Dequeue IP with wait and stop check
bool IpTracker::dequeueIp(uint32_t& ip) {
    std::unique_lock<std::mutex> lock(queueMutex);
    queueCond.wait(lock, [this]() { return !ipQueue.empty() || stopped; });

    if (stopped && ipQueue.empty()) return false;

    ip = ipQueue.front();
    ipQueue.pop();
    return true;
}

// Enqueue lookup result - notify one waiting thread
void IpTracker::enqueueResult(const traceResult& Result) {
    {
        std::lock_guard<std::mutex> lock(traceQueueMutex);
        resultsQueue.push(Result);
    }
    traceCV.notify_one();
}

// Dequeue lookup result with wait and stop check
bool IpTracker::dequeueResult(traceResult& Result) {
    std::unique_lock<std::mutex> lock(traceQueueMutex);
    traceCV.wait(lock, [this]() { return !resultsQueue.empty() || stopped; });

    if (stopped && resultsQueue.empty()) return false;

    Result = resultsQueue.front();
    resultsQueue.pop();
    return true;
}

// Stop everything: set stopped, notify all waiting threads
void IpTracker::stop() {
    {
        std::lock_guard<std::mutex> lock1(queueMutex);
        std::lock_guard<std::mutex> lock2(traceQueueMutex);
        stopped = true;
    }
    queueCond.notify_all();
    traceCV.notify_all();
}

// Start capture, lookup, ui threads
void IpTracker::startApp() {
    capture.start();
    lookup.start();
    ui.start(9002);
}

// Stop capture, lookup, ui threads
void IpTracker::stopApp() {
    stop();
    capture.stop();
    lookup.stop();
    ui.stop();
}

int main() {
    std::shared_ptr<Settings> settings = Settings::loadFromFile("settings.json");
    LOGGER = std::make_shared<Logger>(settings);
    curl_global_init(CURL_GLOBAL_DEFAULT);

    IpTracker mainManager;
    mainManager.startApp();

    std::cout << "Press enter line to stop";
    std::cin.get();

    mainManager.stopApp();

    curl_global_cleanup();
}
