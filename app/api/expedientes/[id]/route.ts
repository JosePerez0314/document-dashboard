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

interface UpdateExpedienteBody {
  nombre?: string;
  status?:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  revisor_id?: number | null;
}

interface RouteParams {
  id: string;
}

/**
 * GET /api/expedientes/[id]
 * Returns a single expediente by id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid expediente id" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      const query = "SELECT * FROM expedientes WHERE id = ?";
      const [rows] = await connection.query<Expediente[]>(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "Expediente not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(rows[0], { status: 200 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/expedientes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expediente" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/expedientes/[id]
 * Updates an expediente
 * Body: { nombre?: string, status?: string, revisor_id?: number }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid expediente id" },
        { status: 400 },
      );
    }

    const body: UpdateExpedienteBody = await request.json();

    // Validate that at least one field is provided
    if (!body.nombre && !body.status && body.revisor_id === undefined) {
      return NextResponse.json(
        {
          error:
            "At least one field (nombre, status, revisor_id) must be provided",
        },
        { status: 400 },
      );
    }

    // Validate field types
    if (body.nombre && typeof body.nombre !== "string") {
      return NextResponse.json(
        { error: "Invalid field type: nombre must be a string" },
        { status: 400 },
      );
    }

    if (body.status && typeof body.status !== "string") {
      return NextResponse.json(
        { error: "Invalid field type: status must be a string" },
        { status: 400 },
      );
    }

    if (
      body.revisor_id !== undefined &&
      body.revisor_id !== null &&
      typeof body.revisor_id !== "number"
    ) {
      return NextResponse.json(
        {
          error: "Invalid field type: revisor_id must be a number or null",
        },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      // Check if expediente exists
      const checkQuery = "SELECT id FROM expedientes WHERE id = ?";
      const [checkRows] = await connection.query<Expediente[]>(checkQuery, [
        id,
      ]);

      if (checkRows.length === 0) {
        return NextResponse.json(
          { error: "Expediente not found" },
          { status: 404 },
        );
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: (string | number | null)[] = [];

      if (body.nombre) {
        updateFields.push("nombre = ?");
        updateValues.push(body.nombre);
      }

      if (body.status) {
        updateFields.push("status = ?");
        updateValues.push(body.status);
      }

      if (body.revisor_id !== undefined) {
        updateFields.push("revisor_id = ?");
        updateValues.push(body.revisor_id);
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const updateQuery = `UPDATE expedientes SET ${updateFields.join(", ")} WHERE id = ?`;
      await connection.query<ResultSetHeader>(updateQuery, updateValues);

      // Fetch updated expediente
      const selectQuery = "SELECT * FROM expedientes WHERE id = ?";
      const [updatedRows] = await connection.query<Expediente[]>(selectQuery, [
        id,
      ]);

      return NextResponse.json(
        {
          message: "Expediente updated successfully",
          expediente: updatedRows[0],
        },
        { status: 200 },
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("PUT /api/expedientes/[id] error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update expediente" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/expedientes/[id]
 * Deletes an expediente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid expediente id" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      // Check if expediente exists
      const checkQuery = "SELECT id FROM expedientes WHERE id = ?";
      const [checkRows] = await connection.query<Expediente[]>(checkQuery, [
        id,
      ]);

      if (checkRows.length === 0) {
        return NextResponse.json(
          { error: "Expediente not found" },
          { status: 404 },
        );
      }

      // Delete expediente (cascades to expediente_logs)
      const deleteQuery = "DELETE FROM expedientes WHERE id = ?";
      await connection.query<ResultSetHeader>(deleteQuery, [id]);

      return NextResponse.json(
        { message: "Expediente deleted successfully" },
        { status: 200 },
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("DELETE /api/expedientes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete expediente" },
      { status: 500 },
    );
  }
}
