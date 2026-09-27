"use client";

import { useEffect, useState, useCallback } from "react";

export default function DefencePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [detail, setDetail] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [unallocated, setUnallocated] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newFypType, setNewFypType] = useState("FYP-1");

  const loadSchedules = useCallback(async () => {
    const res = await fetch("/api/defence");
    const data = await res.json();
    setSchedules(data);
    if (!activeId && data.length) setActiveId(data[0].id);
  }, [activeId]);

  const loadStatics = useCallback(async () => {
    const [r, f] = await Promise.all([fetch("/api/rooms"), fetch("/api/faculty")]);
    setRooms(await r.json());
    setFaculty(await f.json());
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    const [d, u, c] = await Promise.all([
      fetch(`/api/defence/${id}`).then((r) => r.json()),
      fetch(`/api/projects?unallocatedOnly=true`).then((r) => r.json()),
      fetch(`/api/defence/${id}/conflicts`).then((r) => r.json()),
    ]);
    setDetail(d);
    setUnallocated(u);
    setConflicts(c.conflicts ?? []);
  }, []);

  useEffect(() => { loadSchedules(); loadStatics(); }, [loadSchedules, loadStatics]);
  useEffect(() => { if (activeId) loadDetail(activeId); }, [activeId, loadDetail]);

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch("/api/defence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, fypType: newFypType }),
    });
    const data = await res.json();
    setNewTitle("");
    await loadSchedules();
    setActiveId(data.id);
  }

  async function allocate() {
    setError("");
    if (!selectedProjects.length || !selectedRooms.length) {
      setError("Select at least one project and one room.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/defence/${activeId}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectIds: selectedProjects, roomIds: selectedRooms }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    setSelectedProjects([]);
    setSelectedRooms([]);
    loadDetail(activeId);
  }

  async function assignExaminer(roomAllocationId: string, field: string, value: string) {
    await fetch(`/api/defence/${activeId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomAllocationId, [field]: value }),
    });
    loadDetail(activeId);
  }

  async function finalize() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/defence/${activeId}/finalize`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(`${data.error} (${data.conflicts?.length ?? 0} conflict(s) — see below)`);
      setConflicts(data.conflicts ?? []);
      return;
    }
    loadSchedules();
    loadDetail(activeId);
  }

  const internalCandidates = faculty.filter((f) => !f.isExternal);
  const externalCandidates = faculty.filter((f) => f.isExternal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Defence Scheduling</h1>
        <p className="text-ink/60 text-sm mt-1 max-w-2xl">
          Select a defence session, allocate unassigned projects to rooms by capacity, assign
          internal/external examiners and date/time, resolve conflicts, then finalize.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="text-xs font-medium text-ink/70">Active defence session</label>
          <select className="input mt-1" value={activeId} onChange={(e) => setActiveId(e.target.value)}>
            <option value="">— Select —</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
            ))}
          </select>
        </div>

        <form onSubmit={createSchedule} className="flex items-end gap-2">
          <div>
            <label className="text-xs font-medium text-ink/70">New session title</label>
            <input className="input mt-1" placeholder="e.g. FYP-1 Proposal Defence — Fall 2026"
              value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <select className="input" value={newFypType} onChange={(e) => setNewFypType(e.target.value)}>
            <option>FYP-1</option>
            <option>FYP-2</option>
          </select>
          <button className="btn-secondary">Create session</button>
        </form>
      </div>

      {error && <div className="card p-3 text-sm text-danger border-danger/40 bg-danger/5">{error}</div>}

      {detail && (
        <>
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Allocate projects to rooms</h2>
              <span className="badge bg-accentSoft text-accent">{detail.status}</span>
            </div>
            <p className="text-xs text-ink/50">
              {unallocated.length} project(s) not yet allocated to any defence room.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-ink/70 mb-1">Projects</div>
                <div className="border border-line rounded-md max-h-48 overflow-y-auto">
                  {unallocated.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-line last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(p.id)}
                        onChange={(e) =>
                          setSelectedProjects((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          )
                        }
                      />
                      {p.title} <span className="text-ink/40">— {p.group?.groupNumber}</span>
                    </label>
                  ))}
                  {unallocated.length === 0 && (
                    <div className="text-xs text-ink/40 px-3 py-3">No unallocated projects.</div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink/70 mb-1">Rooms</div>
                <div className="border border-line rounded-md max-h-48 overflow-y-auto">
                  {rooms.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-sm border-b border-line last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(r.id)}
                        onChange={(e) =>
                          setSelectedRooms((prev) =>
                            e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                          )
                        }
                      />
                      {r.name} <span className="text-ink/40">(capacity {r.capacity})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn-primary" disabled={busy} onClick={allocate}>
              {busy ? "Allocating…" : "Auto-distribute selected projects"}
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="font-medium">Room allocations</h2>
            {detail.roomAllocations.length === 0 && (
              <p className="text-sm text-ink/40">No rooms allocated to this session yet.</p>
            )}
            {detail.roomAllocations.map((alloc: any) => (
              <div key={alloc.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-medium">{alloc.room.name}</span>
                    <span className="text-xs text-ink/50 ml-2">
                      {alloc.projects.length} / {alloc.room.capacity} projects assigned
                    </span>
                  </div>
                  <span
                    className={`badge ${
                      alloc.projects.length > alloc.room.capacity
                        ? "bg-danger/10 text-danger"
                        : alloc.projects.length === alloc.room.capacity
                        ? "bg-ok/10 text-ok"
                        : "bg-accentSoft text-accent"
                    }`}
                  >
                    {alloc.projects.length}/{alloc.room.capacity}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Internal examiner">
                    <select className="input" defaultValue={alloc.internalExaminerId ?? ""}
                      onChange={(e) => assignExaminer(alloc.id, "internalExaminerId", e.target.value)}>
                      <option value="">— Select —</option>
                      {internalCandidates.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="External examiner">
                    <select className="input" defaultValue={alloc.externalExaminerId ?? ""}
                      onChange={(e) => assignExaminer(alloc.id, "externalExaminerId", e.target.value)}>
                      <option value="">— Select —</option>
                      {externalCandidates.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date">
                    <input type="date" className="input" defaultValue={alloc.date?.slice(0, 10) ?? ""}
                      onBlur={(e) => assignExaminer(alloc.id, "date", e.target.value)} />
                  </Field>
                  <Field label="Time">
                    <div className="flex gap-1">
                      <input type="time" className="input" defaultValue={alloc.startTime ?? ""}
                        onBlur={(e) => assignExaminer(alloc.id, "startTime", e.target.value)} />
                      <input type="time" className="input" defaultValue={alloc.endTime ?? ""}
                        onBlur={(e) => assignExaminer(alloc.id, "endTime", e.target.value)} />
                    </div>
                  </Field>
                </div>

                <div className="text-xs text-ink/50">
                  Projects: {alloc.projects.map((pa: any) => pa.project.title).join(", ") || "none"}
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Conflicts</h2>
              <button className="text-xs text-accent underline" onClick={() => loadDetail(activeId)}>
                Re-check
              </button>
            </div>
            {conflicts.length === 0 ? (
              <p className="text-sm text-ok">No conflicts detected.</p>
            ) : (
              <ul className="space-y-1.5">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-sm text-danger flex gap-2">
                    <span className="badge bg-danger/10 text-danger shrink-0">{c.type.replaceAll("_", " ")}</span>
                    {c.message}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="btn-primary"
              disabled={busy || detail.status === "Finalized"}
              onClick={finalize}
            >
              {detail.status === "Finalized" ? "Finalized" : busy ? "Finalizing…" : "Finalize defence schedule"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink/70">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
