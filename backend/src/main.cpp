#include "ipTracker/ipTracker.hpp"
#include <curl/curl.h>

int main() {
    // initialize pSettings ptr with the settings found in SETTINGS_PATH
    std::shared_ptr<Settings> pSettings = Settings::loadFromFile();
    curl_global_init(CURL_GLOBAL_DEFAULT);

    IpTracker appManager;
    appManager.start();

    std::cout << "Press enter to stop capturing\n";
    std::cout.flush();
    std::cin.get();

    // clean up and close the application
    appManager.stop();
    curl_global_cleanup();
    appManager.saveSettings();
}
