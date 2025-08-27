import { useEffect, useRef } from 'react';

export function useRotationAnimation(
    animationToggle: boolean,
    dragRef: React.MutableRefObject<any>,
    setRotation: React.Dispatch<React.SetStateAction<[number, number]>>,
) {
    useEffect(() => {
        if (!animationToggle) return;
        const friction = 0.93;
        let animationFrame: number;

        const momentumStep = () => {
            if (dragRef.current.active) {
                animationFrame = requestAnimationFrame(momentumStep);
                return;
            }

            let velocityX = dragRef.current.velocityX;
            if (Math.abs(velocityX) > 0.001) {
                setRotation(([lambda, phi]) => {
                    let nl = (lambda + velocityX) % 360;
                    return [nl, phi];
                });
                dragRef.current.velocityX *= friction;
                animationFrame = requestAnimationFrame(momentumStep);
            } else {
                dragRef.current.velocityX = 0;
            }
        };

        animationFrame = requestAnimationFrame(momentumStep);
        return () => cancelAnimationFrame(animationFrame);
    }, [animationToggle, dragRef, setRotation]);
}
