import { useState, useRef, useEffect } from 'react';

export default function useGlobeRotation(
    userLocation?: { lat: number; lon: number },
    animationToggle?: boolean,
    dragRef?: React.MutableRefObject<any>,
    setRotation?: React.Dispatch<React.SetStateAction<[number, number]>>,
) {
    const animationFrameId = useRef<number>();
    const friction = 0.93;

    useEffect(() => {
        if (!setRotation) return;

        const animate = () => {
            setRotation((cur) => {
                // If user is actively dragging, do not change rotation here
                if (dragRef?.current?.active) {
                    return cur;
                }
                // Apply inertia/momentum after drag ends
                if (
                    animationToggle &&
                    dragRef?.current &&
                    !dragRef.current.active
                ) {
                    let velocityX = dragRef.current.velocityX;
                    if (Math.abs(velocityX) > 0.001) {
                        dragRef.current.velocityX *= friction;
                        return [(cur[0] + velocityX) % 360, cur[1]];
                    } else {
                        dragRef.current.velocityX = 0;
                    }
                }
                // Continuous gentle rotation when idle
                return [(cur[0] + 0.02) % 360, cur[1]];
            });

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId.current!);
    }, [animationToggle, dragRef, setRotation]);
}
