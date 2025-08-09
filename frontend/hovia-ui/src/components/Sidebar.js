import React, { useState } from 'react';
import { Globe, Logs, Settings, Sun, Moon } from 'lucide-react';

const icons = {
    map: <Globe size={24} strokeWidth={2.25} />,
    logging: <Logs size={24} strokeWidth={2.25} />,
    settings: <Settings size={24} strokeWidth={2.25} />,
    lightMode: <Sun size={24} strokeWidth={2.25} />,
    darkMode: <Moon size={24} strokeWidth={2.25} />,
};

function iconButtonStyle(isDark, isActive, isHover) {
    if (isDark) {
        //dark theme colours
        const activeColor = '#FFFFFF';
        const inactiveColor = '#616569';
        const hoverColor = '#BEBFC1';
        return {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isActive
                ? activeColor
                : isHover
                  ? activeColor
                  : inactiveColor,
            padding: 6,
            borderRadius: 8,
            transition: 'color 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        };
    } else {
        // light theme colours
        const activeColor = '#20232A';
        const inactiveColor = '#A0A3A8';
        const hoverColor = '#4A4D53';
        return {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isActive
                ? activeColor
                : isHover
                  ? hoverColor
                  : inactiveColor,
            padding: 6,
            borderRadius: 8,
            transition: 'color 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        };
    }
}

export default function SidebarMinimal({
    onSelect,
    isDark,
    toggleDarkMode,
    active,
}) {
    const pages = ['map', 'logging', 'settings', 'exit'];

    // Track hover state per button keyed by page
    const [hovered, setHovered] = useState(null);

    return (
        <nav
            style={{
                width: 60,
                height: '100vh',
                background: isDark ? '#171C22' : '#FFFFFF', // Dark: nice medium-dark gray, Light: pure white
                borderRight: `1px solid ${isDark ? '#444' : '#DDD'}`, // Border lighter for dark theme
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                boxSizing: 'border-box',
                userSelect: 'none',
            }}
        >
            {/* Top: Logo */}
            <div
                style={{
                    padding: '0 8px',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                }}
            >
                <img
                    src={require('../assets/logo.svg').default} // or import logo from path and use {logo}
                    alt="Logo"
                    style={{
                        maxWidth: '40px',
                        height: 'auto',
                        display: 'block',
                    }}
                />
            </div>

            {/* Middle: Navigation */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    alignItems: 'center',
                }}
            >
                {pages.map((page) => (
                    <button
                        key={page}
                        aria-label={page}
                        onClick={() => onSelect(page)}
                        style={iconButtonStyle(
                            isDark,
                            active === page,
                            hovered === page,
                        )}
                        title={page.charAt(0).toUpperCase() + page.slice(1)}
                        type="button"
                        onMouseEnter={() => setHovered(page)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        {/* For "exit" page which lacks an icon, show a default or text */}
                        {icons[page] || (
                            <span style={{ fontWeight: 'bold' }}>X</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bottom: Theme toggle */}
            <button
                aria-label="Toggle dark mode"
                onClick={toggleDarkMode}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isDark ? '#fafafa' : '#222',
                    padding: 0,
                    transition: 'color 0.3s ease',
                }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                type="button"
                onMouseEnter={(e) =>
                    (e.currentTarget.style.color = isDark ? '#fff' : '#000')
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.color = isDark ? '#fafafa' : '#222')
                }
            >
                {isDark ? icons.lightMode : icons.darkMode}
            </button>
        </nav>
    );
}
