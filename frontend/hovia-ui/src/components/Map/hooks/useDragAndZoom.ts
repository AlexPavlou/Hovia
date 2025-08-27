// hook to enable drag, zoom and momentum for the globe
import { useEffect } from 'react';
import * as d3 from 'd3';

export function useDragAndZoom(
    svgRef: React.RefObject<SVGSVGElement>,
    dragRef: React.MutableRefObject<any>,
    isDraggingRef: React.MutableRefObject<boolean>,
    setTooltip: React.Dispatch<any>,
    setRotation: React.Dispatch<React.SetStateAction<[number, number]>>,
    setScale: React.Dispatch<React.SetStateAction<number>>,
    hoveredMarkerRef: React.MutableRefObject<string | null>,
) {
    useEffect(() => {
        if (!svgRef.current) return;
        const svgEl = svgRef.current;
        const svg = d3.select(svgEl);

        // Drag sensitivity + momentum constants
        const sensitivityX = 0.15;
        const sensitivityY = 0.11;
        const FRICTION = 0.96;
        const MIN_VEL = 0.001;

        function pointerDown(e: PointerEvent) {
            e.preventDefault();
            (e.target as Element).setPointerCapture?.(e.pointerId);
            dragRef.current = {
                active: true,
                lastX: e.clientX,
                lastY: e.clientY,
                velocityX: 0,
                velocityY: 0,
            };
            isDraggingRef.current = true;
            hoveredMarkerRef.current = null;
            setTooltip((t: any) => ({ ...t, visible: false }));
        }

        function pointerMove(e: PointerEvent) {
            if (!dragRef.current || !dragRef.current.active) return;
            e.preventDefault();

            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;

            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;

            setRotation(([lambda, phi]) => {
                const nl = lambda + dx * sensitivityX;
                let np = phi - dy * sensitivityY;
                np = Math.max(-90, Math.min(90, np));
                return [nl, np];
            });

            dragRef.current.velocityX = dx * sensitivityX;
            dragRef.current.velocityY = dy * sensitivityY;
        }

        function pointerUp(e: PointerEvent) {
            try {
                (e.target as Element).releasePointerCapture?.(e.pointerId);
            } catch {}
            dragRef.current.active = false;
            isDraggingRef.current = false;
            hoveredMarkerRef.current = null;
            setTooltip((t: any) => ({ ...t, visible: false }));
        }

        function checkHoveredMarker(e: PointerEvent) {
            const currentId = hoveredMarkerRef?.current;
            if (!currentId) return;
            const el = document.elementFromPoint(
                e.clientX,
                e.clientY,
            ) as HTMLElement | null;
            const hitId =
                el
                    ?.closest('[data-marker-id]')
                    ?.getAttribute('data-marker-id') || null;
            if (hitId !== currentId) {
                hoveredMarkerRef.current = null;
                setTooltip((t: any) => ({ ...t, visible: false }));
            }
        }

        svgEl.addEventListener('pointerdown', pointerDown);
        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);
        window.addEventListener('pointercancel', pointerUp);
        window.addEventListener('pointermove', checkHoveredMarker);

        const zoomBehavior = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 6])
            .filter((event) => event.type === 'wheel')
            .on('zoom', (event) => {
                setTooltip((t: any) => ({ ...t, visible: false }));
                isDraggingRef.current = true;
                setScale(event.transform.k);
                clearTimeout((svgEl as any).__wheelTimeout);
                (svgEl as any).__wheelTimeout = setTimeout(() => {
                    isDraggingRef.current = false;
                }, 200);
            });

        svg.call(zoomBehavior);

        let rafId: number | null = null;

        // apply momentum / inertia after drag release
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

            setRotation(([lambda, phi]) => {
                const nl = lambda + dragRef.current.velocityX;
                let np = phi - dragRef.current.velocityY;
                np = Math.max(-90, Math.min(90, np));
                return [nl, np];
            });

            rafId = requestAnimationFrame(momentumLoop);
        }

        momentumLoop();

        return () => {
            svgEl.removeEventListener('pointerdown', pointerDown);
            window.removeEventListener('pointermove', pointerMove);
            window.removeEventListener('pointerup', pointerUp);
            window.removeEventListener('pointermove', checkHoveredMarker);
            window.removeEventListener('pointercancel', pointerUp);
            svg.on('.zoom', null);
            if ((svgEl as any).__wheelTimeout)
                clearTimeout((svgEl as any).__wheelTimeout);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [svgRef, dragRef, isDraggingRef, setTooltip, setRotation, setScale]);
}
