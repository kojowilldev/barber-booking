import { PrismaClient } from "@prisma/client";
import { createAppointment } from "./appointment-service";

const prisma = new PrismaClient();

async function main() {
  console.log("Looking up your service and staff member...");

  const service = await prisma.service.findFirstOrThrow();
  const staff = await prisma.staff.findFirstOrThrow();

  console.log(`Found service: ${service.name} (${service.durationMinutes} min)`);
  console.log(`Found staff: ${staff.name}`);

  // Pick a start time: tomorrow at 10:00 AM.
  const startAt = new Date();
  startAt.setDate(startAt.getDate() + 1);
  startAt.setHours(10, 0, 0, 0);

  console.log(`Attempting to book ${service.name} at ${startAt.toLocaleString()}...`);

  const appointment = await createAppointment({
    serviceId: service.id,
    clientName: "Test Customer",
    clientPhone: "0000000000",
    staffId: staff.id,
    startAt,
  });

  console.log("SUCCESS! Appointment created:");
  console.log(appointment);

  console.log("\nTrying to book the SAME slot again (this should fail on purpose)...");
  try {
    await createAppointment({
      serviceId: service.id,
      clientName: "Test Customer",
      clientPhone: "0000000000",
      staffId: staff.id,
      startAt,
    });
    console.log("Uh oh — this should NOT have succeeded. Check your conflict logic.");
  } catch (err) {
    console.log("Correctly rejected as expected:", (err as Error).message);
  }
}

main()
  .catch((err) => console.error("Something went wrong:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
