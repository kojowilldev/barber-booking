import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const allStaff = await prisma.staff.findMany();
  console.log(`Found ${allStaff.length} staff row(s):`);
  allStaff.forEach((s) => {
    console.log(`  id: ${s.id} | name: "${s.name}"`);
  });
}

main()
  .catch((err) => console.error("Something went wrong:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
