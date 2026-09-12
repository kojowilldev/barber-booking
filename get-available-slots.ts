interface ExistingAppointment {
  startAt: Date;
  endAt: Date;
  staffId?: string | null;
}

interface GetAvailableSlotsInput {
  day: Date; // the calendar day we're generating slots for
  shopOpen: string; // "HH:mm", e.g. "09:00"
  shopClose: string; // "HH:mm", e.g. "17:00"
  serviceDuration: number; // minutes
  existingAppointments: ExistingAppointment[];
  staffId?: string; // if given, only checks conflicts for this staff member
  stepMinutes?: number; // interval between candidate slots, default 30
}

/**
 * Calculates open time slots for a given day, based on shop operating
 * hours and existing bookings. If staffId is provided, only that
 * staff member's appointments are checked for conflicts (a slot can
 * be "free" for Staff A while Staff B is busy at the same time).
 */
function getAvailableSlots({
  day,
  shopOpen,
  shopClose,
  serviceDuration,
  existingAppointments,
  staffId,
  stepMinutes = 30,
}: GetAvailableSlotsInput): Date[] {
  const slots: Date[] = [];

  const toDateTime = (timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const shopOpenAt = toDateTime(shopOpen);
  const shopCloseAt = toDateTime(shopClose);

  // Only consider appointments for the relevant staff member, if given.
  const relevantAppointments = staffId
    ? existingAppointments.filter((appt) => appt.staffId === staffId)
    : existingAppointments;

  let slotStart = new Date(shopOpenAt);

  while (slotStart.getTime() + serviceDuration * 60_000 <= shopCloseAt.getTime()) {
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60_000);

    const hasConflict = relevantAppointments.some(
      (appt) => slotStart < appt.endAt && slotEnd > appt.startAt
    );

    if (!hasConflict) {
      slots.push(new Date(slotStart));
    }

    slotStart = new Date(slotStart.getTime() + stepMinutes * 60_000);
  }

  return slots;
}

export { getAvailableSlots };
