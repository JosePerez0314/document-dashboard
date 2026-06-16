import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

interface ExpedienteLog extends RowDataPacket {
  id: number;
  expediente_id: string;
  author_id: number;
  previous_status:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  new_status:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  comentario: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateLogBody {
  expediente_id: string;
  author_id: number;
  previous_status:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  new_status:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  comentario?: string;
}

/**
 * GET /api/log_expedientes
 * Returns all expediente logs, optionally filtered by expediente_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const expedienteId = searchParams.get("expediente_id");

    const connection = await pool.getConnection();

    try {
      let query = "SELECT * FROM expediente_logs ORDER BY created_at DESC";
      const params: string[] = [];

      if (expedienteId) {
        query =
          "SELECT * FROM expediente_logs WHERE expediente_id = ? ORDER BY created_at DESC";
        params.push(expedienteId);
      }

      const [rows] = await connection.query<ExpedienteLog[]>(query, params);

      return NextResponse.json(rows, { status: 200 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/log_expedientes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/log_expedientes
 * Creates a new expediente log entry
 * Body: { expediente_id, author_id, previous_status, new_status, comentario? }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateLogBody = await request.json();

    // Validate required fields
    if (!body.expediente_id || typeof body.expediente_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: expediente_id" },
        { status: 400 },
      );
    }

    if (!body.author_id || typeof body.author_id !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid required field: author_id" },
        { status: 400 },
      );
    }

    if (!body.previous_status || typeof body.previous_status !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: previous_status" },
        { status: 400 },
      );
    }

    if (!body.new_status || typeof body.new_status !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: new_status" },
        { status: 400 },
      );
    }

    if (body.comentario && typeof body.comentario !== "string") {
      return NextResponse.json(
        { error: "Invalid field type: comentario must be a string" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      const query =
        "INSERT INTO expediente_logs (expediente_id, author_id, previous_status, new_status, comentario) VALUES (?, ?, ?, ?, ?)";
      const values = [
        body.expediente_id,
        body.author_id,
        body.previous_status,
        body.new_status,
        body.comentario || null,
      ];

      const result = await connection.query<ResultSetHeader>(query, values);
      const logId = result[0].insertId;

      // Fetch and return the created log
      const selectQuery = "SELECT * FROM expediente_logs WHERE id = ?";
      const [rows] = await connection.query<ExpedienteLog[]>(selectQuery, [
        logId,
      ]);

      const createdLog = rows[0];

      return NextResponse.json(createdLog, { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    console.error("POST /api/log_expedientes error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Check for foreign key constraint error
    if (
      error instanceof Error &&
      error.message.includes("FOREIGN KEY constraint")
    ) {
      return NextResponse.json(
        {
          error: "Invalid expediente_id or author_id - references do not exist",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create log" },
      { status: 500 },
    );
  }
}
