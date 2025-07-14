#pragma once
#include "capture/capture.hpp"
#include "lookup/lookup.hpp"
#include "ui/ui.hpp"
#include "utils/lookup_utils/common_structs.hpp"
#include "utils/settings.hpp"
#include <condition_variable>
#include <memory>
#include <queue>
#include <mutex>

class IpTracker {
public:
    std::shared_ptr<Settings> settings;
    IpTracker();
    //Settings& getSettings();
    void saveSettings();
    void enqueueIp(const uint32_t ip);
    bool dequeueIp(uint32_t& ip);
    void enqueueResult(const traceResult& Result);
    bool dequeueResult(traceResult& Result);
    void stop();
    void startApp();
    void stopApp();
private:
    Capture capture;
    Lookup lookup;
    UserInterface ui;
    bool stopped = false;
    std::queue<uint32_t> ipQueue;
    std::queue<traceResult> resultsQueue;
    std::mutex queueMutex, traceQueueMutex;
    std::condition_variable cv, traceCV, queueCond;
};
