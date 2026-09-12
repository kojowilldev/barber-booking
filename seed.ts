import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.create({
    data: { name: "Mr. Brown" },
  });
  console.log("Created staff:", staff.name);

  const service = await prisma.service.create({
    data: {
      name: "Haircut",
      durationMinutes: 30,
      price: 50.0,
    },
  });
  console.log("Created service:", service.name);
}

main()
  .catch((err) => console.error("Something went wrong:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
