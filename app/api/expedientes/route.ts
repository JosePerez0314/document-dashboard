import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { getUserId } from "@/lib/auth";

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
  try {
    const revisorId = await getUserId();
    if (!revisorId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const query =
      "INSERT INTO expedientes (id, nombre, status, revisor_id) VALUES (?, ?, ?, ?)";
    const values = [body.id, body.nombre, "PENDIENTE", revisorId || null];

    await pool.query<ResultSetHeader>(query, values);

    // Fetch and return the created expediente
    const selectQuery =
      "SELECT * FROM expedientes WHERE id = ? AND revisor_id = ?";
    const [rows] = await pool.query<Expediente[]>(selectQuery, [
      body.id,
      revisorId,
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Expediente not found" },
        { status: 404 },
      );
    }

    const createdExpediente = rows[0];

    return NextResponse.json(createdExpediente, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/expedientes error:", error);

    // Check for duplicate entry error
    return NextResponse.json(
      { error: "Failed to create expediente" },
      { status: 500 },
    );
  }
}
