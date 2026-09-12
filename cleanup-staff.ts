import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete the blank-named row.
  await prisma.staff.delete({
    where: { id: "cf56d7c3-3427-4a79-8688-6be4b1b696e4" },
  });
  console.log("Deleted blank staff row.");

  // Delete the duplicate "Mr. Brown" (keeping the other one).
  await prisma.staff.delete({
    where: { id: "3f2cf054-e869-45c0-b1f2-334e9c11845b" },
  });
  console.log("Deleted duplicate Mr. Brown row.");

  const remaining = await prisma.staff.findMany();
  console.log(`\nRemaining staff (${remaining.length}):`);
  remaining.forEach((s) => console.log(`  id: ${s.id} | name: "${s.name}"`));
}

main()
  .catch((err) => console.error("Something went wrong:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
