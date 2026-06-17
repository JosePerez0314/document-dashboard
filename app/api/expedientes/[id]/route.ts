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

interface UpdateExpedienteBody {
  nombre?: string;
  status?:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  revisor_id?: number | null;
  comentario?: string;
}

type StatusEnum = UpdateExpedienteBody["status"];

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
    const revisorId = getUserId();

    if (!revisorId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid expediente id" },
        { status: 400 },
      );
    }

    const query =
      "SELECT * FROM expedientes WHERE id = ? AND revisor_id = ?  LIMIT 1";
    const [rows] = await pool.query<Expediente[]>(query, [id, revisorId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Expediente not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0], { status: 200 });
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

    const revisorId = await getUserId();

    if (!revisorId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if expediente exists
      const checkQuery =
        "SELECT id, status FROM expedientes WHERE id = ? AND revisor_id = ? LIMIT 1";
      const [checkRows] = await connection.query<RowDataPacket[]>(checkQuery, [
        id,
        revisorId,
      ]);

      if (checkRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Expediente not found" },
          { status: 404 },
        );
      }

      const previousStatus = checkRows[0].status as StatusEnum;
      const newStatus: StatusEnum = body.status || previousStatus;

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

      if (updateFields.length > 0) {
        const updateQuery = `UPDATE expedientes SET ${updateFields.join(", ")} WHERE id = ?`;

        updateValues.push(id);

        await connection.query<ResultSetHeader>(updateQuery, updateValues);
      }

      // Fetch updated expediente
      const logsQuery = `
        INSERT INTO expediente_logs 
        (expediente_id, author_id, previous_status, new_status, comentario) 
        VALUES (?, ?, ?, ?, ?)
      `;

      const logsValues = [
        id,
        revisorId,
        previousStatus,
        newStatus,
        body.comentario || null, // If no comment is provided, send null
      ];

      await connection.query(logsQuery, logsValues);

      await connection.commit();

      const selectQuery =
        "SELECT * FROM expedientes WHERE id = ? AND revisor_id = ? LIMIT 1";
      const [updatedRows] = await connection.query<RowDataPacket[]>(
        selectQuery,
        [id, revisorId],
      );

      return NextResponse.json(
        {
          message: "Expediente updated successfully",
          expediente: updatedRows[0],
        },
        { status: 200 },
      );
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
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

    // Check if expediente exists
    const checkQuery = "SELECT id FROM expedientes WHERE id = ?";
    const [checkRows] = await pool.query<Expediente[]>(checkQuery, [id]);

    if (checkRows.length === 0) {
      return NextResponse.json(
        { error: "Expediente not found" },
        { status: 404 },
      );
    }

    // Delete expediente (cascades to expediente_logs)
    const deleteQuery = "DELETE FROM expedientes WHERE id = ?";
    await pool.query<ResultSetHeader>(deleteQuery, [id]);

    return NextResponse.json(
      { message: "Expediente deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/expedientes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete expediente" },
      { status: 500 },
    );
  }
}
