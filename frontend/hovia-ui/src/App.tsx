import React, { useState, useMemo } from 'react';
import Sidebar from '@components/Sidebar';
import Map from '@components/Map/Map';
import Settings from '@components/Settings';
import SettingsNotConnected from '@components/SettingsNotConnected';
import useSettings from '@hooks/useSettings';
import ThemeToggle from '@components/ThemeToggle';
import useWebSocket from '@hooks/useWebSocket';
import {
    Search,
    Filter,
    Rewind,
    Download,
    FileDown,
    LucideIcon,
} from 'lucide-react';
import translations from '@i18n';
import { ActionIcon, Tooltip, useComputedColorScheme } from '@mantine/core';

interface PageButton {
    Icon: LucideIcon;
    label: string;
    onClick?: () => void;
}

function App() {
    const [settings, setSettings, isLoading] = useSettings();
    const [traceResults, setTraceResults] = useState<any[]>([]);
    const [selectedPage, setSelectedPage] = useState('map');

    const computedColorScheme = useComputedColorScheme('light', {
        getInitialValueInEffect: true,
    });
    const isDark = computedColorScheme === 'dark';

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
                    darkThemeEnabled={isDark}
                    animationToggle={settings?.animationToggle ?? false}
                    t={t}
                />
            ),
            settings: (
                <Settings settings={settings} setSettings={setSettings} t={t} />
            ),
            logging: <div>{t.loggingPageTitle}</div>,
        }),
        [traceResults, isDark, settings, t],
    );

    const pageButtons: Record<string, PageButton[]> = {
        map: [
            { Icon: Rewind, label: 'Rewind' },
            { Icon: Filter, label: 'Filter' },
            { Icon: Download, label: 'Download' },
        ],
        settings: [{ Icon: Search, label: 'Search' }],
        logging: [
            { Icon: Filter, label: 'Filter' },
            { Icon: FileDown, label: 'Export' },
        ],
    };

    if (isLoading) return null;
    if (!settings) return <SettingsNotConnected />;

    const currentButtons = pageButtons[selectedPage] || [];

    return (
        <div className="bg-bg text-text flex h-screen w-screen overflow-hidden">
            <Sidebar
                darkThemeEnabled={isDark}
                onSelect={setSelectedPage}
                active={selectedPage}
                activeLanguage={activeLanguage}
                t={t}
            />

            <main className="flex flex-col flex-grow h-full min-w-0 bg-bg">
                <header
                    className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'} bg-[var(--color-bg)] text-text shadow-sm z-10`}
                >
                    <h1 className="text-xl font-semibold flex items-center header-text">
                        <span>
                            {t.pages[selectedPage as keyof typeof t.pages]}
                        </span>
                    </h1>

                    <div className="flex space-x-2 items-center">
                        {currentButtons.map(({ Icon, label, onClick }, i) => (
                            <Tooltip label={label} key={i} withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="lg"
                                    onClick={onClick}
                                    aria-label={label}
                                    className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Icon size={20} strokeWidth={2.25} />
                                </ActionIcon>
                            </Tooltip>
                        ))}
                        <ThemeToggle />
                    </div>
                </header>

                <div className="flex-grow overflow-hidden relative">
                    {pages[selectedPage as keyof typeof pages] || (
                        <div>{t.pages.pageNotFound}</div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
