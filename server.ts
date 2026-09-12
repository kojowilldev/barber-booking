import express from "express";
import { PrismaClient } from "@prisma/client";
import { createAppointment } from "./appointment-service";
import { getAvailableSlots } from "./get-available-slots";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// --- Simple password protection for the barber's admin view ---
// Uses HTTP Basic Auth: the browser will pop up a username/password
// prompt. Credentials come from .env so the real password isn't in
// your code. Add these two lines to your .env file:
//   ADMIN_USERNAME=yourusername
//   ADMIN_PASSWORD=yourpassword
function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Barbershop Admin"');
    return res.status(401).send("Authentication required.");
  }

  const base64Credentials = authHeader.split(" ")[1];
  const [username, password] = Buffer.from(base64Credentials, "base64")
    .toString("utf-8")
    .split(":");

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Barbershop Admin"');
  return res.status(401).send("Invalid credentials.");
}

// Protect the admin page itself and anything only the barber should touch.
app.use("/admin.html", requireAdminAuth);
app.use("/appointments/:id/cancel", requireAdminAuth);

app.use(express.static("public"));

/**
 * GET /available-slots?date=2026-09-15
 * Returns a list of open time slots for the given day.
 */
app.get("/available-slots", async (req, res) => {
  try {
    const dateParam = req.query.date as string;
    if (!dateParam) {
      return res.status(400).json({ error: "Missing 'date' query parameter (e.g. ?date=2026-09-15)" });
    }

    const day = new Date(dateParam);
    if (isNaN(day.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    const service = await prisma.service.findFirstOrThrow();

    const existingAppointments = await prisma.appointment.findMany({
      select: { startAt: true, endAt: true, staffId: true },
    });

    const slots = await getAvailableSlots({
      day,
      shopOpen: "09:00",
      shopClose: "17:00",
      serviceDuration: service.durationMinutes,
      existingAppointments,
    });

    res.json({ slots });
  } catch (err) {
    console.error("Error in GET /available-slots:", err);
    res.status(500).json({ error: "Something went wrong fetching available slots." });
  }
});

/**
 * POST /appointments
 * Body: { serviceId, clientName, clientPhone, startAt }
 * Creates a new appointment.
 */
app.post("/appointments", async (req, res) => {
  try {
    const { serviceId, clientName, clientPhone, startAt } = req.body;

    if (!serviceId || !clientName || !clientPhone || !startAt) {
      return res.status(400).json({
        error: "Missing required fields: serviceId, clientName, clientPhone, startAt",
      });
    }

    const appointment = await createAppointment({
      serviceId,
      clientName,
      clientPhone,
      startAt: new Date(startAt),
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error("Error in POST /appointments:", err);
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * GET /appointments
 * Lists all appointments, including customer names/phone numbers —
 * so this is protected the same way as the admin page.
 */
app.get("/appointments", requireAdminAuth, async (_req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { service: true, client: true, staff: true },
      orderBy: { startAt: "asc" },
    });
    res.json(appointments);
  } catch (err) {
    console.error("Error in GET /appointments:", err);
    res.status(500).json({ error: "Something went wrong fetching appointments." });
  }
});

/**
 * PATCH /appointments/:id/cancel
 * Marks an appointment as CANCELED instead of deleting it,
 * so the history is preserved.
 */
app.patch("/appointments/:id/cancel", async (req, res) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: "CANCELED" },
    });
    res.json(appointment);
  } catch (err) {
    console.error("Error in PATCH /appointments/:id/cancel:", err);
    res.status(404).json({ error: "Appointment not found." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Barbershop API running at http://localhost:${PORT}`);
});
