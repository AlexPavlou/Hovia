import React from 'react';

interface IconButtonProps {
    icon: React.ReactNode;
    isActive: boolean;
    label?: string;
    onClick: () => void;
}

const IconButton = React.memo(function IconButton({
    icon,
    isActive,
    label,
    onClick,
}: IconButtonProps) {
    return (
        <button
            aria-label={label}
            type="button"
            onClick={onClick}
            className={`
                p-1.5 rounded cursor-pointer transition-transform duration-300 ease-in-out transform
                ${
                    isActive
                        ? 'text-[var(--color-icon-active)]'
                        : 'text-[var(--color-icon-default)] hover:text-[var(--color-icon-hover)]'
                }
            `}
        >
            {icon}
        </button>
    );
});

export default IconButton;
