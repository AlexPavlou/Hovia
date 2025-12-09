import React from 'react';
import { Tooltip, ActionIcon, useMantineTheme } from '@mantine/core';

interface InfoTooltipProps {
    label: string;
    children: React.ReactNode;
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
    const theme = useMantineTheme();

    return (
        <Tooltip
            label={label}
            withArrow
            multiline
            position="top"
            styles={{
                tooltip: {
                    backgroundColor: 'var(--mantine-color-default)',
                    color: 'var(--mantine-color-text)',
                    border: '1px solid var(--mantine-color-default-border)',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    padding: '8px 12px',
                    boxShadow: 'var(--mantine-shadow-md)',
                },
                arrow: {
                    backgroundColor: 'var(--mantine-color-default)',
                    borderTop: '1px solid var(--mantine-color-default-border)',
                    borderLeft: '1px solid var(--mantine-color-default-border)',
                },
            }}
        >
            <ActionIcon
                variant="transparent"
                size="sm"
                aria-label="Info"
                style={{
                    transition: 'all 0.2s ease',
                    color: 'var(--mantine-color-dimmed)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.color =
                        theme.colors[theme.primaryColor][6];
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.color = 'var(--mantine-color-dimmed)';
                }}
            >
                {children}
            </ActionIcon>
        </Tooltip>
    );
}
