import { useState, useEffect } from 'react';

interface HopLocations {
    [ip: string]: { latitude: number; longitude: number } | null;
}

export function useHopLocations(traceResults: any[]) {
    const [hopLocations, setHopLocations] = useState<HopLocations>({});

    useEffect(() => {
        if (!traceResults || !traceResults.length) return;
        let isActive = true;
        const ipsToFetch = new Set<string>();

        traceResults.forEach((trace) => {
            if (Array.isArray(trace.hops)) {
                trace.hops.forEach(({ hopIP }: { hopIP: string }) => {
                    if (hopIP && hopLocations[hopIP] === undefined) {
                        ipsToFetch.add(hopIP);
                    }
                });
            }
        });

        if (!ipsToFetch.size) return;

        (async () => {
            const newLocations: HopLocations = {};
            // Process in chunks or parallel limits if needed, but simple loop for now
            for (const ip of Array.from(ipsToFetch)) {
                if (!isActive) break;
                try {
                    // Note: Ensure your API endpoint supports CORS or use a proxy
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
    }, [traceResults]);

    return hopLocations;
}
