import { useState, useEffect, useCallback } from 'react';
import { SettingsType } from './useSettings';

export type Theme = 'Light' | 'Dark' | 'Auto';

export default function useTheme(settings?: SettingsType) {
    const getInitialTheme = (): Theme => {
        if (typeof window === 'undefined') return 'Light';
        const saved = localStorage.getItem('theme') as Theme | null;
        return saved || 'Auto';
    };

    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        if (theme !== 'Auto') localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const html = document.documentElement;
        const applyDarkClass = () => {
            if (theme === 'Auto') {
                const prefersDark = window.matchMedia(
                    '(prefers-color-scheme: dark)',
                ).matches;
                html.classList.toggle('dark', prefersDark);
            } else {
                html.classList.toggle('dark', theme === 'Dark');
            }
        };
        applyDarkClass();

        if (theme === 'Auto') {
            const mediaQuery = window.matchMedia(
                '(prefers-color-scheme: dark)',
            );
            mediaQuery.addEventListener('change', applyDarkClass);
            return () =>
                mediaQuery.removeEventListener('change', applyDarkClass);
        }
    }, [theme]);

    useEffect(() => {
        if (settings?.theme && settings.theme !== theme)
            setTheme(settings.theme);
    }, [settings, theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === 'Light' ? 'Dark' : 'Light';
            localStorage.setItem('theme', next);
            return next;
        });
    }, []);

    return { theme, toggleTheme };
}
