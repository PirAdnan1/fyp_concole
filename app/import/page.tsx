"use client";

import { useState } from "react";
import Papa from "papaparse";
import { SYSTEM_FIELDS } from "@/lib/csv";

type Step = "upload" | "map" | "preview" | "summary";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-ok/10 text-ok",
  EXISTING: "bg-accent/10 text-accent",
  DUPLICATE: "bg-warn/10 text-warn",
  INVALID: "bg-danger/10 text-danger",
};

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [filename, setFilename] = useState("");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [batchId, setBatchId] = useState<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file: File) {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      setCsvText(text);
      const parsed = Papa.parse(text, { header: true, preview: 1 });
      setHeaders(parsed.meta.fields ?? []);

      // Best-effort auto-mapping by matching normalized header names.
      const auto: Record<string, string> = {};
      for (const field of SYSTEM_FIELDS) {
        const match = (parsed.meta.fields ?? []).find(
          (h) => h.toLowerCase().replace(/[^a-z]/g, "") === field.label.toLowerCase().replace(/[^a-z]/g, "")
        );
        if (match) auto[field.key] = match;
      }
      setMapping(auto);
      setStep("map");
    };
    reader.readAsText(file);
  }

  async function generatePreview() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, mapping, filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed.");
      setPreview(data.preview);
      setCounts(data.counts);
      setBatchId(data.batchId);
      setStep("preview");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");
      setSummary(data.summary);
      setStep("summary");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    setStep("upload");
    setFilename("");
    setCsvText("");
    setHeaders([]);
    setMapping({});
    setPreview([]);
    setCounts(null);
    setBatchId("");
    setSummary(null);
    setError("");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Student CSV Import</h1>
        <p className="text-ink/60 text-sm mt-1">
          Upload the CSV exported from your FYP registration form, map its columns to system fields,
          review the preview, then confirm.
        </p>
      </div>

      <Steps current={step} />

      {error && <div className="card p-3 text-sm text-danger border-danger/40 bg-danger/5">{error}</div>}

      {step === "upload" && (
        <div className="card p-8 flex flex-col items-center gap-4 border-dashed">
          <p className="text-sm text-ink/60">Select a CSV file exported from your registration form.</p>
          <label className="btn-primary cursor-pointer">
            Choose CSV file
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      )}

      {step === "map" && (
        <div className="card p-6 space-y-4">
          <h2 className="font-medium">Map CSV columns to system fields</h2>
          <p className="text-xs text-ink/50">File: {filename} · {headers.length} columns detected</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SYSTEM_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-ink/70 flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </label>
                <select
                  className="input mt-1"
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                >
                  <option value="">— Not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary" onClick={resetAll}>Back</button>
            <button
              className="btn-primary"
              disabled={busy || !mapping.studentId || !mapping.name}
              onClick={generatePreview}
            >
              {busy ? "Generating preview…" : "Generate preview"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && counts && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatPill label="New" value={counts.new} tone="ok" />
            <StatPill label="Existing (update)" value={counts.existing} tone="accent" />
            <StatPill label="Duplicate" value={counts.duplicate} tone="warn" />
            <StatPill label="Invalid" value={counts.invalid} tone="danger" />
          </div>

          <div className="table-wrap max-h-96 overflow-y-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Group</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.rowNumber}>
                    <td>{r.rowNumber}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td>{r.studentId || "—"}</td>
                    <td>{r.mapped.name || "—"}</td>
                    <td>{r.mapped.email || "—"}</td>
                    <td>{r.mapped.groupNumber || "—"}</td>
                    <td className="text-danger">{r.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 items-center">
            <button className="btn-secondary" onClick={resetAll}>Cancel import</button>
            <button className="btn-primary" disabled={busy} onClick={confirmImport}>
              {busy ? "Importing…" : `Confirm import (${counts.new + counts.existing} records)`}
            </button>
            {counts.invalid > 0 && (
              <a
                className="text-sm text-accent underline"
                href={`/api/import/${batchId}/errors`}
              >
                Download error report ({counts.invalid})
              </a>
            )}
          </div>
        </div>
      )}

      {step === "summary" && summary && (
        <div className="card p-6 space-y-4">
          <h2 className="font-medium">Import complete</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatPill label="Total records" value={summary.total} tone="ink" />
            <StatPill label="Imported" value={summary.imported} tone="ok" />
            <StatPill label="Updated" value={summary.updated} tone="accent" />
            <StatPill label="Duplicates" value={summary.duplicates} tone="warn" />
            <StatPill label="Failed" value={summary.failed} tone="danger" />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={resetAll}>Import another file</button>
            {summary.failed > 0 && (
              <a className="btn-secondary" href={`/api/import/${batchId}/errors`}>
                Download error report
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map columns" },
    { key: "preview", label: "Preview" },
    { key: "summary", label: "Summary" },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center font-medium ${
              i <= idx ? "bg-accent text-white" : "bg-line text-ink/50"
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= idx ? "text-ink" : "text-ink/40"}>{s.label}</span>
          {i < steps.length - 1 && <span className="w-6 h-px bg-line mx-1" />}
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  const toneClass: Record<string, string> = {
    ok: "text-ok",
    accent: "text-accent",
    warn: "text-warn",
    danger: "text-danger",
    ink: "text-ink",
  };
  return (
    <div className="card p-3">
      <div className={`text-xl font-semibold tabular-nums ${toneClass[tone]}`}>{value}</div>
      <div className="text-xs text-ink/60">{label}</div>
    </div>
  );
}
