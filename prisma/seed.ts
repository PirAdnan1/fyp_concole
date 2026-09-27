import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.defenceRoom.createMany({
    data: [
      { name: "Room 101", capacity: 15 },
      { name: "Room 102", capacity: 15 },
      { name: "Lab 1", capacity: 10 },
    ],
    skipDuplicates: true,
  });

  await prisma.faculty.createMany({
    data: [
      { name: "Dr. Ayesha Khan", email: "ayesha.khan@example.edu", isExternal: false, department: "Computer Science" },
      { name: "Dr. Bilal Ahmed", email: "bilal.ahmed@example.edu", isExternal: false, department: "Software Engineering" },
      { name: "Dr. Sana Malik", email: "sana.malik@example.edu", isExternal: false, department: "Computer Science" },
      { name: "Eng. Omar Farooq", email: "omar.farooq@industry.example", isExternal: true },
      { name: "Dr. Hina Raza", email: "hina.raza@partner-university.example", isExternal: true },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete: sample rooms and faculty created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
