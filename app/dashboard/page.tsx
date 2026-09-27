"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }, []);

  function downloadCsv() {
    const header = ["Session", "Room", "Projects", "Capacity", "Internal", "External", "Date", "Time", "Status"];
    const lines = rows.map((r) =>
      [
        r.scheduleTitle,
        r.room,
        r.projectCount,
        r.capacity,
        r.internal,
        r.external,
        r.date ? new Date(r.date).toLocaleDateString() : "",
        [r.startTime, r.endTime].filter(Boolean).join("–"),
        r.status,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "room-wise-defence-schedule.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Room-wise Defence Dashboard</h1>
          <p className="text-ink/60 text-sm mt-1">
            A single view of every room's allocation, examiners, and schedule status.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn-secondary" onClick={downloadCsv}>Download CSV</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Session</th>
              <th>Room</th>
              <th>Projects</th>
              <th>Internal</th>
              <th>External</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center text-ink/40 py-6">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-ink/40 py-6">No defence rooms scheduled yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.scheduleTitle}</td>
                <td className="font-medium">{r.room}</td>
                <td>
                  <span className={r.projectCount > r.capacity ? "text-danger font-medium" : ""}>
                    {r.projectCount} / {r.capacity}
                  </span>
                </td>
                <td>{r.internal}</td>
                <td>{r.external}</td>
                <td>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                <td>{[r.startTime, r.endTime].filter(Boolean).join(" – ") || "—"}</td>
                <td>
                  <span className="badge bg-accentSoft text-accent">{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
