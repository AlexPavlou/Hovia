import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import './styles/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './ThemeContext';
import "@fontsource/plus-jakarta-sans";
import "@fontsource/dm-sans";

import { MantineProvider } from '@mantine/core';
import { theme } from './theme';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
    <ThemeProvider>
        <MantineProvider theme={theme}>
            <App />
        </MantineProvider>
    </ThemeProvider>,
);

reportWebVitals();
