import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const AutoCenter = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) map.setView(center, 4);
  }, [center, map]);
  return null;
};

export default function MapView({ traceResults }) {
  const extractPositions = (trace) => {
    const hops = trace.hops
      .filter((h) => h.latitude && h.longitude)
      .map((h) => [h.latitude, h.longitude]);
    const dest = trace.dest_info?.latitude
      ? [[trace.dest_info.latitude, trace.dest_info.longitude]]
      : [];
    return { hops, dest };
  };

  const firstHop = traceResults?.[0]?.hops?.[0];
  const initialCenter = firstHop
    ? [firstHop.latitude, firstHop.longitude]
    : [20, 0];

  return (
    <main style={{ flexGrow: 1, height: "100vh" }}>
      <MapContainer
        center={initialCenter}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <AutoCenter center={initialCenter} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {traceResults.map((trace, idx) => {
          const { hops, dest } = extractPositions(trace);
          if (!hops.length && !dest.length) return null;

          return (
            <React.Fragment key={idx}>
              {hops.map((pos, i) => (
                <Marker position={pos} key={`hop-${idx}-${i}`}>
                  <Popup>
                    <b>Hop {i + 1}</b>
                    <br />
                    IP: {trace.hops[i]?.hopIP}
                    <br />
                    Latency: {trace.hops[i]?.latency} ms
                  </Popup>
                </Marker>
              ))}

              {dest.length > 0 && (
                <Marker position={dest[0]} key={`dest-${idx}`}>
                  <Popup>
                    <b>Destination</b>
                    <br />
                    IP: {trace.dest_info?.ip}
                    <br />
                    Country: {trace.dest_info?.country}
                  </Popup>
                </Marker>
              )}

              <Polyline positions={[...hops, ...dest]} color="blue" />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </main>
  );
}
