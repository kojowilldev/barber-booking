import { PrismaClient, AppointmentStatus } from "@prisma/client";
import { getDefaultStaffId } from "./default-staff";

const prisma = new PrismaClient();

interface CreateAppointmentInput {
  serviceId: string;
  staffId?: string; // optional — defaults to the shop's one barber
  startAt: Date;
  clientName: string;
  clientPhone: string; // used to find an existing client, or create a new one
}

/**
 * Finds an existing client by phone number, or creates a new one if
 * this is their first time booking. Phone number is the "unique ID"
 * a returning customer is recognized by.
 */
async function findOrCreateClient(name: string, phone: string) {
  return prisma.client.upsert({
    where: { phone },
    update: {}, // existing client found — leave their details as-is
    create: { name, phone },
  });
}

/**
 * Creates an appointment. Automatically finds or creates the client
 * by phone number, and defaults to the shop's single barber if no
 * staffId is given.
 */
export async function createAppointment(input: CreateAppointmentInput) {
  const { serviceId, startAt, clientName, clientPhone } = input;
  const staffId = input.staffId ?? (await getDefaultStaffId());

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const client = await findOrCreateClient(clientName, clientPhone);

  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      staffId,
      status: { not: AppointmentStatus.CANCELED },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (conflict) {
    throw new Error(
      `This slot is already booked (appointment ${conflict.id}).`
    );
  }

  return prisma.appointment.create({
    data: {
      startAt,
      endAt,
      status: AppointmentStatus.PENDING,
      serviceId,
      clientId: client.id,
      staffId,
    },
  });
}
