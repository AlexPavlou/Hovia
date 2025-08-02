import React, { useEffect } from "react";
import "leaflet/dist/leaflet.css";
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

// Fix default icon URLs
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const AutoCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if ( center && Array.isArray(center) && center.length === 2 && center[0] !== undefined && center[1] !== undefined) map.setView(center, 4);
  }, [center, map]);
  return null;
};

export default function Map({ traceResults, initialCenter }) {
  const extractPositions = (trace) => {
    const hops = trace.hops
      .filter((h) => h.latitude && h.longitude)
      .map((h) => [h.latitude, h.longitude]);
    const dest = trace.dest_info?.latitude
      ? [[trace.dest_info.latitude, trace.dest_info.longitude]]
      : [];
    return { hops, dest };
  };

  return (
    <MapContainer
      center={initialCenter}
      zoom={4}
      style={{ height: "100vh", width: "100%" }}
      scrollWheelZoom={true}
    >
      <AutoCenter center={initialCenter} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />


      {(traceResults ?? []).map((trace, idx) => {
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
  );
}
