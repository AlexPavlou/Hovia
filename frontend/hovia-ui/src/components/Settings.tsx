import React, { useState, useEffect, useMemo } from 'react';
import {
    TextInput,
    NumberInput,
    Select,
    Switch,
    Button,
    Group,
    Title,
    Box,
    Text,
    Loader,
    Alert,
    Container,
    Divider,
} from '@mantine/core';
import { InfoTooltip } from './InfoTooltip';

const HelpIcon = ({
    size,
    style,
}: {
    size?: number;
    style?: React.CSSProperties;
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

interface SettingsProps {
    settings: any;
    setSettings: (s: any) => void;
    t: any;
}

const Field = ({
    label,
    node,
    tooltip,
}: {
    label: string;
    node: React.ReactNode;
    tooltip?: string;
}) => (
    <Group
        justify="space-between"
        align="center"
        mb="sm"
        w="100%"
        wrap="nowrap"
    >
        <Group
            gap="xs"
            style={{
                flex: 1,
                minWidth: 0,
                paddingRight: '16px',
            }}
        >
            <Text
                size="sm"
                fw={500}
                style={{ lineHeight: 1.4, color: 'inherit' }}
            >
                {label}
            </Text>

            {tooltip && (
                <InfoTooltip label={tooltip}>
                    <HelpIcon size={15} />
                </InfoTooltip>
            )}
        </Group>

        <Box w={250} style={{ flexShrink: 0 }}>
            {node}
        </Box>
    </Group>
);

export default function Settings({ settings, setSettings, t }: SettingsProps) {
    const [localSettings, setLocalSettings] = useState<any>(null);
    const [interfaces, setInterfaces] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (settings) setLocalSettings({ ...settings });
    }, [settings]);

    useEffect(() => {
        fetch('/api/interfaces')
            .then(async (res) => {
                const data = await res.json();
                setInterfaces(data.filter((i: string) => i.trim()));
            })
            .catch(() => setInterfaces([]));
    }, []);

    const isModified = useMemo(() => {
        if (!settings || !localSettings) return false;
        return JSON.stringify(settings) !== JSON.stringify(localSettings);
    }, [settings, localSettings]);

    const updateField = (field: string, value: any) => {
        setLocalSettings((prev: any) => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(null);
    };

    const saveSettings = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localSettings),
            });
            if (!response.ok)
                throw new Error(`Server error: ${response.status}`);
            setSettings(localSettings);
            setSuccess(t.settingsSaved || 'Settings saved successfully!');
        } catch (e) {
            setError(t.saveError || 'Failed to save settings.');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (!localSettings) {
        return (
            <Container
                style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Loader size="lg" />
                <Text ml="md">{t.loading || 'Loading...'}</Text>
            </Container>
        );
    }

    const categories = [
        {
            key: 'general',
            title: t.general || 'General',
            fields: [
                {
                    label: t.tracerouteTimeout || 'Traceroute Timeout',
                    node: (
                        <NumberInput
                            w="100%"
                            value={localSettings.timeout}
                            onChange={(val) => updateField('timeout', val)}
                            min={0}
                            max={255}
                            clampBehavior="strict"
                            placeholder="0-255 ms"
                        />
                    ),
                    tooltip:
                        t.tracerouteTimeoutInfo ||
                        'Timeout in seconds for traceroute requests',
                },
                {
                    label: t.animationToggle || 'Animation',
                    node: (
                        <Group justify="flex-end" w="100%">
                            <Switch
                                checked={!!localSettings.animationToggle}
                                onChange={(e) =>
                                    updateField(
                                        'animationToggle',
                                        e.currentTarget.checked,
                                    )
                                }
                                size="md"
                                style={{ cursor: 'pointer' }}
                            />
                        </Group>
                    ),
                    tooltip:
                        t.animationToggleInfo ||
                        'Enable or disable UI animations',
                },
                {
                    label: t.verboseLogging || 'Verbose Logging',
                    node: (
                        <Group justify="flex-end" w="100%">
                            <Switch
                                checked={!!localSettings.hasVerbose}
                                onChange={(e) =>
                                    updateField(
                                        'hasVerbose',
                                        e.currentTarget.checked,
                                    )
                                }
                                size="md"
                                style={{ cursor: 'pointer' }}
                            />
                        </Group>
                    ),
                    tooltip:
                        t.verboseLoggingInfo ||
                        'Enable detailed system logging',
                },
                {
                    label: t.logPath || 'Log Path',
                    node: (
                        <TextInput
                            w="100%"
                            value={localSettings.logPath || ''}
                            onChange={(e) =>
                                updateField('logPath', e.currentTarget.value)
                            }
                            placeholder="app.log"
                        />
                    ),
                    tooltip:
                        t.logPathInfo || 'Absolute path for log file storage',
                },
            ],
        },
        {
            key: 'network',
            title: t.network || 'Network',
            fields: [
                {
                    label: t.interfaceOption || 'Interface',
                    node: (
                        <Select
                            w="100%"
                            value={localSettings.interfaceOption || 'Auto'}
                            onChange={(val) =>
                                updateField('interfaceOption', val)
                            }
                            data={[
                                ...interfaces.map((i) => ({
                                    value: i,
                                    label: i,
                                })),
                                { value: 'Auto', label: t.auto || 'Auto' },
                            ]}
                            checkIconPosition="right"
                        />
                    ),
                    tooltip:
                        t.interfaceOptionInfo ||
                        'Default packet capture interface',
                },
                {
                    label: t.ipFilter || 'IP Filter',
                    node: (
                        <TextInput
                            w="100%"
                            value={localSettings.ipFilter || ''}
                            onChange={(e) =>
                                updateField('ipFilter', e.currentTarget.value)
                            }
                            placeholder="e.g. 192.168.1.1"
                        />
                    ),
                    tooltip:
                        t.ipFilterInfo ||
                        'Filter traffic through libpcap parameters',
                },
                {
                    label: t.lookupMode || 'Lookup Mode',
                    node: (
                        <Select
                            w="100%"
                            value={localSettings.lookupMode || 'Auto'}
                            onChange={(val) => updateField('lookupMode', val)}
                            data={[
                                { value: 'Auto', label: t.auto || 'Auto' },
                                { value: 'API', label: t.api || 'API' },
                                { value: 'DB', label: t.db || 'DB' },
                            ]}
                            checkIconPosition="right"
                        />
                    ),
                    tooltip:
                        t.lookupModeInfo ||
                        'Method used for IP geolocation lookups',
                },
                {
                    label: t.WebsocketPort || 'WebSocket Port',
                    node: (
                        <NumberInput
                            w="100%"
                            value={localSettings.websocketPort}
                            onChange={(val) =>
                                updateField('websocketPort', val)
                            }
                            min={0}
                            max={65535}
                            clampBehavior="strict"
                            placeholder="9002"
                            allowDecimal={false}
                        />
                    ),
                    tooltip:
                        t.WebsocketPortInfo ||
                        'Port for real-time data connections',
                },
            ],
        },
        {
            key: 'advanced',
            title: t.advanced || 'Advanced',
            fields: [
                {
                    label: t.maxHops || 'Max Hops',
                    node: (
                        <NumberInput
                            w="100%"
                            value={localSettings.maxHops}
                            onChange={(val) => updateField('maxHops', val)}
                            min={0}
                            max={255}
                            clampBehavior="strict"
                            placeholder="30"
                            allowDecimal={false}
                        />
                    ),
                    tooltip:
                        t.maxHopsInfo || 'Maximum TTL for traceroute packets',
                },
                {
                    label: t.theme || 'Theme',
                    node: (
                        <Select
                            w="100%"
                            value={localSettings.theme || 'Auto'}
                            onChange={(val) => updateField('theme', val)}
                            data={[
                                { value: 'Light', label: t.light || 'Light' },
                                { value: 'Dark', label: t.dark || 'Dark' },
                                { value: 'Auto', label: t.auto || 'Auto' },
                            ]}
                            checkIconPosition="right"
                        />
                    ),
                },
                {
                    label: t.activeLanguage || 'Language',
                    node: (
                        <Select
                            w="100%"
                            value={localSettings.activeLanguage || 'English'}
                            onChange={(val) =>
                                updateField('activeLanguage', val)
                            }
                            data={[
                                {
                                    value: 'English',
                                    label: t.english || 'English',
                                },
                                {
                                    value: 'Spanish',
                                    label: t.spanish || 'Spanish',
                                },
                                { value: 'Greek', label: t.greek || 'Greek' },
                            ]}
                            checkIconPosition="right"
                        />
                    ),
                },
            ],
        },
    ];

    return (
        <Box h="100%" style={{ overflowY: 'auto' }}>
            <Container size="md" py="xl" pb={100}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!saving) saveSettings();
                    }}
                >
                    {categories.map((cat, index) => (
                        <Box key={cat.key} mb={50}>
                            <Title
                                order={5}
                                mb="lg"
                                fw={600}
                                c="dimmed"
                                tt="uppercase"
                                ls={1}
                            >
                                {cat.title}
                            </Title>

                            <Box pl={2}>
                                {cat.fields.map((f, i) => (
                                    <Field
                                        key={i}
                                        label={f.label}
                                        node={f.node}
                                        tooltip={f.tooltip}
                                    />
                                ))}
                            </Box>

                            {index !== categories.length - 1 && (
                                <Divider my="xl" variant="dashed" />
                            )}
                        </Box>
                    ))}

                    <Box mt={30}>
                        {error && (
                            <Alert
                                color="red"
                                title="Error"
                                mb="md"
                                variant="light"
                                withCloseButton
                                onClose={() => setError(null)}
                            >
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert
                                color="green"
                                title="Success"
                                mb="md"
                                variant="light"
                                withCloseButton
                                onClose={() => setSuccess(null)}
                            >
                                {success}
                            </Alert>
                        )}

                        <Group justify="flex-end" pt="lg">
                            <Button
                                variant="default"
                                onClick={() => setSettings(settings)}
                                disabled={saving}
                            >
                                {t.cancel || 'Cancel'}
                            </Button>

                            <Button
                                type="submit"
                                loading={saving}
                                px="xl"
                                disabled={!isModified || saving}
                            >
                                {saving
                                    ? t.saving || 'Saving...'
                                    : t.saveButton || 'Save Changes'}
                            </Button>
                        </Group>
                    </Box>
                </form>
            </Container>
        </Box>
    );
}
