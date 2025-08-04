#include "ipTracker/ipTracker.hpp"
#include "utils/logger.hpp"
#include <curl/curl.h>

int main() {
    // initialize pSettings ptr with the settings found in SETTINGS_PATH
    std::shared_ptr<Settings> pSettings = Settings::loadFromFile(SETTINGS_PATH);
    LOGGER = std::make_shared<Logger>(pSettings);
    curl_global_init(CURL_GLOBAL_DEFAULT);

    IpTracker appManager;
    appManager.start();

    std::cout << "Press enter to stop capturing";
    std::cin.get();

    // clean up and close the application
    appManager.stop();
    curl_global_cleanup();
    appManager.saveSettings();
}
