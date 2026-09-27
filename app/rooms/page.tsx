"use client";

import { useEffect, useState } from "react";

interface Room {
  id: string;
  name: string;
  capacity: number;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(15);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/rooms");
    setRooms(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addRoom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, capacity }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setName("");
    setCapacity(15);
    load();
  }

  async function updateCapacity(id: string, newCapacity: number) {
    await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity: newCapacity }),
    });
    load();
  }

  async function removeRoom(id: string) {
    if (!confirm("Delete this room? This cannot be undone.")) return;
    await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Defence Rooms</h1>
        <p className="text-ink/60 text-sm mt-1">
          Create defence rooms or locations (e.g. Room 101, Lab 1, Seminar Hall) and set each one's
          maximum project capacity. Default capacity is 15 projects per room.
        </p>
      </div>

      <form onSubmit={addRoom} className="card p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-ink/70">Room name</label>
          <input
            className="input mt-1"
            placeholder="e.g. Room 104"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="w-32">
          <label className="text-xs font-medium text-ink/70">Capacity</label>
          <input
            type="number"
            min={1}
            className="input mt-1"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </div>
        <button type="submit" className="btn-primary">Add room</button>
      </form>

      {error && <div className="text-sm text-danger">{error}</div>}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Room</th>
              <th>Capacity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="text-center text-ink/40 py-6">Loading…</td></tr>
            )}
            {!loading && rooms.length === 0 && (
              <tr><td colSpan={3} className="text-center text-ink/40 py-6">No rooms configured yet.</td></tr>
            )}
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="input w-24"
                    defaultValue={r.capacity}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== r.capacity && v > 0) updateCapacity(r.id, v);
                    }}
                  />
                  <span className="text-xs text-ink/50 ml-2">projects</span>
                </td>
                <td>
                  <button className="text-danger text-xs hover:underline" onClick={() => removeRoom(r.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
