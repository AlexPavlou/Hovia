import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { geoGraticule } from 'd3-geo';

const GEO_URL =
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DOTTED_PATTERN_ID = 'dottedPattern';
const AURORA_GRADIENT_ID = 'auroraGradient';

export default function Map({
    traceResults = [],
    darkMode = false,
    userLocationOverride = null,
}) {
    const isDraggingRef = useRef(false);
    const containerRef = useRef(null);
    const svgRef = useRef(null);

    const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
    const [worldData, setWorldData] = useState(null);
    const [rotation, setRotation] = useState([0, -20]);
    const [scale, setScale] = useState(1);
    const dragRef = useRef({ active: false, lastX: 0, lastY: 0, velocityX: 0 });
    const [tooltip, setTooltip] = useState({
        visible: false,
        x: 0,
        y: 0,
        content: '',
    });
    const [userLocation, setUserLocation] = useState(null);
    const [hopLocations, setHopLocations] = useState({});

    // Track container size for responsiveness
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
    }, []);

    // Load world topojson data
    useEffect(() => {
        d3.json(GEO_URL).then((topoData) => {
            setWorldData(
                topojson.feature(topoData, topoData.objects.countries),
            );
        });
    }, []);

    // Retrieve user location if no override provided
    useEffect(() => {
        if (userLocationOverride) {
            setUserLocation(userLocationOverride);
            return;
        }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) =>
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                    }),
                () => setUserLocation(null),
                { timeout: 10000 },
            );
        }
    }, [userLocationOverride]);

    // Fetch hop IP geolocations with caching
    useEffect(() => {
        if (!traceResults.length) return;
        let isActive = true;
        const ipsToFetch = new Set();

        traceResults.forEach((trace) =>
            trace.hops.forEach(({ hopIP }) => {
                if (hopIP && !hopLocations[hopIP]) ipsToFetch.add(hopIP);
            }),
        );

        if (!ipsToFetch.size) return;

        (async () => {
            const newLocations = {};
            for (const ip of ipsToFetch) {
                if (!isActive) break;
                try {
                    const res = await fetch(`http://ip-api.com/json/${ip}`);
                    const json = await res.json();
                    if (json.status === 'success') {
                        newLocations[ip] = {
                            latitude: json.lat,
                            longitude: json.lon,
                        };
                    } else {
                        newLocations[ip] = null;
                    }
                } catch {
                    newLocations[ip] = null;
                }
            }
            if (isActive)
                setHopLocations((prev) => ({ ...prev, ...newLocations }));
        })();

        return () => {
            isActive = false;
        };
    }, [traceResults, hopLocations]);

    const minDimension = Math.min(dimensions.width, dimensions.height);

    // Projection with current rotation and scale from d3.zoom
    const projection = d3
        .geoOrthographic()
        .scale((minDimension / 2 - 40) * scale)
        .translate([dimensions.width / 2, dimensions.height / 2])
        .clipAngle(90)
        .precision(0.1)
        .rotate(rotation);

    const pathGenerator = d3.geoPath(projection);
    const graticuleData = geoGraticule()();

    // Momentum rotation animation disabled during drag
    useEffect(() => {
        const friction = 0.93;
        let animationFrame;

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
    }, []);

    // Interaction handlers (drag rotation and zoom via d3.zoom)
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        // Mouse drag handlers for rotation
        function onMouseDown(e) {
            e.preventDefault();
            dragRef.current = {
                active: true,
                lastX: e.clientX,
                lastY: e.clientY,
                velocityX: 0,
            };
            isDraggingRef.current = true;
            if (tooltip.visible) setTooltip((t) => ({ ...t, visible: false }));
        }
        function onMouseMove(e) {
            if (!dragRef.current.active) return;
            e.preventDefault();

            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;

            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;

            const sensitivity = 0.3; // slower pan

            setRotation(([lambda, phi]) => {
                let nl = lambda + dx * sensitivity;
                let np = phi - dy * sensitivity;
                np = Math.max(-90, Math.min(90, np));
                return [nl, np];
            });

            // Update velocity for momentum
            dragRef.current.velocityX = dx;
        }
        function onMouseUp() {
            dragRef.current.active = false;
            isDraggingRef.current = false;
            if (tooltip.visible) setTooltip((t) => ({ ...t, visible: false }));
        }

        // Attach mouse event listeners for dragging
        svg.on('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Setup d3 zoom behavior for smooth zooming
        const zoomBehavior = d3
            .zoom()
            .scaleExtent([0.3, 6])
            .filter((event) => {
                // Allow zoom only on wheel, ignore dblclick, pinch etc if you want
                return event.type === 'wheel';
            })
            .on('zoom', (event) => {
                // Hide tooltip during zoom
                if (tooltip.visible)
                    setTooltip((t) => ({ ...t, visible: false }));
                isDraggingRef.current = true;
                // Update scale state from zoom event
                setScale(event.transform.k);
            });

        svg.call(zoomBehavior);

        // Detect end of zoom interaction to reset dragging state
        let wheelTimeout;
        svg.node().addEventListener('wheel', () => {
            if (wheelTimeout) clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                isDraggingRef.current = false;
            }, 200);
        });

        // Cleanup
        return () => {
            svg.on('mousedown', null);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            svg.on('.zoom', null);
            if (wheelTimeout) clearTimeout(wheelTimeout);
        };
    }, [tooltip.visible]);

    const projectPoint = (lat, lon) => {
        const coords = projection([lon, lat]);
        if (!coords) return null;
        return coords;
    };

    // Tooltip handlers respecting dragging state
    const onMouseEnter = (e, label) => {
        if (isDraggingRef.current) return;
        e.stopPropagation();
        setTooltip({
            visible: true,
            x: e.clientX + 8,
            y: e.clientY - 20,
            content: label,
        });
    };
    const onMouseLeave = () => {
        setTooltip((t) => ({ ...t, visible: false }));
    };

    // Prepare markers
    const userMarker = userLocation
        ? {
              lat: userLocation.lat,
              lon: userLocation.lon,
              color: darkMode ? '#76ff03' : '#228b22',
              size: 6,
              label: 'Home (Your Location)',
              id: 'home',
          }
        : null;

    const hopMarkers = [];
    traceResults.forEach((trace, i) => {
        trace.hops.forEach((hop, idx) => {
            const loc = hopLocations[hop.hopIP];
            if (loc) {
                hopMarkers.push({
                    lat: loc.latitude,
                    lon: loc.longitude,
                    color: darkMode ? '#2196f3' : '#1565c0',
                    size: 4,
                    label: `Hop IP: ${hop.hopIP}\nLatency: ${hop.latency} ms`,
                    id: `hop-${i}-${idx}`,
                });
            }
        });
    });

    const destMarkers = [];
    traceResults.forEach((trace, i) => {
        const d = trace.dest_info;
        if (d.latitude !== 0 && d.longitude !== 0) {
            destMarkers.push({
                lat: d.latitude,
                lon: d.longitude,
                color: darkMode ? '#ff7043' : '#e64a19',
                size: 5,
                label: `Destination IP: ${d.ip}\nCountry: ${d.country}\nRegion: ${d.region}\nISP: ${d.isp}`,
                id: `dest-${i}`,
            });
        }
    });

    const allMarkers = [
        ...(userMarker ? [userMarker] : []),
        ...hopMarkers,
        ...destMarkers,
    ];

    // Arc paths
    const createArcPath = (start, end) => {
        const interpolate = d3.geoInterpolate(
            [start.lon, start.lat],
            [end.lon, end.lat],
        );
        const points = d3.range(0, 1.01, 0.02).map(interpolate);
        const pixelPoints = points.map((p) => projection(p)).filter(Boolean);
        if (pixelPoints.length < 2) return '';
        return 'M' + pixelPoints.map((p) => p.join(',')).join(' L');
    };

    const arcsPaths = [];
    traceResults.forEach((trace) => {
        const coords = [];
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
            if (coords[i] && coords[i + 1])
                arcsPaths.push(createArcPath(coords[i], coords[i + 1]));
        }
    });

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

    const theme = darkMode ? colors.dark : colors.light;

    const SvgMarker = ({ marker }) => {
        const coords = projectPoint(marker.lat, marker.lon);
        if (!coords) return null;
        const [x, y] = coords;

        const handleMouseEnter = () => {
            if (isDraggingRef.current) return;
            setTooltip({
                visible: true,
                x: x + 8,
                y: y - 20,
                content: marker.label,
            });
        };

        const handleMouseLeave = () => {
            setTooltip((t) => ({ ...t, visible: false }));
        };

        return (
            <circle
                cx={x}
                cy={y}
                r={marker.size}
                fill={marker.color}
                stroke={theme.markerStroke}
                strokeWidth={1}
                cursor="pointer"
                filter="url(#markerShadow)"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleMouseEnter}
                onBlur={handleMouseLeave}
                aria-label={marker.label}
                tabIndex={0}
            />
        );
    };

    return (
        <div
            id="map-container"
            ref={containerRef}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
                width: '100vw',
                height: '100vh',
                margin: 'auto',
                position: 'relative',
                backgroundColor: 'transparent',
                overflow: 'hidden',
            }}
        >
            <svg
                ref={svgRef}
                shapeRendering="geometricPrecision"
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                width="100%"
                height="100%"
                style={{ backgroundColor: 'transparent', display: 'block' }}
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
                            r="1"
                            fill={theme.dottedPatternFill}
                            opacity={0.6}
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
                </defs>

                <rect
                    width="100%"
                    height="100%"
                    fill={`url(#${DOTTED_PATTERN_ID})`}
                    pointerEvents="none"
                />

                {/* Aurora glow behind globe */}
                <circle
                    cx={dimensions.width / 2}
                    cy={dimensions.height / 2}
                    r={projection.scale() + 10}
                    fill={`url(#${AURORA_GRADIENT_ID})`}
                    pointerEvents="none"
                />

                {/* Ocean */}
                <circle
                    cx={dimensions.width / 2}
                    cy={dimensions.height / 2}
                    r={projection.scale()}
                    fill={theme.oceanFill}
                    stroke={darkMode ? '#113355aa' : '#56789d'}
                    strokeWidth={0.5}
                />

                {/* Graticule */}
                {graticuleData && (
                    <path
                        d={pathGenerator(graticuleData)}
                        fill="none"
                        stroke={theme.graticuleStroke}
                        strokeWidth={0.3}
                        pointerEvents="none"
                    />
                )}

                {/* Countries */}
                {worldData &&
                    worldData.features.map((feature, i) => (
                        <path
                            key={i}
                            d={pathGenerator(feature)}
                            fill={theme.countryFill}
                            stroke={theme.countryStroke}
                            strokeWidth={0.6}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            pointerEvents="none"
                        />
                    ))}

                {/* Arcs */}
                {arcsPaths.map((d, i) => (
                    <path
                        key={`arc-${i}`}
                        d={d}
                        stroke={theme.arcStroke}
                        strokeWidth={1.5}
                        fill="none"
                        strokeDasharray="6 6"
                        opacity={0.75}
                        strokeLinejoin="round"
                        pointerEvents="none"
                    />
                ))}

                {/* Markers */}
                {allMarkers.map((m) => (
                    <SvgMarker key={m.id || `${m.lat}-${m.lon}`} marker={m} />
                ))}
            </svg>

            {/* Tooltip */}
            {tooltip.visible && (
                <div
                    role="tooltip"
                    style={{
                        pointerEvents: 'none',
                        position: 'fixed',
                        top: tooltip.y + 40,
                        left: tooltip.x + 45,
                        backgroundColor: theme.tooltipBg,
                        padding: '6px 12px',
                        borderRadius: 4,
                        color: theme.tooltipColor,
                        maxWidth: 280,
                        fontSize: 13,
                        whiteSpace: 'pre-line',
                        userSelect: 'none',
                        zIndex: 10000,
                        fontFamily:
                            'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                        boxShadow: '0 0 10px rgba(0,0,0,0.15)',
                        transition: 'opacity 0.2s ease',
                        opacity: tooltip.visible ? 1 : 0,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
}
