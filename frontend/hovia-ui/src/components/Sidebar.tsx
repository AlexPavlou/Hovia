import React, { useMemo } from 'react';
import IconButton from './IconButton';
import translations from '../i18n';
import { Globe, Logs, Settings, Power } from 'lucide-react';
import logo from 'assets/logo.svg';

const pages = ['map', 'logging', 'settings'];

interface SidebarProps {
    onSelect: (page: string) => void;
    darkThemeEnabled: boolean;
    active: string;
    activeLanguage?: string;
}

const handleExit = async () => {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (!response.ok) {
            console.error('Logout failed:', response.statusText);
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Logout error. Please check your connection.');
    }
};

export default React.memo(function Sidebar({
    onSelect,
    darkThemeEnabled,
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
            className={`w-15 h-screen bg-[var(--color-bg-alt)] border-[#DDD] dark:border-[#444] flex flex-col items-center justify-between p-3 select-none`}
        >
            {/* Logo */}
            <div className="w-full mb-3 flex items-center justify-center text-primary">
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
            <IconButton
                icon={<Power size={24} strokeWidth={2.25} />}
                darkThemeEnabled={darkThemeEnabled}
                isActive={false}
                label={t.pages.exit || 'Exit'}
                onClick={handleExit}
                title={t.pages.exit || 'Exit'}
            />
        </nav>
    );
});
