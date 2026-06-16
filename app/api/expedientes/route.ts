import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

interface Expediente extends RowDataPacket {
  id: string;
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
  id: string;
  nombre: string;
  revisor_id: number;
}

/**
 * GET /api/expedientes
 * Returns all expedientes
 */
export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      const query = "SELECT * FROM expedientes ORDER BY created_at DESC";
      const [rows] = await connection.query<Expediente[]>(query);

      return NextResponse.json(rows, { status: 200 });
    } finally {
      connection.release();
    }
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
  try {
    const body: CreateExpedienteBody = await request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: id" },
        { status: 400 },
      );
    }

    if (!body.nombre || typeof body.nombre !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: nombre" },
        { status: 400 },
      );
    }

    // Validate revisor_id if provided
    if (body.revisor_id !== undefined && typeof body.revisor_id !== "number") {
      return NextResponse.json(
        { error: "Invalid field type: revisor_id must be a number" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      const query =
        "INSERT INTO expedientes (id, nombre, status, revisor_id) VALUES (?, ?, ?, ?)";
      const values = [
        body.id,
        body.nombre,
        "PENDIENTE",
        body.revisor_id || null,
      ];

      await connection.query<ResultSetHeader>(query, values);

      // Fetch and return the created expediente
      const selectQuery = "SELECT * FROM expedientes WHERE id = ?";
      const [rows] = await connection.query<Expediente[]>(selectQuery, [
        body.id,
      ]);

      const createdExpediente = rows[0];

      return NextResponse.json(createdExpediente, { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    console.error("POST /api/expedientes error:", error);

    // Check for duplicate entry error
    if (error instanceof Error && error.message.includes("Duplicate entry")) {
      return NextResponse.json(
        { error: "Expediente with this id already exists" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create expediente" },
      { status: 500 },
    );
  }
}
