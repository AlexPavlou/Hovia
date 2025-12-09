import { useState, useEffect } from 'react';

export function useDimensions(containerRef: React.RefObject<HTMLElement>) {
    const [dimensions, setDimensions] = useState({ width: 800, height: 800 });

    useEffect(() => {
        function updateSize() {
            if (containerRef.current) {
                const { width, height } =
                    containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        }
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [containerRef]);

    return dimensions;
}
