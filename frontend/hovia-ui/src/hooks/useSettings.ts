import { useState, useEffect } from 'react';

export interface SettingsType {
    tracerouteTimeout?: number; // (0-255)
    animationToggle?: boolean;
    verboseLogging?: boolean;
    logPath?: string;
    interfaceOption?: 'Auto' | string;
    ipFilter?: string;
    lookupMode?: 'Auto' | 'API' | 'DB';
    language?: 'English' | 'Spanish' | 'Greek';
    theme?: 'Light' | 'Dark' | 'Auto';
    maxHops?: number; // (0-255)
    WebsocketPort?: number; // (0-65535)
}

export default function useSettings() {
    const [settings, setSettings] = useState<SettingsType | null>(null);

    useEffect(() => {
        let isMounted = true;

        fetch('http://localhost:8080/api/settings')
            .then((res) => res.json())
            .then((data: SettingsType) => {
                if (isMounted) setSettings(data);
            })
            .catch(() => console.error('Failed to load settings'));

        return () => {
            isMounted = false;
        };
    }, []);

    return [settings, setSettings] as const;
}
