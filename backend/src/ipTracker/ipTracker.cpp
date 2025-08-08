#include "ipTracker.hpp"
#include <curl/curl.h>

IpTracker::IpTracker()
    : pSettings(Settings::loadFromFile(SETTINGS_PATH)),
      m_capture(this),
      m_lookup(this),
      m_api(this) {}

void IpTracker::saveSettings() { pSettings->saveToFile(SETTINGS_PATH); }

void IpTracker::enqueueIp(const uint32_t ip) {
    {
        std::lock_guard<std::mutex> lock(m_ipQueueMutex);
        m_ipQueue.push(ip);
    }
    m_ipQueueCond.notify_one();
}

// Dequeue IP, making sure
bool IpTracker::dequeueIp(uint32_t &ip) {
    std::unique_lock<std::mutex> lock(m_ipQueueMutex);
    // temporarily releases its lock, until m_ipQueue has an entry, or
    // m_hasStopped is set off, meaning the app must shutdown
    m_ipQueueCond.wait(lock,
                       [this]() { return !m_ipQueue.empty() || m_hasStopped; });

    if (m_hasStopped)
        return false;

    ip = m_ipQueue.front();
    m_ipQueue.pop();
    return true;
}

void IpTracker::enqueueResult(const traceResult &Result) {
    {
        std::lock_guard<std::mutex> lock(m_resultsQueueMutex);
        m_resultsQueue.push(Result);
    }
    m_resultsQueueCond.notify_one();
}

bool IpTracker::dequeueResult(traceResult &Result) {
    std::unique_lock<std::mutex> lock(m_resultsQueueMutex);
    // temporarily releases its lock, until m_resultsQueue has an entry, or
    // m_hasStopped is set off, meaning the app must shutdown
    m_resultsQueueCond.wait(
        lock, [this]() { return !m_resultsQueue.empty() || m_hasStopped; });

    if (m_hasStopped)
        return false;

    Result = m_resultsQueue.front();
    m_resultsQueue.pop();
    return true;
}

// Call the capture, lookup and api objects' start() functions, in order for
// each one to spawn their respective number of threads and begin performing
// their operations
void IpTracker::start() {
    std::cout << "Starting capture:";
    m_capture.startCapture();
    std::cout << "s2 capture:";
    m_lookup.startLookup();
    m_api.startAPI(9002, 8080);
}

// Notify all threads to stop and shutdown any operation
void IpTracker::stop() {
    {
        std::lock_guard<std::mutex> lock1(m_ipQueueMutex);
        std::lock_guard<std::mutex> lock2(m_resultsQueueMutex);
        m_hasStopped = true;
    }
    m_ipQueueCond.notify_all();
    m_resultsQueueCond.notify_all();

    m_capture.stopCapture();
    m_lookup.stopLookup();
    m_api.stopAPI();
}
