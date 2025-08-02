#include "IpTracker.hpp"
#include "capture/capture.hpp"
#include "utils/lookup_utils/common_structs.hpp"
#include <mutex>
#include <curl/curl.h>

#define settingsPath "settings.json"

// implement IpTracker methods
IpTracker::IpTracker()
    : settings(Settings::loadFromFile(settingsPath)), capture(this), lookup(this), ui(this){}

void IpTracker::saveSettings() {
    settings->saveToFile(settingsPath);
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

    if (stopped) return false;

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

    if (stopped) return false;

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
    ui.start(9002, 8080);
}

// Stop capture, lookup, ui threads
void IpTracker::stopApp() {
    stop();
    capture.stop();
    lookup.stop();
    ui.stop();
}
