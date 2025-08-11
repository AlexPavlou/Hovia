#pragma once
#include "capture/capture.hpp"
#include "lookup/lookup.hpp"
#include "api/api.hpp"
#include "utils/common_structs.hpp"
#include "utils/settings/settings.hpp"
#include <condition_variable>
#include <memory>
#include <queue>
#include <mutex>

class IpTracker {
    public:
        IpTracker();
        std::shared_ptr<Settings> pSettings;
        void saveSettings();
        void enqueueIp(const uint32_t ip);
        bool dequeueIp(uint32_t& ip);
        void enqueueResult(const traceResult& Result);
        bool dequeueResult(traceResult& Result);
        void start();
        void stop();

    private:
        Capture m_capture;
        Lookup m_lookup;
        ApiServer m_api;
        bool m_hasStopped = false;
        std::queue<uint32_t> m_ipQueue;
        std::queue<traceResult> m_resultsQueue;
        std::mutex m_ipQueueMutex, m_resultsQueueMutex;
        std::condition_variable m_ipQueueCond, m_resultsQueueCond;
};
