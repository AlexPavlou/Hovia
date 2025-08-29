import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './ThemeContext';

const rootElement = document.getElementById('root');
ReactDOM.createRoot(rootElement).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>,
);

reportWebVitals();
