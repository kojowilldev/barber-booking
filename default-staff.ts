import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Fetches the shop's default staff member. For a one-barber shop,
 * there should only ever be a single Staff row, so callers don't
 * need to know or pass a staffId around — this finds it for them.
 *
 * When you add a second barber later, this function is the ONE
 * place that needs to change (e.g. accept a staffId param, or let
 * the caller pick) — the rest of the app won't need to know.
 */
export async function getDefaultStaffId(): Promise<string> {
  const staffCount = await prisma.staff.count();

  if (staffCount === 0) {
    throw new Error(
      "No staff member set up yet. Create one Staff row before accepting bookings."
    );
  }

  if (staffCount > 1) {
    throw new Error(
      "More than one staff member exists — getDefaultStaffId() only works for a single-barber shop. Update callers to pass a specific staffId."
    );
  }

  const staff = await prisma.staff.findFirstOrThrow();
  return staff.id;
}
