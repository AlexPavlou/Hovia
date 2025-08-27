import React, { useMemo } from 'react';
import IconButton from './IconButton';
import ThemeToggle from './ThemeToggle';
import translations from '../i18n';
import { Globe, Logs, Settings } from 'lucide-react';
import logo from 'assets/logo.svg';

const pages = ['map', 'logging', 'settings'];

interface SidebarProps {
    onSelect: (page: string) => void;
    darkThemeEnabled: boolean;
    toggleDarkMode: () => void;
    active: string;
    activeLanguage?: string;
}

export default React.memo(function Sidebar({
    onSelect,
    darkThemeEnabled,
    toggleDarkMode,
    active,
    activeLanguage = 'ENGLISH',
}: SidebarProps) {
    const t = translations[activeLanguage] || translations.ENGLISH;

    const icons = {
        map: <Globe size={24} strokeWidth={2.25} />,
        logging: <Logs size={24} strokeWidth={2.25} />,
        settings: <Settings size={24} strokeWidth={2.25} />,
    };

    return (
        <nav
            className={`w-15 h-screen ${darkThemeEnabled ? 'bg-[#171C22] border-r border-[#444]' : 'bg-white border-r border-[#DDD]'} flex flex-col items-center justify-between p-3 select-none`}
        >
            {/* Logo */}
            <div className="w-full mb-3 flex items-center justify-center">
                <img src={logo} alt="logo" className="max-w-10 h-auto block" />
            </div>

            {/* Navigation icons */}
            <div className="flex flex-col gap-6 items-center">
                {pages.map((page) => (
                    <IconButton
                        key={page}
                        icon={icons[page]}
                        darkThemeEnabled={darkThemeEnabled}
                        isActive={active === page}
                        label={t.pages[page]}
                        onClick={() => onSelect(page)}
                    />
                ))}
            </div>

            {/* Theme toggle */}
            <ThemeToggle
                darkThemeEnabled={darkThemeEnabled}
                toggleDarkMode={toggleDarkMode}
            />
        </nav>
    );
});
