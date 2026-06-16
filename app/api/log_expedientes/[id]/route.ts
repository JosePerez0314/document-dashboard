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

interface UpdateLogBody {
  comentario?: string;
}

interface RouteParams {
  id: string;
}

/**
 * GET /api/log_expedientes/[id]
 * Returns a single expediente log by id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
    }

    const logIdNumber = parseInt(id, 10);
    if (isNaN(logIdNumber)) {
      return NextResponse.json(
        { error: "Invalid log id - must be a number" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      const query = "SELECT * FROM expediente_logs WHERE id = ?";
      const [rows] = await connection.query<ExpedienteLog[]>(query, [
        logIdNumber,
      ]);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "Log entry not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(rows[0], { status: 200 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/log_expedientes/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}

/**
 * PUT /api/log_expedientes/[id]
 * Updates an expediente log (only comentario can be updated)
 * Body: { comentario?: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
    }

    const logIdNumber = parseInt(id, 10);
    if (isNaN(logIdNumber)) {
      return NextResponse.json(
        { error: "Invalid log id - must be a number" },
        { status: 400 },
      );
    }

    const body: UpdateLogBody = await request.json();

    if (body.comentario && typeof body.comentario !== "string") {
      return NextResponse.json(
        { error: "Invalid field type: comentario must be a string" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      // Check if log exists
      const checkQuery = "SELECT id FROM expediente_logs WHERE id = ?";
      const [checkRows] = await connection.query<ExpedienteLog[]>(checkQuery, [
        logIdNumber,
      ]);

      if (checkRows.length === 0) {
        return NextResponse.json(
          { error: "Log entry not found" },
          { status: 404 },
        );
      }

      // Update comentario
      const updateQuery =
        "UPDATE expediente_logs SET comentario = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
      await connection.query<ResultSetHeader>(updateQuery, [
        body.comentario || null,
        logIdNumber,
      ]);

      // Fetch updated log
      const selectQuery = "SELECT * FROM expediente_logs WHERE id = ?";
      const [updatedRows] = await connection.query<ExpedienteLog[]>(
        selectQuery,
        [logIdNumber],
      );

      return NextResponse.json(
        {
          message: "Log updated successfully",
          log: updatedRows[0],
        },
        { status: 200 },
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("PUT /api/log_expedientes/[id] error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update log" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/log_expedientes/[id]
 * Deletes an expediente log entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
    }

    const logIdNumber = parseInt(id, 10);
    if (isNaN(logIdNumber)) {
      return NextResponse.json(
        { error: "Invalid log id - must be a number" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      // Check if log exists
      const checkQuery = "SELECT id FROM expediente_logs WHERE id = ?";
      const [checkRows] = await connection.query<ExpedienteLog[]>(checkQuery, [
        logIdNumber,
      ]);

      if (checkRows.length === 0) {
        return NextResponse.json(
          { error: "Log entry not found" },
          { status: 404 },
        );
      }

      // Delete log
      const deleteQuery = "DELETE FROM expediente_logs WHERE id = ?";
      await connection.query<ResultSetHeader>(deleteQuery, [logIdNumber]);

      return NextResponse.json(
        { message: "Log deleted successfully" },
        { status: 200 },
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("DELETE /api/log_expedientes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete log" },
      { status: 500 },
    );
  }
}
