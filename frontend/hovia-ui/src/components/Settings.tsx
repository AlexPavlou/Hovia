import React, { useState, useEffect, useRef } from 'react';

interface SettingsProps {
    settings: any;
    setSettings: (s: any) => void;
    t: any;
}

export default function Settings({ settings, setSettings, t }: SettingsProps) {
    const [localSettings, setLocalSettings] = useState<any>(null);
    const [interfaces, setInterfaces] = useState<{ name: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
        general: useRef(null),
        network: useRef(null),
        advanced: useRef(null),
        misc: useRef(null),
    };

    // Load initial settings
    useEffect(() => {
        if (settings) setLocalSettings({ ...settings });
    }, [settings]);

    // Load network interfaces
    useEffect(() => {
        fetch('/api/interfaces')
            .then(async (res) => {
                const data = await res.json();
                setInterfaces(data.filter((i) => i.name?.trim()));
            })
            .catch(() => setInterfaces([]));
    }, []);

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
            <div className="flex items-center justify-center h-screen text-white bg-[#222]">
                {t.loading || 'Loading...'}
            </div>
        );
    }

    const scrollTo = (key: string) => {
        refs[key].current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    // --- FIELD COMPONENT WITH TOOLTIP ---
    const Field = ({
        label,
        valueNode,
        tooltip,
    }: {
        label: string;
        valueNode: React.ReactNode;
        tooltip?: string;
    }) => (
        <div className="flex items-center justify-between mb-4 w-full">
            <div className="flex items-center space-x-2 w-1/3 text-sm font-medium">
                {label}
                {tooltip && (
                    <div
                        className="relative group"
                        style={{ paddingLeft: '0.5rem' }}
                    >
                        <div className="w-5 h-5 rounded-full bg-[#444] flex items-center justify-center text-xs text-white cursor-pointer">
                            ?
                        </div>
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#333] text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg z-50">
                            {tooltip}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex-grow">{valueNode}</div>
        </div>
    );

    const inputClass =
        'input input-sm input-bordered w-full max-w-[200px] bg-[#333] text-white border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all';
    const selectClass =
        'select select-sm select-bordered w-full max-w-[200px] bg-[#333] text-white border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all';
    const toggleClass = 'toggle toggle-sm toggle-primary';

    const categories = [
        {
            key: 'general',
            title: t.general || 'General',
            fields: [
                {
                    label: t.tracerouteTimeout || 'Traceroute Timeout',
                    node: (
                        <input
                            type="number"
                            min={0}
                            max={255}
                            value={localSettings.timeout ?? ''}
                            onChange={(e) =>
                                updateField(
                                    'timeout',
                                    Math.min(
                                        255,
                                        Math.max(
                                            0,
                                            Number(e.target.value) || 0,
                                        ),
                                    ),
                                )
                            }
                            placeholder="0-255 ms"
                            className={inputClass}
                        />
                    ),
                    tooltip:
                        t.tracerouteTimeoutInfo ||
                        'Timeout in seconds for traceroute requests (default: 1s)',
                },
                {
                    label: t.animationToggle || 'Animation Toggle',
                    node: (
                        <input
                            type="checkbox"
                            checked={!!localSettings.animationToggle}
                            onChange={(e) =>
                                updateField('animationToggle', e.target.checked)
                            }
                            className={toggleClass}
                        />
                    ),
                    tooltip:
                        t.animationToggleInfo ||
                        'Enable or disable animations (default: On)',
                },
                {
                    label: t.verboseLogging || 'Verbose Logging',
                    node: (
                        <input
                            type="checkbox"
                            checked={!!localSettings.hasVerbose}
                            onChange={(e) =>
                                updateField('hasVerbose', e.target.checked)
                            }
                            className={toggleClass}
                        />
                    ),
                    tooltip:
                        t.verboseLoggingInfo ||
                        'Enable or disable verbose logging (default: Off)',
                },
                {
                    label: t.logPath || 'Log Path',
                    node: (
                        <input
                            type="text"
                            value={localSettings.logPath ?? ''}
                            onChange={(e) =>
                                updateField('logPath', e.target.value)
                            }
                            placeholder={
                                t.logPathPlaceholder ||
                                'Enter log file path (default: app.log)'
                            }
                            className={inputClass}
                        />
                    ),
                    tooltip: t.logPathInfo || 'File path for logs',
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
                        <select
                            value={localSettings.interfaceOption || 'Auto'}
                            onChange={(e) =>
                                updateField('interfaceOption', e.target.value)
                            }
                            className={selectClass}
                        >
                            <option value="Auto">{t.auto || 'Auto'}</option>
                            {interfaces.map(({ name }) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    ),
                    tooltip:
                        t.interfaceOptionInfo ||
                        'Set default network interface for packet capture (default: Auto)',
                },
                {
                    label: t.ipFilter || 'IP Filter',
                    node: (
                        <input
                            type="text"
                            value={localSettings.ipFilter ?? ''}
                            onChange={(e) =>
                                updateField('ipFilter', e.target.value)
                            }
                            placeholder={
                                t.ipFilterPlaceholder || 'Enter IP filter'
                            }
                            className={inputClass}
                        />
                    ),
                    tooltip: t.ipFilterInfo || 'IP packet filter',
                },
                {
                    label: t.lookupMode || 'Lookup Mode',
                    node: (
                        <select
                            value={localSettings.lookupMode || 'Auto'}
                            onChange={(e) =>
                                updateField('lookupMode', e.target.value)
                            }
                            className={selectClass}
                        >
                            <option value="Auto">{t.auto || 'Auto'}</option>
                            <option value="API">{t.api || 'API'}</option>
                            <option value="DB">{t.db || 'DB'}</option>
                        </select>
                    ),
                    tooltip: t.lookupModeInfo || 'Select method for IP lookups',
                },
                {
                    label: t.WebsocketPort || 'WebSocket Port',
                    node: (
                        <input
                            type="number"
                            min={0}
                            max={65535}
                            value={localSettings.websocketPort ?? ''}
                            onChange={(e) =>
                                updateField(
                                    'websocketPort',
                                    Math.min(
                                        65535,
                                        Math.max(
                                            0,
                                            Number(e.target.value) || 0,
                                        ),
                                    ),
                                )
                            }
                            placeholder="0-65535"
                            className={inputClass}
                        />
                    ),
                    tooltip:
                        t.WebsocketPortInfo ||
                        'Port used for WebSocket connections (default: 9002)',
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
                        <input
                            type="number"
                            min={0}
                            max={255}
                            value={localSettings.maxHops ?? ''}
                            onChange={(e) =>
                                updateField(
                                    'maxHops',
                                    Math.min(
                                        255,
                                        Math.max(
                                            0,
                                            Number(e.target.value) || 0,
                                        ),
                                    ),
                                )
                            }
                            placeholder="0-255"
                            className={inputClass}
                        />
                    ),
                    tooltip: t.maxHopsInfo || 'Maximum hops for traceroute',
                },
                {
                    label: t.theme || 'Theme',
                    node: (
                        <select
                            value={localSettings.theme || 'Auto'}
                            onChange={(e) =>
                                updateField('theme', e.target.value)
                            }
                            className={selectClass}
                        >
                            <option value="Light">{t.light || 'Light'}</option>
                            <option value="Dark">{t.dark || 'Dark'}</option>
                            <option value="Auto">{t.auto || 'Auto'}</option>
                        </select>
                    ),
                },
                {
                    label: t.activeLanguage || 'Language',
                    node: (
                        <select
                            value={localSettings.activeLanguage || 'English'}
                            onChange={(e) =>
                                updateField('activeLanguage', e.target.value)
                            }
                            className={selectClass}
                        >
                            <option value="English">
                                {t.english || 'English'}
                            </option>
                            <option value="Spanish">
                                {t.spanish || 'Spanish'}
                            </option>
                            <option value="Greek">{t.greek || 'Greek'}</option>
                        </select>
                    ),
                },
            ],
        },
    ];

    return (
        <main className="bg-[#222] text-white min-h-screen p-6 font-sans overflow-y-auto">
            {/* Top Tabs */}
            <div className="flex gap-4 mb-6 sticky top-0 z-20 bg-[#222] px-4 py-2 border-b border-[#444]">
                {categories.map((cat) => (
                    <button
                        key={cat.key}
                        type="button"
                        className="btn btn-sm btn-outline btn-primary transition-all hover:scale-105"
                        onClick={() => scrollTo(cat.key)}
                    >
                        {cat.title}
                    </button>
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!saving) saveSettings();
                }}
                className="space-y-6"
            >
                {categories.map((cat) => (
                    <section key={cat.key} ref={refs[cat.key]}>
                        <h2 className="text-lg font-semibold mb-4 border-b border-gray-600 pb-1">
                            {cat.title}
                        </h2>
                        {cat.fields.map((f, i) => (
                            <Field
                                key={i}
                                label={f.label}
                                valueNode={f.node}
                                tooltip={f.tooltip}
                            />
                        ))}
                    </section>
                ))}

                {(error || success) && (
                    <div className="text-center mb-4">
                        <span
                            className={`font-semibold ${error ? 'text-error' : 'text-success'}`}
                        >
                            {error || success}
                        </span>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className={`btn btn-soft btn-primary ${saving ? 'loading' : ''}`}
                        disabled={saving}
                    >
                        {saving
                            ? t.saving || 'Saving...'
                            : t.saveButton || 'Save'}
                    </button>
                </div>
            </form>
        </main>
    );
}
