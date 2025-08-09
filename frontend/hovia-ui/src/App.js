import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar'; // Your sidebar component
import Map from './components/Map'; // The SVG globe Map.js we will provide

function App() {
    const [settings, setSettings] = useState(null);
    const [traceResults, setTraceResults] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [selectedPage, setSelectedPage] = useState('map');
    const ws = useRef(null);

    // Load settings on mount (including darkMode)
    useEffect(() => {
        fetch('http://localhost:8080/api/settings')
            .then((res) => res.json())
            .then((data) => {
                setSettings(data);
                if (data.darkMode !== undefined) setDarkMode(data.darkMode);
            })
            .catch((err) => console.error('Failed to load settings', err));
    }, []);

    // WebSocket connection with batching and capped traceResults length to 200
    useEffect(() => {
        if (!settings) return;

        const buffer = [];
        let flushTimeout;
        let retries = 0;
        const maxRetries = 5;

        const flushBuffer = () => {
            if (buffer.length) {
                setTraceResults((prev) => {
                    const combined = [...prev, ...buffer];
                    // Keep max 200 latest
                    if (combined.length > 200) {
                        return combined.slice(combined.length - 200);
                    }
                    return combined;
                });
                buffer.length = 0;
            }
        };

        const connect = () => {
            const socket = new WebSocket('ws://localhost:9002');
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

    // Memoize toggleDarkMode to avoid unnecessary re-renders downstream
    const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);

    let content = null;
    if (selectedPage === 'map') {
        content = <Map traceResults={traceResults} darkMode={darkMode} />;
    } else if (selectedPage === 'logging') {
        // Placeholder for logging component
        content = <div>Logging Page (implement your Logging component)</div>;
    } else {
        content = <div>Page not found</div>;
    }

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                color: darkMode ? '#fafafa' : '#222',
                backgroundColor: darkMode ? '#121212' : '#fff',
            }}
        >
            {/* Sidebar fixed width, no shrinking */}
            <div style={{ flexShrink: 0 }}>
                <Sidebar
                    isDark={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    onSelect={setSelectedPage}
                    active={selectedPage}
                />
            </div>

            {/* Main content fills remaining space, no padding here */}
            <main
                style={{
                    flexGrow: 1,
                    overflow: 'hidden', // Important: prevent main scrollbar, map handles its own
                    display: 'flex', // use flexbox to make child fill
                    flexDirection: 'column',
                    // no padding here so no gaps!
                    backgroundColor: darkMode ? '#222' : '#f9f9f9',
                }}
            >
                {/* Make content fill full main height */}
                <div style={{ flexGrow: 1 }}>{content}</div>
            </main>
        </div>
    );
}

export default App;
