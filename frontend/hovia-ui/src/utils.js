export function extractPositions(trace) {
  const hops = trace.hops
    .filter((h) => h.latitude && h.longitude)
    .map((h) => [h.latitude, h.longitude]);
  const dest = trace.dest_info?.latitude
    ? [[trace.dest_info.latitude, trace.dest_info.longitude]]
    : [];
  return { hops, dest };
}
