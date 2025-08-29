import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';

type Theme = 'Light' | 'Dark' | 'Auto';

interface ThemeContextType {
    theme: Theme;
    darkThemeEnabled: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const getInitialTheme = (): Theme => {
        if (typeof window === 'undefined') return 'Light';
        const saved = localStorage.getItem('theme') as Theme | null;
        return saved || 'Auto';
    };

    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Compute darkThemeEnabled for convenience
    const darkThemeEnabled =
        theme === 'Dark' ||
        (theme === 'Auto' &&
            window.matchMedia?.('(prefers-color-scheme: dark)').matches);

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

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            if (prev === 'Auto') return 'Dark';
            return prev === 'Dark' ? 'Light' : 'Dark';
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, darkThemeEnabled, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
}
