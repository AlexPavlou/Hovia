import { createTheme } from '@mantine/core';

export const theme = createTheme({
    colors: {
        primary: Array(10).fill('var(--color-primary)') as any,
        ocean: Array(10).fill('var(--color-ocean-fill)') as any,
        bg: Array(10).fill('var(--color-bg)') as any,
    },
    primaryColor: 'primary',
});
