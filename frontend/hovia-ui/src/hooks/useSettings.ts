import { useState, useEffect } from 'react';

export interface SettingsType {
    timeout?: number;
    animationToggle?: boolean;
    hasVerbose?: boolean;
    logPath?: string;
    interfaceOption?: 'Auto' | string;
    ipFilter?: string;
    lookupMode?: 'Auto' | 'API' | 'DB';
    activeLanguage?: 'English' | 'Spanish' | 'Greek';
    theme?: 'Light' | 'Dark' | 'Auto';
    maxHops?: number;
    websocketPort?: number;
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
