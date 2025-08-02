import React from "react";
import { Globe, Logs, Settings, Sun, Moon} from "lucide-react";

const icons = {
    map: <Globe size={24} strokeWidth={2.25}/>,
    logging: <Logs size={24} strokeWidth={2.25}/>,
    settings: <Settings size={24} strokeWidth={2.25}/>,
    lightMode: <Sun size={24} strokeWidth={2.25}/>,
    darkMode : <Moon size={24} strokeWidth={2.25}/>,
};


function iconButtonStyle(isDark, isActive) {
    return {
        background: isActive ? (isDark ? "#333" : "#eee") : "none",
        border: "none",
        cursor: "pointer",
        color: isDark ? "#fafafa" : "#222",
        padding: 6,
        borderRadius: 8,
        transition: "background 0.2s ease",
    };
}

export default function SidebarMinimal({
    onSelect,
    isDark,
    toggleDarkMode,
    active,
}) {
    const pages = ["map", "logging", "settings", "exit"];

    return ( <
        nav style = {
            {
                width: 60,
                height: "100vh",
                background: isDark ? "#121212" : "#fff",
                borderRight: `1px solid ${isDark ? "#333" : "#ddd"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                boxSizing: "border-box",
                userSelect: "none",
            }
        } >
        {
            /* Top: Logo */ } <
        div style = {
            {
                fontFamily: "'Poppins', sans-serif",
                fontWeight: "700",
                fontSize: 20,
                color: isDark ? "#fafafa" : "#222",
                letterSpacing: 1.2,
            }
        } >
        H <
        /div>

        {
            /* Middle: Navigation */ } <
        div style = {
            {
                display: "flex",
                flexDirection: "column",
                gap: 24,
                alignItems: "center",
            }
        } >
        {
            pages.map((page) => ( <
                button key = {
                    page
                }
                aria-label={page}
                onClick = {
                    () => onSelect(page)
                }
                style = {
                    iconButtonStyle(isDark, active === page)
                }
                title = {
                    page.charAt(0).toUpperCase() + page.slice(1)
                }
                type = "button" >
                {
                    icons[page]
                } <
                /button>
            ))
        } <
        /div>

        {
            /* Bottom: Theme toggle */ } <
        button aria-label = "Toggle dark mode"
        onClick = {
            toggleDarkMode
        }
        style = {
            {
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isDark ? "#fafafa" : "#222",
                padding: 0,
            }
        }
        title = {
            isDark ? "Switch to light mode" : "Switch to dark mode"
        }
        type = "button" >
        {
            isDark ? icons.lightMode : icons.darkMode
        } <
        /button> <
        /nav>
    );
}
