import React, { useState, useEffect } from 'react';

export default function Settings({ settings, setSettings, t, isDark }) {
    const [localSettings, setLocalSettings] = useState(null);
    const [interfaces, setInterfaces] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Load settings copy on prop change
    useEffect(() => {
        if (settings) {
            setLocalSettings({ ...settings });
            setError(null);
            setSuccess(null);
        }
    }, [settings]);

    // Fetch interfaces once
    useEffect(() => {
        fetch('http://localhost:8080/api/interfaces')
            .then((res) => res.json())
            .then(setInterfaces)
            .catch(() => setInterfaces([]));
    }, []);

    if (!localSettings) {
        return (
            <div
                style={{
                    height: '100vh',
                    color: isDark ? '#fafafa' : '#222',
                    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                    backgroundColor: isDark ? '#171C22' : '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: 18,
                }}
            >
                {t.loading || 'Loading...'}
            </div>
        );
    }

    const colorText = isDark ? '#fafafa' : '#222';
    const colorBorder = isDark ? '#444' : '#DDD';
    const colorInputBg = isDark ? '#222' : '#fafafa';
    const colorInputBorder = isDark ? '#616569' : '#ccc';
    const colorPlaceholder = isDark ? '#888' : '#999';
    const colorLabel = isDark ? '#BEBFC1' : '#20232A';
    const colorButtonBorder = isDark ? '#fafafa' : '#20232A';
    const colorButtonText = isDark ? '#fafafa' : '#20232A';
    const colorHover = isDark ? '#fff' : '#4A4D53';

    const updateField = (field, value) => {
        setLocalSettings((prev) => ({ ...prev, [field]: value }));
        setError(null);
        setSuccess(null);
    };

    const saveSettings = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await fetch('http://localhost:8080/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localSettings),
            });
            if (!response.ok)
                throw new Error(`Server error: ${response.status}`);
            const updated = await response.json();
            setSettings(updated);
            setSuccess(t.settingsSaved || 'Settings saved successfully!');
        } catch (e) {
            setError(t.saveError || 'Failed to save settings.');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    // Styles for inputs and labels
    const pageStyle = {
        minHeight: '100vh',
        backgroundColor: isDark ? '#171C22' : '#FFFFFF',
        color: colorText,
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        padding: '24px 24px 80px 24px', // bottom padding for save button
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
    };

    const formStyle = {
        width: '100%',
        maxWidth: 460,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
    };

    const labelStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 600,
        fontSize: 14,
        color: colorLabel,
        userSelect: 'none',
        cursor: 'default',
    };

    const inputStyle = {
        borderRadius: 10,
        border: `1.5px solid ${colorInputBorder}`,
        padding: '10px 14px',
        fontSize: 16,
        backgroundColor: colorInputBg,
        color: colorText,
        outlineOffset: 1,
        width: '100%',
        boxSizing: 'border-box',
        transition: 'border-color 0.3s ease',
    };

    const inputFocusStyle = {
        borderColor: colorHover,
    };

    const selectStyle = {
        ...inputStyle,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='${
            isDark ? '%23fafafa' : '%23202232'
        }' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        backgroundSize: '16px 16px',
        cursor: 'pointer',
    };

    // Checkbox with label text left, checkbox right side
    const checkboxContainerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 10,
        border: `1.5px solid ${colorInputBorder}`,
        padding: '10px 16px',
        cursor: 'pointer',
        backgroundColor: colorInputBg,
        transition: 'border-color 0.3s ease',
        userSelect: 'none',
    };

    const checkboxLabelStyle = {
        fontWeight: 600,
        fontSize: 14,
        color: colorText,
    };

    const checkboxStyle = {
        width: 24,
        height: 24,
        cursor: 'pointer',
        accentColor: colorHover,
    };

    const saveButtonStyle = {
        position: 'fixed',
        bottom: 24,
        right: 24,
        padding: '10px 20px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        border: `1.5px solid ${colorButtonBorder}`,
        backgroundColor: saving ? (isDark ? '#444' : '#eee') : 'transparent',
        color: colorButtonText,
        cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.3s ease',
        userSelect: 'none',
        zIndex: 10,
        boxShadow: saving ? 'none' : `0 0 8px ${colorHover}`,
    };

    // Controlled input to handle focus styles
    const ControlledInput = ({
        id,
        type = 'text',
        value,
        onChange,
        placeholder,
        title,
        min,
        max,
    }) => {
        const [focused, setFocused] = useState(false);
        return (
            <>
                <label htmlFor={id} style={labelStyle} title={title}>
                    {t[id] || id}
                </label>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    style={{
                        ...inputStyle,
                        ...(focused ? inputFocusStyle : {}),
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </>
        );
    };

    const ControlledSelect = ({ id, value, onChange, options, title }) => {
        const [focused, setFocused] = useState(false);
        return (
            <>
                <label htmlFor={id} style={labelStyle} title={title}>
                    {t[id] || id}
                </label>
                <select
                    id={id}
                    value={value}
                    onChange={onChange}
                    style={{
                        ...selectStyle,
                        ...(focused ? inputFocusStyle : {}),
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                >
                    {options.map(({ value, label }) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </>
        );
    };

    return (
        <main style={pageStyle} aria-label={t.pages?.settings || 'Settings'}>
            <form
                style={formStyle}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!saving) saveSettings();
                }}
            >
                <ControlledInput
                    id="tracerouteTimeout"
                    type="number"
                    value={localSettings.timeout ?? ''}
                    onChange={(e) =>
                        updateField(
                            'tracerouteTimeout',
                            Math.min(
                                255,
                                Math.max(0, Number(e.target.value) || 0),
                            ),
                        )
                    }
                    title="Timeout in seconds"
                />

                {/* Boolean toggles placed in box with right-side checkbox */}
                {[
                    {
                        id: 'animationToggle',
                        label: t.animationToggle || 'Animation Toggle',
                    },
                    {
                        id: 'verboseLogging',
                        label: t.verboseLogging || 'Verbose Logging',
                    },
                ].map(({ id, label }) => (
                    <label
                        key={id}
                        style={checkboxContainerStyle}
                        title={label}
                    >
                        <span
                            style={{
                                color: colorText,
                                fontWeight: 600,
                                fontSize: 14,
                            }}
                        >
                            {label}
                        </span>
                        <input
                            type="checkbox"
                            checked={!!localSettings[id]}
                            onChange={(e) => updateField(id, e.target.checked)}
                            style={checkboxStyle}
                        />
                    </label>
                ))}

                <ControlledInput
                    id="logPath"
                    value={localSettings.logPath ?? ''}
                    onChange={(e) => updateField('logPath', e.target.value)}
                    placeholder={t.logPathPlaceholder || 'Enter log file path'}
                    title="Log file path"
                />

                <ControlledSelect
                    id="interfaceOption"
                    value={localSettings.interfaceOption || 'Auto'}
                    onChange={(e) =>
                        updateField('interfaceOption', e.target.value)
                    }
                    options={[
                        { value: 'Auto', label: t.auto || 'Auto' },
                        ...interfaces.map((iface) => ({
                            value: iface.name,
                            label: iface.name,
                        })),
                    ]}
                    title="Select interface"
                />

                <ControlledInput
                    id="ipFilter"
                    value={localSettings.filter ?? ''}
                    onChange={(e) => updateField('ipFilter', e.target.value)}
                    placeholder={t.ipFilterPlaceholder || 'Enter IP filter'}
                    title="IP filter"
                />

                <ControlledSelect
                    id="lookupMode"
                    value={localSettings.lookupMode || 'Auto'}
                    onChange={(e) => updateField('lookupMode', e.target.value)}
                    options={[
                        { value: 'Auto', label: t.auto || 'Auto' },
                        { value: 'API', label: t.api || 'API' },
                        { value: 'DB', label: t.db || 'DB' },
                    ]}
                    title="Lookup mode"
                />

                <ControlledSelect
                    id="activeLanguage"
                    value={localSettings.activeLanguage || 'English'}
                    onChange={(e) =>
                        updateField('activeLanguage', e.target.value)
                    }
                    options={[
                        { value: 'English', label: t.english || 'English' },
                        { value: 'Spanish', label: t.spanish || 'Spanish' },
                        { value: 'Greek', label: t.greek || 'Greek' },
                    ]}
                    title="Language"
                />

                <ControlledSelect
                    id="theme"
                    value={localSettings.theme || 'Auto'}
                    onChange={(e) => updateField('theme', e.target.value)}
                    options={[
                        { value: 'Light', label: t.light || 'Light' },
                        { value: 'Dark', label: t.dark || 'Dark' },
                        { value: 'Auto', label: t.auto || 'Auto' },
                    ]}
                    title="Theme"
                />

                <ControlledInput
                    id="maxHops"
                    type="number"
                    value={localSettings.maxHops ?? ''}
                    onChange={(e) =>
                        updateField(
                            'maxHops',
                            Math.min(
                                255,
                                Math.max(0, Number(e.target.value) || 0),
                            ),
                        )
                    }
                    title="Max hops"
                />

                <ControlledInput
                    id="WebsocketPort"
                    type="number"
                    value={localSettings.WebsocketPort ?? ''}
                    onChange={(e) =>
                        updateField(
                            'WebsocketPort',
                            Math.min(
                                65535,
                                Math.max(0, Number(e.target.value) || 0),
                            ),
                        )
                    }
                    title="WebSocket port"
                />

                {error && (
                    <div
                        role="alert"
                        style={{
                            color: '#d14343',
                            marginBottom: 12,
                            fontWeight: '600',
                            fontSize: 14,
                        }}
                    >
                        {error}
                    </div>
                )}
                {success && (
                    <div
                        role="status"
                        style={{
                            color: '#3bb974',
                            marginBottom: 12,
                            fontWeight: '600',
                            fontSize: 14,
                        }}
                    >
                        {success}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    style={saveButtonStyle}
                    onMouseEnter={(e) => {
                        if (!saving)
                            e.currentTarget.style.backgroundColor = colorHover;
                    }}
                    onMouseLeave={(e) => {
                        if (!saving)
                            e.currentTarget.style.backgroundColor =
                                'transparent';
                    }}
                    aria-label={t.saveButton || 'Save Settings'}
                >
                    {saving ? t.saving || 'Saving...' : t.saveButton || 'Save'}
                </button>
            </form>
        </main>
    );
}
