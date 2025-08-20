import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import Settings from './components/Settings';
import translations from './i18n';

function getColors(theme) {
    if (theme === 'Light') {
        return { background: '#fff', text: '#222', mainBg: '#f9f9f9' };
    }
    if (theme === 'Dark') {
        return { background: '#121212', text: '#fafafa', mainBg: '#222' };
    }
    // Auto: system preference
    if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
        return { background: '#121212', text: '#fafafa', mainBg: '#222' };
    }
    return { background: '#fff', text: '#222', mainBg: '#f9f9f9' };
}

function App() {
    const [settings, setSettings] = useState(null);
    const [traceResults, setTraceResults] = useState([]);
    // We move from darkMode boolean to theme string with 'Light' | 'Dark' | 'Auto'
    const [theme, setTheme] = useState('Light');
    const [selectedPage, setSelectedPage] = useState('map');
    const ws = useRef(null);

    // Load settings on mount
    useEffect(() => {
        fetch('http://localhost:8080/api/settings')
            .then((res) => res.json())
            .then((data) => {
                setSettings(data);
                if (data.theme) setTheme(data.theme);
            })
            .catch((err) => console.error('Failed to load settings', err));
    }, []);

    // Sync `theme` state whenever settings.theme changes from Settings page
    useEffect(() => {
        if (settings?.theme && settings.theme !== theme) {
            setTheme(settings.theme);
        }
    }, [settings, theme]);

    const activeLanguage = settings?.activeLanguage?.toUpperCase() || 'ENGLISH';
    const t = translations[activeLanguage] || translations.ENGLISH;

    // WebSocket connection with batching and capped traceResults length to 200
    useEffect(() => {
        if (!settings || !settings.WebsocketPort) return;

        const buffer = [];
        let flushTimeout;
        let retries = 0;
        const maxRetries = 5;

        const flushBuffer = () => {
            if (buffer.length) {
                setTraceResults((prev) => {
                    const combined = [...prev, ...buffer];
                    if (combined.length > 200) {
                        return combined.slice(combined.length - 200);
                    }
                    return combined;
                });
                buffer.length = 0;
            }
        };

        const connect = () => {
            const socketUrl = `ws://localhost:${settings.WebsocketPort}`;
            const socket = new WebSocket(socketUrl);
            ws.current = socket;

            socket.onopen = () => {
                console.log(
                    'WebSocket connected, readyState:',
                    socket.readyState,
                );
                retries = 0;
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data?.hops?.length) {
                        buffer.push(data);
                        if (!flushTimeout) {
                            flushTimeout = setTimeout(() => {
                                flushBuffer();
                                flushTimeout = null;
                            }, 200);
                        }
                    }
                } catch {
                    console.warn('Invalid WS JSON', event.data);
                }
            };

            socket.onerror = (event) => {
                console.error('WebSocket error:', event);
            };

            socket.onclose = (event) => {
                console.log(
                    'WebSocket closed, code:',
                    event.code,
                    'reason:',
                    event.reason,
                );
                if (retries < maxRetries) {
                    retries++;
                    setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            if (flushTimeout) clearTimeout(flushTimeout);
            if (ws.current) ws.current.close();
        };
    }, [settings]);

    // Toggle theme in a cycle Light -> Dark -> Auto -> Light ...
    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            if (prev === 'Light') return 'Dark';
            if (prev === 'Dark') return 'Auto';
            return 'Light';
        });
        // Also update in settings for consistency
        setSettings((prev) => ({
            ...prev,
            theme:
                prev.theme === 'Light'
                    ? 'Dark'
                    : prev.theme === 'Dark'
                      ? 'Auto'
                      : 'Light',
        }));
    }, []);

    const colors = getColors(theme);

    let content = null;
    if (selectedPage === 'map') {
        content = (
            <Map
                traceResults={traceResults}
                darkMode={
                    theme === 'Dark' ||
                    (theme === 'Auto' &&
                        window.matchMedia?.('(prefers-color-scheme: dark)')
                            .matches)
                }
                animationToggle={settings?.animationToggle ?? false}
                t={t}
            />
        );
    } else if (selectedPage === 'settings') {
        content = (
            <Settings settings={settings} setSettings={setSettings} t={t} />
        );
    } else if (selectedPage === 'logging') {
        content = <div>{t.loggingPageTitle}</div>;
    } else {
        content = <div>{t.pages.pageNotFound}</div>;
    }

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                color: colors.text,
                backgroundColor: colors.background,
            }}
        >
            {/* Sidebar fixed width, no shrinking */}
            <div style={{ flexShrink: 0 }}>
                <Sidebar
                    isDark={
                        theme === 'Dark' ||
                        (theme === 'Auto' &&
                            window.matchMedia?.('(prefers-color-scheme: dark)')
                                .matches)
                    }
                    toggleDarkMode={toggleTheme}
                    onSelect={setSelectedPage}
                    active={selectedPage}
                    activeLanguage={activeLanguage}
                    t={t}
                />
            </div>

            {/* Main content fills remaining space */}
            <main
                style={{
                    flexGrow: 1,
                    overflow: 'hidden', // important to prevent scrollbars
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: colors.mainBg,
                }}
            >
                <div style={{ flexGrow: 1 }}>{content}</div>
            </main>
        </div>
    );
}

export default App;
