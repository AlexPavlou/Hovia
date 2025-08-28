import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: 'var(--color-bg)',
                bgAlt: 'var(--color-bg-alt)',
                text: 'var(--color-text)',
                border: 'var(--color-border)',
                bgSidebar: 'var(--color-bg-sidebar)',
                primary: 'var(--color-primary)',
                secondary: 'var(--color-secondary)',
                warning: 'var(--color-warning)',
                grayCustom: 'var(--color-gray)',
                tooltipBg: 'var(--color-tooltip-bg)',
                tooltipText: 'var(--color-tooltip-text)',
                iconActive: 'var(--color-icon-active)',
                iconHover: 'var(--color-icon-hover)',
                iconDefault: 'var(--color-icon-default)',
                themeDefault: 'var(--color-theme-default)',
                themeHover: 'var(--color-theme-hover)',
            },
        },
    },
    plugins: [daisyui],
};
