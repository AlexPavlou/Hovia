#include "ui.hpp"
#include "../IpTracker.hpp"
#include "../utils/lookup_utils/common_structs.hpp"
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
#include <cstring>  // for strcpy
#include <chrono>

// JSON serialization for your structs:
using json = nlohmann::json;

void to_json(json& j, const hopInfo& h) {
    j = json{{"hopIP", std::string(h.hopIP)}, {"latency", h.latency}};
}

void to_json(json& j, const destInfo& d) {
    j = json{
        {"ip", std::string(d.ip)},
        {"country", d.country},
        {"region", d.region},
        {"isp", d.isp},
        {"org", d.org},
        {"as", d.as},
        {"asname", d.asname},
        {"latitude", d.latitude},
        {"longitude", d.longitude},
        {"time_zone", d.time_zone}
    };
}

void to_json(json& j, const traceResult& t) {
    j = json{{"dest_info", t.dest_info}, {"hops", t.hops}};
}

// UserInterface class methods:

UserInterface::UserInterface(IpTracker* ipTracker) : ipTracker(ipTracker), m_running(false) {
    m_server.init_asio();

    m_server.set_open_handler([this](connection_hdl hdl) {
        //std::cout << "Client connected\n";
        m_hdl = hdl;
    });

    m_server.set_message_handler([this](connection_hdl hdl, server::message_ptr msg) {
        //std::cout << "Received: " << msg->get_payload() << std::endl;
        // echo back
        m_server.send(hdl, msg->get_payload(), websocketpp::frame::opcode::text);
    });

    m_server.set_close_handler([this](connection_hdl) {
        //std::cout << "Client disconnected\n";
        m_hdl.reset();
    });
}

UserInterface::~UserInterface() {
    m_running.store(false);
    if (m_send_thread.joinable())
        m_send_thread.join();
}

void UserInterface::start(uint16_t port) {
    m_server.clear_access_channels(websocketpp::log::alevel::all);
    m_server.clear_error_channels(websocketpp::log::elevel::all);
    m_server.listen(port);
    m_server.start_accept();

    m_running.store(true);
    m_send_thread = std::thread(&UserInterface::send_loop, this);

    m_server.run();
}

void UserInterface::stop() {
    m_running.store(false);
    if (m_send_thread.joinable())
        m_send_thread.join();
}

void UserInterface::send_traceResult(const traceResult& tr) {
    if (m_hdl.expired()) return;

    json j = tr;
    std::string msg = j.dump();

    try {
        m_server.send(m_hdl, msg, websocketpp::frame::opcode::text);
    } catch (const websocketpp::exception& e) {
        //std::cout << "Send failed: " << e.what() << std::endl;
    }
}

void UserInterface::send_loop() {
    while (m_running.load()) {
        if (!m_hdl.expired()) {
            traceResult tr;
            // Try to get real data from IpTracker queue
            bool got_result = ipTracker->dequeueResult(tr);
            if (!got_result) {
                // No results and stopped, break loop or sleep and retry
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                continue;
            }
            send_traceResult(tr);
        } else {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
}

traceResult UserInterface::generate_sample_traceResult() {
    traceResult tr;

    // fill dest_info
    strcpy(tr.dest_info.ip, "8.8.8.8");
    tr.dest_info.country = "United States";
    tr.dest_info.region = "California";
    tr.dest_info.isp = "Google LLC";
    tr.dest_info.org = "Google";
    tr.dest_info.as = "AS15169";
    tr.dest_info.asname = "GOOGLE";
    tr.dest_info.latitude = 37.386;
    tr.dest_info.longitude = -122.0838;
    tr.dest_info.time_zone = "PST";

    // fill hops vector with some dummy hops
    tr.hops.clear();

    hopInfo h1;
    strcpy(h1.hopIP, "192.168.1.1");
    h1.latency = 12.5;
    tr.hops.push_back(h1);

    hopInfo h2;
    strcpy(h2.hopIP, "10.0.0.1");
    h2.latency = 25.7;
    tr.hops.push_back(h2);

    return tr;
}
