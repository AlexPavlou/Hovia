import React, { useState, useCallback, useMemo } from 'react';

interface IconButtonProps {
    icon: React.ReactNode;
    darkThemeEnabled: boolean;
    isActive: boolean;
    label?: string;
    onClick: () => void;
}

// Memoized to avoid unnecessary re-renders when parent re-renders
const IconButton = React.memo(function IconButton({
    icon,
    darkThemeEnabled,
    isActive,
    label,
    onClick,
}: IconButtonProps) {
    const [isHover, setIsHover] = useState(false);

    const handleMouseEnter = useCallback(() => setIsHover(true), []);
    const handleMouseLeave = useCallback(() => setIsHover(false), []);

    const color = useMemo(() => {
        if (darkThemeEnabled)
            return isActive || isHover ? '#FFFFFF' : '#616569';
        return isActive ? '#20232A' : isHover ? '#4A4D53' : '#A0A3A8';
    }, [darkThemeEnabled, isActive, isHover]);

    const style: React.CSSProperties = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color,
        padding: 6,
        borderRadius: 8,
        transition: 'color 0.3s ease, transform 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isHover ? 'scale(1.1)' : 'scale(1)',
    };

    return (
        <button
            aria-label={label}
            type="button"
            style={style}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {icon}
        </button>
    );
});

export default IconButton;
