import React, { useRef, useState } from 'react';
import { useDimensions } from './hooks/useDimensions';
import { useWorldData } from './hooks/useWorldData';
import { useUserLocation } from './hooks/useUserLocation';
import { useHopLocations } from './hooks/useHopLocations';
import useGlobeRotation from './hooks/useGlobeRotation';
import { useDragAndZoom } from './hooks/useDragAndZoom';
import * as d3 from 'd3';
import { geoGraticule, geoDistance } from 'd3-geo';

const DOTTED_PATTERN_ID = 'dottedPattern';
const AURORA_GRADIENT_ID = 'auroraGradient';
const INITIAL_ROTATION: [number, number] = [0, -23.4];

export default React.memo(function Map(props) {
    const {
        traceResults,
        darkThemeEnabled,
        userLocationOverride,
        animationToggle,
        t,
    } = props;

    const colors = {
        light: {
            oceanFill: '#f0f4f8',
            countryFill: '#d9e2ec',
            countryStroke: '#627d98',
            arcStroke: 'rgba(37, 62, 78, 0.7)',
            graticuleStroke: '#9fb3c8',
            markerStroke: '#ffffffdd',
            tooltipBg: 'rgba(0,0,0,0.7)',
            tooltipColor: 'white',
            dottedPatternFill: '#ccc',
            auroraInner: 'rgba(144,194,255,0.35)',
            auroraOuter: 'rgba(144,194,255,0.04)',
        },
        dark: {
            oceanFill: '#22242a',
            countryFill: '#30343d',
            countryStroke: '#60676f',
            arcStroke: 'rgba(255, 165, 0, 0.6)',
            graticuleStroke: '#52575d',
            markerStroke: '#d1d4da',
            tooltipBg: 'rgba(40, 40, 40, 0.9)',
            tooltipColor: '#eee',
            dottedPatternFill: '#777a7f',
            auroraInner: 'rgba(18,70,110,0.4)',
            auroraOuter: 'rgba(18,70,110,0.07)',
        },
    };

    const theme = darkThemeEnabled ? colors.dark : colors.light;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const isDraggingRef = useRef(false);
    const hoveredMarkerRef = useRef<string | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{
        active: boolean;
        lastX: number;
        lastY: number;
        velocityX: number;
        velocityY: number;
    }>({
        active: false,
        lastX: 0,
        lastY: 0,
        velocityX: 0,
        velocityY: 0,
    });

    const userLocation = useUserLocation(userLocationOverride);

    const [rotation, setRotation] =
        useState<[number, number]>(INITIAL_ROTATION);
    const [scale, setScale] = useState(1);

    const [tooltip, setTooltip] = useState({
        visible: false,
        x: 0,
        y: 0,
        content: '',
    });

    useGlobeRotation(userLocation, animationToggle, dragRef, setRotation);
    useDragAndZoom(
        svgRef,
        dragRef,
        isDraggingRef,
        setTooltip,
        setRotation,
        setScale,
        hoveredMarkerRef,
    );

    const dimensions = useDimensions(containerRef);
    const worldData = useWorldData();
    const hopLocations = useHopLocations(traceResults);
    const minDimension = Math.min(dimensions.width, dimensions.height);

    const projection = d3
        .geoOrthographic()
        .scale((minDimension / 2 - 40) * scale)
        .translate([dimensions.width / 2, dimensions.height / 2])
        .clipAngle(90)
        .precision(0.1)
        .rotate(rotation);

    const pathGenerator = d3.geoPath(projection);
    const graticuleData = geoGraticule()();

    const userMarker = userLocation
        ? {
              lat: userLocation.lat,
              lon: userLocation.lon,
              color: darkThemeEnabled ? '#76ff03' : '#228b22',
              size: 5,
              label: t.map.homeLabel,
              id: 'home',
          }
        : null;

    const hopMarkers: Array<any> = [];
    traceResults.forEach((trace, i) => {
        trace.hops.forEach((hop, idx) => {
            const loc = hopLocations[hop.hopIP];
            if (loc) {
                hopMarkers.push({
                    lat: loc.latitude,
                    lon: loc.longitude,
                    color: darkThemeEnabled ? '#2196f3' : '#1565c0',
                    size: 4,
                    label: `${t.map.hopIP}: ${hop.hopIP}\n${t.map.latency}: ${hop.latency} ms`,
                    id: `hop-${i}-${idx}`,
                });
            }
        });
    });

    const destMarkers: Array<any> = [];
    traceResults.forEach((trace, i) => {
        const d = trace.dest_info;
        if (d.latitude !== 0 && d.longitude !== 0) {
            destMarkers.push({
                lat: d.latitude,
                lon: d.longitude,
                color: darkThemeEnabled ? '#ff7043' : '#e64a19',
                size: 5,
                label: `${t.map.destinationIP}: ${d.ip}\n${t.map.country}: ${d.country}\n${t.map.region}: ${d.region}\n${t.map.isp}: ${d.isp}`,
                id: `dest-${i}`,
            });
        }
    });

    const projectPoint = (lat: number, lon: number) => {
        const center = [-rotation[0], -rotation[1]];
        const point = [lon, lat] as [number, number];
        if (geoDistance(center, point) > Math.PI / 2) return null;
        return projection(point as any);
    };

    // function that computes the connective arcs and breaks them into segments that can be individually hidden if facing the wrong way
    function createArcPath(
        start: { lat: number; lon: number },
        end: { lat: number; lon: number },
        center: [number, number],
    ) {
        const interpolator = d3.geoInterpolate(
            [start.lon, start.lat],
            [end.lon, end.lat],
        );
        const numSamples = 20;
        let visiblePoints: Array<[number, number]> = [];
        let pathSegments: Array<Array<[number, number]>> = [];

        for (let i = 0; i <= numSamples; i++) {
            const point = interpolator(i / numSamples);
            const dist = d3.geoDistance(center, point as [number, number]);
            if (dist <= Math.PI / 2) {
                const p = projection(point as any);
                if (p) visiblePoints.push(p as [number, number]);
            } else {
                if (visiblePoints.length > 0) {
                    pathSegments.push(visiblePoints);
                    visiblePoints = [];
                }
            }
        }
        if (visiblePoints.length > 0) pathSegments.push(visiblePoints);

        return pathSegments
            .filter((segment) => segment.length >= 2)
            .map((segment) => 'M' + segment.map((p) => p.join(',')).join(' L'));
    }

    const center = [-rotation[0], -rotation[1]] as [number, number];

    const arcsPaths: Array<{ path: string; type: string }> = [];
    traceResults.forEach((trace) => {
        const coords: Array<{ lat: number; lon: number }> = [];

        if (
            userLocation &&
            userLocation.lat !== undefined &&
            userLocation.lon !== undefined
        ) {
            coords.push({ lat: userLocation.lat, lon: userLocation.lon });
        }

        trace.hops.forEach((hop) => {
            const loc = hopLocations[hop.hopIP];
            if (loc) coords.push({ lat: loc.latitude, lon: loc.longitude });
        });

        if (trace.dest_info.latitude !== 0 && trace.dest_info.longitude !== 0) {
            coords.push({
                lat: trace.dest_info.latitude,
                lon: trace.dest_info.longitude,
            });
        }
        for (let i = 0; i < coords.length - 1; i++) {
            const start = coords[i];
            const end = coords[i + 1];
            const type =
                i === 0
                    ? 'home-to-hop'
                    : i === coords.length - 2
                      ? 'hop-to-dest'
                      : 'hop-to-hop';
            const segments = createArcPath(start, end, center);
            segments.forEach((segment) =>
                arcsPaths.push({ path: segment, type }),
            );
        }
    });

    const allMarkers = [
        ...hopMarkers,
        ...destMarkers,
        ...(userMarker ? [userMarker] : []),
    ];

    // Marker component with tooltip + accessibility handlers
    const SvgMarker = ({ marker }: { marker: any }) => {
        const coords = projectPoint(marker.lat, marker.lon);
        if (!coords) return null;

        const centerForCheck = [-rotation[0], -rotation[1]] as [number, number];
        const point = [marker.lon, marker.lat] as [number, number];
        const dist = geoDistance(centerForCheck, point);
        if (dist > Math.PI / 2) return null;

        const [x, y] = coords as [number, number];

        const handlePointerEnter = (e: React.PointerEvent) => {
            if (isDraggingRef.current || dragRef.current.active) return;
            hoveredMarkerRef.current = marker.id;
            setTooltip({
                visible: true,
                x: x + 8,
                y: y - 20,
                content: marker.label,
            });
        };

        const handlePointerLeave = () => {
            if (hoveredMarkerRef.current === marker.id)
                hoveredMarkerRef.current = null;
            setTooltip((t) => ({ ...t, visible: false }));
        };

        const handleFocus = () => {
            hoveredMarkerRef.current = marker.id;
            setTooltip({
                visible: true,
                x: x + 8,
                y: y - 20,
                content: marker.label,
            });
        };

        const handleBlur = () => {
            if (hoveredMarkerRef.current === marker.id)
                hoveredMarkerRef.current = null;
            setTooltip((t) => ({ ...t, visible: false }));
        };

        return (
            <circle
                data-marker-id={marker.id}
                cx={x}
                cy={y}
                r={marker.size}
                fill={marker.color}
                stroke={theme.markerStroke}
                strokeWidth={marker.id === 'home' ? 2 : 1}
                filter={
                    marker.id === 'home'
                        ? 'url(#glowShadow)'
                        : 'url(#markerShadow)'
                }
                cursor="pointer"
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerDown={() => {
                    hoveredMarkerRef.current = null;
                    setTooltip((t) => ({ ...t, visible: false }));
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                aria-label={marker.label}
                tabIndex={0}
            />
        );
    };

    const computeTooltipStyle = () => {
        if (!tooltip.visible)
            return { top: 0, left: 0, visibility: 'hidden' as const };
        const pad = 8;
        const defaultWidth = 240;
        const defaultHeight = 40;
        const node = tooltipRef.current;
        const tw = node?.offsetWidth ?? defaultWidth;
        const th = node?.offsetHeight ?? defaultHeight;

        let left = tooltip.x + 45;
        let top = tooltip.y + 40;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (left + tw + pad > vw) left = Math.max(pad, tooltip.x - tw - 12);
        left = Math.max(pad, Math.min(left, vw - tw - pad));

        if (top + th + pad > vh) {
            // render tooltip above the cursor if not enough room below
            top = tooltip.y - th - 12;
        }
        top = Math.max(pad, Math.min(top, vh - th - pad));

        return { left, top, visibility: 'visible' as const };
    };

    const tooltipStyleComputed = computeTooltipStyle();

    return (
        <div
            id="map-container"
            ref={containerRef}
            style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                role="img"
                aria-label={
                    t.map.ariaLabel ||
                    'Interactive globe map showing network routes'
                }
                shapeRendering="geometricPrecision"
                className={darkThemeEnabled ? 'bg-[#222]' : 'bg-[#f9f9f9]'}
                style={{ display: 'block' }}
            >
                <defs>
                    <filter
                        id="markerShadow"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feDropShadow
                            dx="0"
                            dy="1"
                            stdDeviation="1"
                            floodColor="#000"
                            floodOpacity="0.3"
                        />
                    </filter>
                    <pattern
                        id={DOTTED_PATTERN_ID}
                        width="15"
                        height="15"
                        patternUnits="userSpaceOnUse"
                    >
                        <circle
                            cx="2"
                            cy="2"
                            r="0.9"
                            fill={theme.dottedPatternFill}
                            opacity={darkThemeEnabled ? 0.3 : 0.6}
                        />
                    </pattern>
                    <radialGradient
                        id={AURORA_GRADIENT_ID}
                        cx="50%"
                        cy="50%"
                        r="50%"
                    >
                        <stop offset="0%" stopColor={theme.auroraInner} />
                        <stop offset="100%" stopColor={theme.auroraOuter} />
                    </radialGradient>
                    <filter
                        id="glowShadow"
                        height="200%"
                        width="200%"
                        x="-50%"
                        y="-50%"
                    >
                        <feDropShadow
                            dx="0"
                            dy="0"
                            stdDeviation="3"
                            floodColor="#76ff03"
                            floodOpacity="0.7"
                        />
                    </filter>
                </defs>

                <rect
                    width="100%"
                    height="100%"
                    fill={`url(#${DOTTED_PATTERN_ID})`}
                    pointerEvents="none"
                />

                <circle
                    cx={dimensions.width / 2}
                    cy={dimensions.height / 2}
                    r={projection.scale() + 10}
                    fill={`url(#${AURORA_GRADIENT_ID})`}
                    pointerEvents="none"
                />

                <circle
                    cx={dimensions.width / 2}
                    cy={dimensions.height / 2}
                    r={projection.scale()}
                    fill={theme.oceanFill}
                    stroke={darkThemeEnabled ? '#113355aa' : '#56789d'}
                    strokeWidth={0.5}
                />

                {graticuleData && (
                    <path
                        d={pathGenerator(graticuleData)}
                        fill="none"
                        stroke={theme.graticuleStroke}
                        strokeWidth={0.3}
                        pointerEvents="none"
                    />
                )}

                {worldData?.features &&
                    worldData.features.map((feature: any, i: number) => (
                        <path
                            key={i}
                            d={pathGenerator(feature)}
                            fill={theme.countryFill}
                            stroke={theme.countryStroke}
                            strokeWidth={0.6}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            pointerEvents="none"
                            tabIndex={-1}
                            aria-hidden="true"
                        >
                            <title>
                                {feature.properties?.name || 'Country'}
                            </title>
                        </path>
                    ))}

                {arcsPaths.map(({ path, type }, i) => (
                    <path
                        key={`arc-${i}`}
                        d={path}
                        stroke={
                            type === 'home-to-hop'
                                ? theme.arcStroke
                                : type === 'hop-to-dest'
                                  ? 'orange'
                                  : theme.arcStroke
                        }
                        strokeWidth={
                            type === 'home-to-hop' || type === 'hop-to-dest'
                                ? 2
                                : 1.5
                        }
                        fill="none"
                        strokeDasharray={type === 'hop-to-hop' ? '6 6' : 'none'}
                        opacity={0.85}
                        strokeLinejoin="round"
                        pointerEvents="none"
                    />
                ))}

                {allMarkers.map((m) => (
                    <SvgMarker key={m.id || `${m.lat}-${m.lon}`} marker={m} />
                ))}
            </svg>

            {tooltip.visible && (
                <div
                    role="tooltip"
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        top: tooltip.y + 40,
                        left: tooltip.x + 45,
                        pointerEvents: 'none',
                        backgroundColor: theme.tooltipBg,
                        padding: '6px 12px',
                        borderRadius: 4,
                        color: theme.tooltipColor,
                        opacity: tooltip.visible ? 1 : 0,
                        transition: 'opacity 0.2s linear',
                        zIndex: 10000,
                        whiteSpace: 'pre-wrap',
                        maxWidth: 320,
                        visibility: tooltipStyleComputed.visibility,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
});
