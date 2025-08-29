import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@components/Sidebar';
import Map from '@components/Map/Map';
import Settings from '@components/Settings';
import SettingsNotConnected from '@components/SettingsNotConnected';
import useSettings from '@hooks/useSettings';
import { useTheme } from './ThemeContext';
import useWebSocket from '@hooks/useWebSocket';
import translations from '@i18n';

function App() {
    const [settings, setSettings, isLoading] = useSettings();
    const { theme, darkThemeEnabled, toggleTheme } = useTheme();
    const [traceResults, setTraceResults] = useState([]);
    const [selectedPage, setSelectedPage] = useState('map');

    useWebSocket(settings?.websocketPort, (newData) => {
        setTraceResults((prev) => {
            const updated = [...prev, newData];
            return updated.length > 200 ? updated.slice(-200) : updated;
        });
    });

    const activeLanguage = settings?.activeLanguage?.toUpperCase() || 'ENGLISH';
    const t = translations[activeLanguage] || translations.ENGLISH;

    const pages = useMemo(
        () => ({
            map: (
                <Map
                    traceResults={traceResults}
                    darkThemeEnabled={theme === 'Dark'}
                    animationToggle={settings?.animationToggle ?? false}
                    t={t}
                />
            ),
            settings: (
                <Settings
                    settings={settings}
                    setSettings={setSettings}
                    t={t}
                    darkThemeEnabled={theme === 'Dark'}
                />
            ),
            logging: <div>{t.loggingPageTitle}</div>,
        }),
        [traceResults, theme, settings, t],
    );
    if (isLoading) {
        return;
    }

    if (!settings) return <SettingsNotConnected />;

    return (
        <div
            data-theme={theme === 'Dark' ? 'dark' : 'light'}
            className="bg-bg text-text flex h-screen"
        >
            <Sidebar
                darkThemeEnabled={theme === 'Dark'}
                toggleDarkMode={toggleTheme}
                onSelect={setSelectedPage}
                active={selectedPage}
                activeLanguage={activeLanguage}
                t={t}
            />
            <main className="flex-grow overflow-hidden flex flex-col bg-bg">
                <div className="flex-grow">
                    {pages[selectedPage] || <div>{t.pages.pageNotFound}</div>}
                </div>
            </main>
        </div>
    );
}

export default App;
