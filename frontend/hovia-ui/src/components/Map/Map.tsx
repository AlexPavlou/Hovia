import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useDimensions } from './hooks/useDimensions';
import { useWorldData } from './hooks/useWorldData';
import { useUserLocation } from './hooks/useUserLocation';
import { useHopLocations } from './hooks/useHopLocations';
import useGlobeRotation from './hooks/useGlobeRotation';
import { useDragAndZoom } from './hooks/useDragAndZoom';
import * as d3 from 'd3';
import { geoGraticule, geoDistance } from 'd3-geo';

export default React.memo(function Map(props: any) {
    const {
        traceResults,
        darkThemeEnabled,
        userLocationOverride,
        animationToggle,
        t,
    } = props;

    // memoize colours to reduce re-calculations
    const colors = useMemo(
        () => ({
            oceanFill: 'var(--color-ocean-fill)',
            countryFill: 'var(--color-country-fill)',
            countryStroke: 'var(--color-country-stroke)',
            arcStroke: 'var(--color-arc-stroke)',
            graticuleStroke: 'var(--color-graticule-stroke)',
            markerStroke: 'var(--color-marker-stroke)',
            tooltipBg: 'var(--mantine-color-default)',
            tooltipColor: 'var(--mantine-color-text)',
            tooltipBorder: 'var(--mantine-color-default-border)',
            dottedPatternFill: 'var(--color-dotted-pattern-fill)',
            auroraInner: 'var(--color-aurora-inner)',
            auroraOuter: 'var(--color-aurora-outer)',
            bg: 'var(--color-bg)',
        }),
        [t],
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Save core state in ref
    const stateRef = useRef({
        rotation: [0, -23.4] as [number, number],
        scale: 0.8,
        hoveredMarker: null as string | null,
    });

    const isDraggingRef = useRef(false);
    const dragRef = useRef({
        active: false,
        lastX: 0,
        lastY: 0,
        velocityX: 0,
        velocityY: 0,
    });

    const userLocation = useUserLocation(userLocationOverride);

    const [tooltip, setTooltip] = useState({
        visible: false,
        x: 0,
        y: 0,
        content: '',
    });

    // hooks
    useGlobeRotation(animationToggle, dragRef, stateRef);
    useDragAndZoom(canvasRef, dragRef, isDraggingRef, setTooltip, stateRef);

    const dimensions = useDimensions(containerRef);
    const worldData = useWorldData();
    const hopLocations = useHopLocations(traceResults);
    const minDimension = Math.min(dimensions.width, dimensions.height);

    // marker data
    const userMarker = useMemo(
        () =>
            userLocation
                ? {
                      lat: userLocation.lat,
                      lon: userLocation.lon,
                      color: darkThemeEnabled ? '#76ff03' : '#228b22',
                      size: 5,
                      label: t.map.homeLabel,
                      id: 'home',
                  }
                : null,
        [userLocation, darkThemeEnabled, t],
    );

    const hopMarkers = useMemo(() => {
        const markers: Array<any> = [];
        traceResults.forEach((trace: any, i: number) => {
            if (Array.isArray(trace.hops)) {
                trace.hops.forEach((hop: any, idx: number) => {
                    const loc = hopLocations[hop.hopIP];
                    if (loc) {
                        markers.push({
                            lat: loc.latitude,
                            lon: loc.longitude,
                            color: darkThemeEnabled ? '#2196f3' : '#1565c0',
                            size: 4,
                            label: `${t.map.hopIP}: ${hop.hopIP}\n${t.map.latency}: ${hop.latency} ms`,
                            id: `hop-${i}-${idx}`,
                        });
                    }
                });
            }
        });
        return markers;
    }, [traceResults, hopLocations, darkThemeEnabled, t]);

    const destMarkers = useMemo(() => {
        const markers: Array<any> = [];
        traceResults.forEach((trace: any, i: number) => {
            const d = trace.dest_info;
            if (
                d &&
                typeof d.latitude === 'number' &&
                typeof d.longitude === 'number' &&
                (d.latitude !== 0 || d.longitude !== 0)
            ) {
                markers.push({
                    lat: d.latitude,
                    lon: d.longitude,
                    color: darkThemeEnabled ? '#ff7043' : '#e64a19',
                    size: 5,
                    label: `${t.map.destinationIP}: ${d.ip}\n${t.map.country}: ${d.country}\n${t.map.region}: ${d.region}\n${t.map.isp}: ${d.isp}`,
                    id: `dest-${i}`,
                });
            }
        });
        return markers;
    }, [traceResults, darkThemeEnabled, t]);

    const allMarkers = useMemo(
        () => [
            ...hopMarkers,
            ...destMarkers,
            ...(userMarker ? [userMarker] : []),
        ],
        [hopMarkers, destMarkers, userMarker],
    );

    // Arcs/Paths generation
    const routePaths = useMemo(() => {
        const paths: Array<{ type: string; coords: Array<[number, number]> }> =
            [];
        traceResults.forEach((trace: any) => {
            const coords: Array<{ lat: number; lon: number }> = [];
            if (userLocation?.lat !== undefined) {
                coords.push({ lat: userLocation.lat, lon: userLocation.lon });
            }
            if (Array.isArray(trace.hops)) {
                trace.hops.forEach((hop: any) => {
                    const loc = hopLocations[hop.hopIP];
                    if (loc)
                        coords.push({ lat: loc.latitude, lon: loc.longitude });
                });
            }
            if (trace.dest_info?.latitude && trace.dest_info?.longitude) {
                coords.push({
                    lat: trace.dest_info.latitude,
                    lon: trace.dest_info.longitude,
                });
            }

            for (let i = 0; i < coords.length - 1; i++) {
                const type =
                    i === 0
                        ? 'home-to-hop'
                        : i === coords.length - 2
                          ? 'hop-to-dest'
                          : 'hop-to-hop';
                paths.push({
                    type,
                    coords: [
                        [coords[i].lon, coords[i].lat],
                        [coords[i + 1].lon, coords[i + 1].lat],
                    ],
                });
            }
        });
        return paths;
    }, [traceResults, hopLocations, userLocation]);

    const getComputedColor = (varName: string) => {
        const name = varName.startsWith('var(')
            ? varName.match(/var\(([^)]+)\)/)?.[1]
            : varName;

        if (!name) return varName;
        return getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();
    };

    // --- MAIN RENDER LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;

        ctx.scale(dpr, dpr);

        const resolvedColors = {
            oceanFill: getComputedColor(colors.oceanFill),
            countryFill: getComputedColor(colors.countryFill),
            countryStroke: getComputedColor(colors.countryStroke),
            graticuleStroke: getComputedColor(colors.graticuleStroke),
            arcStroke: getComputedColor(colors.arcStroke),
            auroraInner: getComputedColor(colors.auroraInner),
            auroraOuter: getComputedColor(colors.auroraOuter),
            bg: getComputedColor(colors.bg),
            markerStroke: getComputedColor(colors.markerStroke),
        };

        const render = () => {
            const { rotation, scale } = stateRef.current;

            const projection = d3
                .geoOrthographic()
                .scale((minDimension / 2 - 20) * scale)
                // Center exactly in the calculated logical dimensions
                .translate([dimensions.width / 2, dimensions.height / 2 - 25])
                .clipAngle(90)
                .precision(0.1)
                .rotate(rotation);

            const path = d3.geoPath(projection, ctx);

            // Clear Background
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);
            ctx.fillStyle = resolvedColors.bg;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);

            // Aurora
            const radius = projection.scale();
            const cx = dimensions.width / 2;
            const cy = dimensions.height / 2 - 25;

            const gradient = ctx.createRadialGradient(
                cx,
                cy,
                radius * 0.8,
                cx,
                cy,
                radius + 10,
            );
            gradient.addColorStop(0, resolvedColors.auroraInner);
            gradient.addColorStop(1, resolvedColors.auroraOuter);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 10, 0, 2 * Math.PI);
            ctx.fill();

            // Ocean
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.fillStyle = resolvedColors.oceanFill;
            ctx.fill();
            ctx.strokeStyle = darkThemeEnabled ? '#113355aa' : '#56789d';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Graticule
            ctx.beginPath();
            ctx.strokeStyle = resolvedColors.graticuleStroke;
            ctx.lineWidth = 0.3;
            path(geoGraticule()());
            ctx.stroke();

            // Countries
            if (worldData?.features) {
                ctx.beginPath();
                path({
                    type: 'FeatureCollection',
                    features: worldData.features,
                } as any);
                ctx.fillStyle = resolvedColors.countryFill;
                ctx.fill();
                ctx.strokeStyle = resolvedColors.countryStroke;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }

            // Route Paths
            routePaths.forEach(({ type, coords }) => {
                ctx.beginPath();
                path({ type: 'LineString', coordinates: coords } as any);

                ctx.lineWidth =
                    type === 'home-to-hop' || type === 'hop-to-dest' ? 2 : 1.5;
                ctx.strokeStyle =
                    type === 'hop-to-dest'
                        ? 'orange'
                        : resolvedColors.arcStroke;

                if (type === 'hop-to-hop') {
                    ctx.setLineDash([6, 6]);
                } else {
                    ctx.setLineDash([]);
                }
                ctx.globalAlpha = 0.85;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                ctx.setLineDash([]);
            });

            // Markers
            allMarkers.forEach((marker) => {
                const center = [-rotation[0], -rotation[1]];
                const point = [marker.lon, marker.lat];
                if (geoDistance(center, point) > Math.PI / 2) return;

                const coords = projection(point as [number, number]);
                if (coords) {
                    const [x, y] = coords;

                    // Shadow
                    ctx.beginPath();
                    ctx.arc(x, y + 1, marker.size, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fill();

                    // Home Glow
                    if (marker.id === 'home') {
                        ctx.beginPath();
                        ctx.arc(x, y, marker.size + 3, 0, 2 * Math.PI);
                        ctx.fillStyle = 'rgba(118, 255, 3, 0.7)';
                        ctx.fill();
                    }

                    // Body
                    ctx.beginPath();
                    ctx.arc(x, y, marker.size, 0, 2 * Math.PI);
                    ctx.fillStyle = marker.color;
                    ctx.fill();
                    ctx.lineWidth = marker.id === 'home' ? 2 : 1;
                    ctx.strokeStyle = resolvedColors.markerStroke;
                    ctx.stroke();
                }
            });
        };

        let animId = requestAnimationFrame(function loop() {
            render();
            animId = requestAnimationFrame(loop);
        });

        return () => cancelAnimationFrame(animId);
    }, [
        dimensions,
        minDimension,
        worldData,
        routePaths,
        allMarkers,
        darkThemeEnabled,
        colors,
    ]);

    // Hover Detection
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current || dragRef.current.active) return;

        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const { rotation, scale } = stateRef.current;
        const projection = d3
            .geoOrthographic()
            .scale((minDimension / 2 - 20) * scale)
            .translate([dimensions.width / 2, dimensions.height / 2 - 25])
            .rotate(rotation);

        let found = null;
        for (const marker of allMarkers) {
            const center = [-rotation[0], -rotation[1]];
            if (geoDistance(center, [marker.lon, marker.lat]) > Math.PI / 2)
                continue;

            const coords = projection([marker.lon, marker.lat]);
            if (coords) {
                const dist = Math.sqrt(
                    (mx - coords[0]) ** 2 + (my - coords[1]) ** 2,
                );
                if (dist < marker.size + 6) {
                    found = {
                        ...marker,
                        x: coords[0] + rect.left,
                        y: coords[1] + rect.top,
                    };
                    break;
                }
            }
        }

        if (found) {
            stateRef.current.hoveredMarker = found.id;
            canvasRef.current!.style.cursor = 'pointer';
            setTooltip({
                visible: true,
                x: found.x,
                y: found.y,
                content: found.label,
            });
        } else {
            stateRef.current.hoveredMarker = null;
            canvasRef.current!.style.cursor = 'grab';
            setTooltip((t) => ({ ...t, visible: false }));
        }
    };

    const computeTooltipStyle = () => {
        if (!tooltip.visible)
            return { top: 0, left: 0, visibility: 'hidden' as const };

        const pad = 10;
        const estimatedW = 220; // Used for decision only
        const defaultH = 60;

        let top = tooltip.y - 10;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Vertical safety
        if (top + defaultH > vh) top = vh - defaultH - pad;
        if (top < pad) top = pad;

        // Horizontal Logic
        const rightSpace = vw - tooltip.x;

        // If NO space on right, anchor to the RIGHT side (Flip)
        if (rightSpace < estimatedW + 40) {
            return {
                top,
                left: 'auto',
                right: vw - tooltip.x + 20, // Distance from right edge
                visibility: 'visible' as const,
            };
        } else {
            // Normal behavior
            return {
                top,
                left: tooltip.x + 20,
                right: 'auto',
                visibility: 'visible' as const,
            };
        }
    };

    const tooltipStyle = computeTooltipStyle();

    return (
        <div
            id="map-container"
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--color-bg)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                }}
                onMouseMove={handleMouseMove}
                aria-label={t.map.ariaLabel || 'Interactive globe map'}
            />

            {tooltip.visible && (
                <div
                    role="tooltip"
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        top: tooltipStyle.top,
                        left: tooltipStyle.left,
                        right: tooltipStyle.right, // Added this
                        pointerEvents: 'none',
                        backgroundColor: colors.tooltipBg,
                        border: `1px solid ${colors.tooltipBorder}`,
                        boxShadow: 'var(--mantine-shadow-md)',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        textAlign: 'left',
                        color: colors.tooltipColor,
                        borderRadius: 4,
                        opacity: tooltip.visible ? 1 : 0,
                        transition: 'opacity 0.1s linear',
                        zIndex: 99999,
                        whiteSpace: 'pre-wrap',
                        maxWidth: 220,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
});
