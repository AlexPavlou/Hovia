import { useState, useEffect } from 'react';

export interface SettingsType {
    tracerouteTimeout?: number;
    animationToggle?: boolean;
    verboseLogging?: boolean;
    logPath?: string;
    interfaceOption?: 'Auto' | string;
    ipFilter?: string;
    lookupMode?: 'Auto' | 'API' | 'DB';
    language?: 'English' | 'Spanish' | 'Greek';
    theme?: 'Light' | 'Dark' | 'Auto';
    maxHops?: number;
    WebsocketPort?: number;
}

export default function useSettings() {
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        fetch('http://localhost:8080/api/settings')
            .then((res) => res.json())
            .then((data: SettingsType) => {
                if (isMounted) {
                    setSettings(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                console.error('Failed to load settings');
                if (isMounted) {
                    setSettings(null);
                    setIsLoading(false); // <- important
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return [settings, setSettings, isLoading] as const;
}
