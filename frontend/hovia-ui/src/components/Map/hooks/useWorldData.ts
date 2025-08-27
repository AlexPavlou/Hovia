import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const GEO_URL =
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function useWorldData() {
    const [worldData, setWorldData] = useState<any>(null);

    useEffect(() => {
        d3.json(GEO_URL).then((topoData) => {
            setWorldData(
                // conversion from TopoJSON data to GeoJSON
                topojson.feature(topoData, topoData.objects.countries),
            );
        });
    }, []);

    return worldData;
}
