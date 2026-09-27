import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getStats() {
  try {
    const [students, groups, projects, rooms, schedules] = await Promise.all([
      prisma.student.count(),
      prisma.group.count(),
      prisma.project.count(),
      prisma.defenceRoom.count(),
      prisma.defenceSchedule.count(),
    ]);
    return { students, groups, projects, rooms, schedules, ok: true };
  } catch {
    return { students: 0, groups: 0, projects: 0, rooms: 0, schedules: 0, ok: false };
  }
}

export default async function OverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "Students", value: stats.students, href: "/import" },
    { label: "Groups", value: stats.groups, href: "/import" },
    { label: "Projects", value: stats.projects, href: "/defence" },
    { label: "Defence Rooms", value: stats.rooms, href: "/rooms" },
    { label: "Defence Schedules", value: stats.schedules, href: "/defence" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Coordinator Overview</h1>
        <p className="text-ink/60 text-sm mt-1 max-w-2xl">
          Import student records, configure defence rooms, allocate projects, assign examiners,
          and resolve scheduling conflicts before finalizing each defence session.
        </p>
      </div>

      {!stats.ok && (
        <div className="card p-4 text-sm border-warn/40 bg-warn/5 text-warn">
          Could not reach the database. Set <code className="font-mono">DATABASE_URL</code> in your
          environment and run the Prisma migrations — see <code className="font-mono">DEPLOYMENT.md</code>.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 hover:border-accent transition block">
            <div className="text-2xl font-semibold tabular-nums">{c.value}</div>
            <div className="text-xs text-ink/60 mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <WorkflowStep
          n={1}
          title="Import students"
          desc="Upload the CSV exported from your registration form, map its columns, review the preview, and confirm."
          href="/import"
        />
        <WorkflowStep
          n={2}
          title="Configure rooms"
          desc="Create defence rooms and set each one's project capacity (default 15)."
          href="/rooms"
        />
        <WorkflowStep
          n={3}
          title="Schedule defence"
          desc="Create a defence session, allocate projects to rooms, assign internal/external examiners, and finalize."
          href="/defence"
        />
      </div>
    </div>
  );
}

function WorkflowStep({ n, title, desc, href }: { n: number; title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="card p-5 hover:border-accent transition block">
      <div className="w-7 h-7 rounded-full bg-accentSoft text-accent text-sm font-semibold flex items-center justify-center mb-3">
        {n}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-ink/60 mt-1">{desc}</p>
    </Link>
  );
}
