import { prisma } from "@/lib/prisma";

export interface Conflict {
  type:
    | "DOUBLE_BOOKED_SUPERVISOR"
    | "DOUBLE_BOOKED_INTERNAL"
    | "DOUBLE_BOOKED_EXTERNAL"
    | "PROJECT_IN_MULTIPLE_ROOMS"
    | "PROJECT_NO_EXAMINER"
    | "ROOM_OVER_CAPACITY"
    | "MISSING_REQUIRED_INFO";
  message: string;
  roomAllocationId?: string;
}

/**
 * Automatically distributes a list of projects across the given rooms
 * according to each room's remaining capacity (Requirement 22 / 27).
 * Returns the assignment plan without writing to the database, so the
 * Coordinator can review it before confirming.
 */
export function autoDistributeProjects(
  projectIds: string[],
  rooms: { id: string; name: string; capacity: number; alreadyAssigned: number }[]
) {
  const plan: Record<string, string[]> = {}; // roomId -> projectIds
  const overflow: string[] = [];

  const capacityLeft = new Map(
    rooms.map((r) => [r.id, Math.max(r.capacity - r.alreadyAssigned, 0)])
  );
  for (const r of rooms) plan[r.id] = [];

  let roomIndex = 0;
  const roomIds = rooms.map((r) => r.id);

  for (const projectId of projectIds) {
    // find next room with remaining capacity, round-robin from current index
    let placed = false;
    for (let attempt = 0; attempt < roomIds.length; attempt++) {
      const idx = (roomIndex + attempt) % roomIds.length;
      const roomId = roomIds[idx];
      const left = capacityLeft.get(roomId)!;
      if (left > 0) {
        plan[roomId].push(projectId);
        capacityLeft.set(roomId, left - 1);
        roomIndex = idx + 1;
        placed = true;
        break;
      }
    }
    if (!placed) overflow.push(projectId);
  }

  return { plan, overflow };
}

/**
 * Runs the full conflict-detection sweep described in Requirement 28.
 * Scoped to a single DefenceSchedule (a schedule = one defence "event").
 */
export async function detectConflicts(defenceScheduleId: string): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  const allocations = await prisma.roomAllocation.findMany({
    where: { defenceScheduleId },
    include: {
      room: true,
      internalExaminer: true,
      externalExaminer: true,
      projects: { include: { project: { include: { supervisor: true } } } },
    },
  });

  // --- Room over capacity ---------------------------------------------
  for (const alloc of allocations) {
    if (alloc.projects.length > alloc.room.capacity) {
      conflicts.push({
        type: "ROOM_OVER_CAPACITY",
        message: `${alloc.room.name} has ${alloc.projects.length} projects assigned but capacity is ${alloc.room.capacity}.`,
        roomAllocationId: alloc.id,
      });
    }
  }

  // --- Missing required info -------------------------------------------
  for (const alloc of allocations) {
    const missing: string[] = [];
    if (!alloc.date) missing.push("date");
    if (!alloc.startTime || !alloc.endTime) missing.push("time");
    if (!alloc.internalExaminerId) missing.push("internal examiner");
    if (!alloc.externalExaminerId) missing.push("external examiner");
    if (missing.length) {
      conflicts.push({
        type: "MISSING_REQUIRED_INFO",
        message: `${alloc.room.name} is missing: ${missing.join(", ")}.`,
        roomAllocationId: alloc.id,
      });
    }
  }

  // --- Project with no examiner (room has no internal/external assigned) --
  for (const alloc of allocations) {
    if (alloc.projects.length > 0 && (!alloc.internalExaminerId || !alloc.externalExaminerId)) {
      for (const pa of alloc.projects) {
        conflicts.push({
          type: "PROJECT_NO_EXAMINER",
          message: `Project "${pa.project.title}" in ${alloc.room.name} has no complete examiner panel.`,
          roomAllocationId: alloc.id,
        });
      }
    }
  }

  // --- Project assigned to multiple rooms (within this schedule) -------
  const projectRoomCount = new Map<string, string[]>();
  for (const alloc of allocations) {
    for (const pa of alloc.projects) {
      const list = projectRoomCount.get(pa.projectId) ?? [];
      list.push(alloc.room.name);
      projectRoomCount.set(pa.projectId, list);
    }
  }
  for (const [, roomNames] of projectRoomCount) {
    if (roomNames.length > 1) {
      conflicts.push({
        type: "PROJECT_IN_MULTIPLE_ROOMS",
        message: `A project is assigned to multiple rooms: ${roomNames.join(", ")}.`,
      });
    }
  }

  // --- Same person double-booked at overlapping date/time --------------
  const sameSlot = (a: (typeof allocations)[number], b: (typeof allocations)[number]) =>
    a.date &&
    b.date &&
    new Date(a.date).toDateString() === new Date(b.date).toDateString() &&
    a.startTime === b.startTime;

  for (let i = 0; i < allocations.length; i++) {
    for (let j = i + 1; j < allocations.length; j++) {
      const a = allocations[i];
      const b = allocations[j];
      if (a.room.id === b.room.id) continue;
      if (!sameSlot(a, b)) continue;

      if (a.internalExaminerId && a.internalExaminerId === b.internalExaminerId) {
        conflicts.push({
          type: "DOUBLE_BOOKED_INTERNAL",
          message: `${a.internalExaminer?.name} is assigned as internal examiner in both ${a.room.name} and ${b.room.name} at the same time.`,
        });
      }
      if (a.externalExaminerId && a.externalExaminerId === b.externalExaminerId) {
        conflicts.push({
          type: "DOUBLE_BOOKED_EXTERNAL",
          message: `${a.externalExaminer?.name} is assigned as external examiner in both ${a.room.name} and ${b.room.name} at the same time.`,
        });
      }

      const aSupervisors = new Set(
        a.projects.map((p: (typeof a.projects)[number]) => p.project.supervisorId).filter(Boolean)
      );
      const bSupervisors = new Set(
        b.projects.map((p: (typeof b.projects)[number]) => p.project.supervisorId).filter(Boolean)
      );
      for (const s of aSupervisors) {
        if (s && bSupervisors.has(s)) {
          conflicts.push({
            type: "DOUBLE_BOOKED_SUPERVISOR",
            message: `A supervisor has projects scheduled in both ${a.room.name} and ${b.room.name} at the same time.`,
          });
        }
      }
    }
  }

  return conflicts;
}
