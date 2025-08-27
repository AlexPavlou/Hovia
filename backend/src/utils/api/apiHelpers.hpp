#pragma once
#include "utils/settings/settings.hpp"
#include <string>

// Enum to string helper functions

inline std::string lookupModeToString(LookupMode mode) {
    switch (mode) {
        case LookupMode::DB:
            return "DB";
        case LookupMode::API:
            return "API";
        default:
            return "Auto";
    }
}

inline std::string themeToString(ActiveTheme theme) {
    switch (theme) {
        case ActiveTheme::DARK:
            return "Dark";
        case ActiveTheme::LIGHT:
            return "Light";
        default:
            return "Auto";
    }
}

inline std::string languageToString(ActiveLanguage lang) {
    switch (lang) {
        case ActiveLanguage::SPANISH:
            return "Spanish";
        case ActiveLanguage::GREEK:
            return "Greek";
        default:
            return "English";
    }
}
