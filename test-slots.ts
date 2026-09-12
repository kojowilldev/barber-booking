import { PrismaClient } from "@prisma/client";
import { getAvailableSlots } from "./get-available-slots";

const prisma = new PrismaClient();

async function main() {
  console.log("Looking up your service and staff member...");

  const service = await prisma.service.findFirstOrThrow();
  const staff = await prisma.staff.findFirstOrThrow();

  console.log(`Found service: ${service.name} (${service.durationMinutes} min)`);
  console.log(`Found staff: ${staff.name}`);

  // Same "tomorrow" used in test-booking.ts, so we can check
  // against the appointment that script already created.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Pull every existing appointment so the slot logic can check for conflicts.
  const existingAppointments = await prisma.appointment.findMany({
    select: { startAt: true, endAt: true, staffId: true },
  });

  console.log(`\nFound ${existingAppointments.length} existing appointment(s) in the database.`);

  const slots = await getAvailableSlots({
    day: tomorrow,
    shopOpen: "09:00",
    shopClose: "17:00",
    serviceDuration: service.durationMinutes,
    existingAppointments,
    staffId: staff.id,
  });

  console.log(`\nAvailable ${service.name} slots for ${tomorrow.toDateString()}:`);
  slots.forEach((slot) => console.log(" -", slot.toLocaleTimeString()));

  // Sanity check: 10:00 AM should NOT be in the list, since
  // test-booking.ts already booked that exact slot.
  const tenAm = new Date(tomorrow);
  tenAm.setHours(10, 0, 0, 0);

  const tenAmStillShowing = slots.some(
    (slot) => slot.getTime() === tenAm.getTime()
  );

  console.log("\n--- Sanity check ---");
  if (tenAmStillShowing) {
    console.log("PROBLEM: 10:00 AM is showing as available, but it should be booked!");
  } else {
    console.log("Correct: 10:00 AM is NOT in the list (it's already booked).");
  }
}

main()
  .catch((err) => console.error("Something went wrong:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
