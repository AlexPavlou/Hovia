import React, { useState } from "react";

function Logging({ traceResults }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const sortedTraces = React.useMemo(() => {
    if (!sortConfig.key) return traceResults;

    return [...traceResults].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [traceResults, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  if (!traceResults.length) return <p>No trace data yet.</p>;

  return (
    <div>
      <h2>Trace Logs</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer", borderBottom: "1px solid #ccc", padding: "8px" }}
              onClick={() => requestSort("id")}
            >
              ID {sortConfig.key === "id" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
            </th>
            <th
              style={{ cursor: "pointer", borderBottom: "1px solid #ccc", padding: "8px" }}
              onClick={() => requestSort("timestamp")}
            >
              Timestamp {sortConfig.key === "timestamp" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>Hops Count</th>
          </tr>
        </thead>
        <tbody>
          {sortedTraces.map((trace, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px" }}>{trace.id ?? idx + 1}</td>
              <td style={{ padding: "8px" }}>{trace.timestamp ?? "N/A"}</td>
              <td style={{ padding: "8px" }}>{trace.hops?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Logging;
