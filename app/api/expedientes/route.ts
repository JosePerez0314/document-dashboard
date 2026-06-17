import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { getUserId } from "@/lib/auth";

interface Expediente extends RowDataPacket {
  id: number;
  nombre: string;
  status:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  revisor_id: number | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateExpedienteBody {
  id: number;
  nombre: string;
  revisor_id: number;
  comentario?: string;
}

/**
 * GET /api/expedientes
 * Returns all expedientes
 */
export async function GET() {
  try {
    const revisorId = await getUserId();

    if (!revisorId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query =
      "SELECT * FROM expedientes WHERE revisor_id = ? ORDER BY created_at DESC";
    const [rows] = await pool.query<Expediente[]>(query, [revisorId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("GET /api/expedientes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expedientes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/expedientes
 * Creates a new expediente
 * Body: { id: string, nombre: string, revisor_id?: number }
 */
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    // 1. Authenticate the User
    const revisorId = await getUserId();
    if (!revisorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and Validate Request Payload
    const body: CreateExpedienteBody = await request.json();

    if (!body.nombre || typeof body.nombre !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: nombre" },
        { status: 400 },
      );
    }

    if (body.comentario && typeof body.comentario !== "string") {
      return NextResponse.json(
        { error: "Invalid field type: comentario must be a string" },
        { status: 400 },
      );
    }

    // 3. START THE TRANSACTION LAYER
    await connection.beginTransaction();

    // 4. Action 1: Insert into 'expedientes'
    const insertQuery =
      "INSERT INTO expedientes (nombre, status, revisor_id) VALUES (?, ?, ?)";
    const insertValues = [body.nombre, "PENDIENTE", revisorId];

    const [insertResult] = await connection.query<ResultSetHeader>(
      insertQuery,
      insertValues,
    );

    const newExpedienteId = insertResult.insertId;

    // 5. Action 2: Insert Initial Append-Only Audit Log
    const logsQuery = `
      INSERT INTO expediente_logs 
      (expediente_id, author_id, previous_status, new_status, comentario) 
      VALUES (?, ?, ?, ?, ?)
    `;

    const logsValues = [
      newExpedienteId,
      revisorId,
      null, // previous_status is null because it didn't exist before
      "PENDIENTE", // new_status
      body.comentario || "Registro inicial del expediente", // Fixed the missing parameter
    ];

    // FIXED: Executing the statement securely on the same connection
    await connection.query(logsQuery, logsValues);

    // 6. THE ATOMIC COMMIT: Lock changes permanently to disk
    await connection.commit();

    // 7. Fetch the created record to build the complete application state
    const selectQuery = "SELECT * FROM expedientes WHERE id = ? LIMIT 1";
    const [rows] = await connection.query<RowDataPacket[]>(selectQuery, [
      newExpedienteId,
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to confirm created record state" },
        { status: 500 },
      );
    }

    const createdExpediente = rows[0];

    // 8. Generate the Presentation-Layer Serialized ID string on-the-fly
    const displayId = `EXP-${String(createdExpediente.id).padStart(4, "0")}`;

    // Return the response combining raw storage state with formatted client-facing data
    return NextResponse.json(
      {
        ...createdExpediente,
        display_id: displayId,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // THE SAFETY NET: Wipe the creation out of memory if anything failed mid-flight
    await connection.rollback();
    console.error("POST /api/expedientes error:", error);

    return NextResponse.json(
      { error: "Failed to create expediente and log entry" },
      { status: 500 },
    );
  } finally {
    // Return connection wire back to the pool
    connection.release();
  }
}
