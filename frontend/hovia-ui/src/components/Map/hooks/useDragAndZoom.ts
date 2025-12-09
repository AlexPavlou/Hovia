import { useEffect } from 'react';
import * as d3 from 'd3';

export function useDragAndZoom(
    canvasRef: React.RefObject<HTMLCanvasElement>,
    dragRef: React.MutableRefObject<any>,
    isDraggingRef: React.MutableRefObject<boolean>,
    setTooltip: React.Dispatch<any>,
    stateRef: React.MutableRefObject<any>,
) {
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvasEl = canvasRef.current;
        const selection = d3.select(canvasEl);

        const sensitivityX = 0.25;
        const sensitivityY = 0.2;
        const FRICTION = 0.96;
        const MIN_VEL = 0.001;

        function pointerDown(e: PointerEvent) {
            e.preventDefault();
            canvasEl.setPointerCapture?.(e.pointerId);
            dragRef.current = {
                active: true,
                lastX: e.clientX,
                lastY: e.clientY,
                velocityX: 0,
                velocityY: 0,
            };
            isDraggingRef.current = true;
            stateRef.current.hoveredMarker = null;
            setTooltip((t: any) => ({ ...t, visible: false }));
            canvasEl.style.cursor = 'grabbing';
        }

        function pointerMove(e: PointerEvent) {
            if (!dragRef.current || !dragRef.current.active) return;
            e.preventDefault();

            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;

            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;

            // Update ref directly
            const [lambda, phi] = stateRef.current.rotation;
            const nl = lambda + dx * sensitivityX;
            let np = phi - dy * sensitivityY;
            np = Math.max(-90, Math.min(90, np));
            stateRef.current.rotation = [nl, np];

            dragRef.current.velocityX = dx * sensitivityX;
            dragRef.current.velocityY = dy * sensitivityY;
        }

        function pointerUp(e: PointerEvent) {
            try {
                canvasEl.releasePointerCapture?.(e.pointerId);
            } catch {}
            dragRef.current.active = false;
            isDraggingRef.current = false;
            stateRef.current.hoveredMarker = null;
            setTooltip((t: any) => ({ ...t, visible: false }));
            canvasEl.style.cursor = 'grab';
        }

        canvasEl.addEventListener('pointerdown', pointerDown);
        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);
        window.addEventListener('pointercancel', pointerUp);

        const zoomBehavior = d3
            .zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([0.3, 6])
            .filter((event) => event.type === 'wheel')
            .on('zoom', (event) => {
                setTooltip((t: any) => ({ ...t, visible: false }));
                isDraggingRef.current = true;

                // Update scale ref directly
                stateRef.current.scale = event.transform.k;

                clearTimeout((canvasEl as any).__wheelTimeout);
                (canvasEl as any).__wheelTimeout = setTimeout(() => {
                    isDraggingRef.current = false;
                }, 200);
            });

        selection.call(zoomBehavior);

        let rafId: number | null = null;

        function momentumLoop() {
            if (dragRef.current.active || isDraggingRef.current) {
                rafId = requestAnimationFrame(momentumLoop);
                return;
            }

            dragRef.current.velocityX *= FRICTION;
            dragRef.current.velocityY *= FRICTION;

            if (
                Math.abs(dragRef.current.velocityX) < MIN_VEL &&
                Math.abs(dragRef.current.velocityY) < MIN_VEL
            ) {
                dragRef.current.velocityX = 0;
                dragRef.current.velocityY = 0;
                rafId = null;
                return;
            }

            const [lambda, phi] = stateRef.current.rotation;
            const nl = lambda + dragRef.current.velocityX;
            let np = phi - dragRef.current.velocityY;
            np = Math.max(-90, Math.min(90, np));
            stateRef.current.rotation = [nl, np];

            rafId = requestAnimationFrame(momentumLoop);
        }

        momentumLoop();

        return () => {
            canvasEl.removeEventListener('pointerdown', pointerDown);
            window.removeEventListener('pointermove', pointerMove);
            window.removeEventListener('pointerup', pointerUp);
            window.removeEventListener('pointercancel', pointerUp);
            selection.on('.zoom', null);
            if ((canvasEl as any).__wheelTimeout)
                clearTimeout((canvasEl as any).__wheelTimeout);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [canvasRef, dragRef, isDraggingRef, setTooltip, stateRef]);
}
