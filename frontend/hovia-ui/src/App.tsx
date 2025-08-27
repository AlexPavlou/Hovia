import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@components/Sidebar';
import Map from '@components/Map/Map';
import Settings from '@components/Settings';
import SettingsNotConnected from '@components/SettingsNotConnected';
import useSettings from '@hooks/useSettings';
import useTheme from '@hooks/useTheme';
import useWebSocket from '@hooks/useWebSocket';
import translations from '@i18n';

function App() {
    const [settings, setSettings] = useSettings();
    const [isLoading, setIsLoading] = useState(true);
    const { theme, toggleTheme } = useTheme(settings);
    const [traceResults, setTraceResults] = useState([]);
    const [selectedPage, setSelectedPage] = useState('map');

    useEffect(() => {
        setIsLoading(false);
    }, [settings]);

    useWebSocket(settings?.WebsocketPort, (newData) =>
        setTraceResults((prev) =>
            prev.length + newData.length > 200
                ? [...prev, ...newData].slice(-200)
                : [...prev, ...newData],
        ),
    );

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

    // Now conditionally return UI after all hooks/vars declared
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#222]">
                {/* Loading spinner UI */}
            </div>
        );
    }

    if (!settings) return <SettingsNotConnected />;

    return (
        <div className="bg-[#f9f9f9] dark:bg-[#121212] text-[#222] dark:text-[#fafafa] flex h-screen">
            <Sidebar
                darkThemeEnabled={theme === 'Dark'}
                toggleDarkMode={toggleTheme}
                onSelect={setSelectedPage}
                active={selectedPage}
                activeLanguage={activeLanguage}
                t={t}
            />
            <main className="flex-grow overflow-hidden flex flex-col bg-[#f9f9f9] dark:bg-[#222]">
                <div className="flex-grow">
                    {pages[selectedPage] || <div>{t.pages.pageNotFound}</div>}
                </div>
            </main>
        </div>
    );
}

export default App;
