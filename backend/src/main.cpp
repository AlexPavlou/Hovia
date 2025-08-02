#include "IpTracker.hpp"
#include "utils/Logger.hpp"
#include <curl/curl.h>

#define settingsPath "settings.json"

int main() {
    std::shared_ptr<Settings> settings = Settings::loadFromFile(settingsPath);
    LOGGER = std::make_shared<Logger>(settings);
    curl_global_init(CURL_GLOBAL_DEFAULT);

    IpTracker mainManager;
    mainManager.startApp();

    std::cout << "Press enter line to stop";
    std::cin.get();

    mainManager.stopApp();

    curl_global_cleanup();

    mainManager.saveSettings();
}
