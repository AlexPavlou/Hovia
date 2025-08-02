import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function AutoCenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) map.setView(center, 4);
  }, [center, map]);

  return null;
}
