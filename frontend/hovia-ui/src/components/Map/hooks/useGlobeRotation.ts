import { useRef, useEffect } from 'react';

const ROTATION_SPEED = 0.005;

export default function useGlobeRotation(
    animationToggle?: boolean,
    dragRef?: React.MutableRefObject<any>,
    stateRef?: React.MutableRefObject<any>,
) {
    const animationFrameId = useRef<number>();

    useEffect(() => {
        if (!stateRef) return;

        const animate = () => {
            if (dragRef?.current?.active) {
                // If dragging, let useDragAndZoom handle updates
            } else if (animationToggle) {
                const { rotation } = stateRef.current;
                // Add gentle rotation
                stateRef.current.rotation = [
                    (rotation[0] + ROTATION_SPEED) % 360,
                    rotation[1],
                ];
            }

            animationFrameId.current = requestAnimationFrame(animate);
        };

        if (animationToggle) {
            animationFrameId.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameId.current)
                cancelAnimationFrame(animationFrameId.current);
        };
    }, [animationToggle, dragRef, stateRef]);
}
