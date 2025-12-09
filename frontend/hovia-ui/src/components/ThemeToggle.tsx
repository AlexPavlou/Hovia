import {
    ActionIcon,
    useMantineColorScheme,
    useComputedColorScheme,
} from '@mantine/core';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('light', {
        getInitialValueInEffect: true,
    });

    const toggleColorScheme = () => {
        setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <ActionIcon
            onClick={toggleColorScheme}
            variant="transparent"
            color="gray" // Forces Mantine to NOT use primary color by default
            size="lg"
            aria-label="Toggle color scheme"
            // The '!' forces Tailwind to override Mantine's internal styles
            className="!text-[var(--color-icon-default)] hover:!text-[var(--color-primary)] transition-colors duration-200"
        >
            {computedColorScheme === 'dark' ? (
                <Sun size={20} strokeWidth={2.25} />
            ) : (
                <Moon size={20} strokeWidth={2.25} />
            )}
        </ActionIcon>
    );
}
