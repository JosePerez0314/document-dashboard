import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

type UserRole = "ADMIN" | "REVISOR";

interface User extends RowDataPacket {
  id: number;
  cedula: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

interface UpdateUserBody {
  cedula?: string;
  role?: UserRole;
}

interface RouteParams {
  id: string;
}

const VALID_ROLES: UserRole[] = ["ADMIN", "REVISOR"];
const CEDULA_LENGTH = 11;

/**
 * GET /api/auth/[id]
 * Returns a single user by id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user id - must be a number" },
        { status: 400 },
      );
    }

    const query =
      "SELECT id, cedula, role, created_at, updated_at FROM users WHERE id = ?";
    const [rows] = await pool.query<User[]>(query, [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error("GET /api/auth/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/auth/[id]
 * Updates a user
 * Body: { cedula?: string, role?: "ADMIN" | "REVISOR" }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user id - must be a number" },
        { status: 400 },
      );
    }

    const body: UpdateUserBody = await request.json();

    // Validate that at least one field is provided
    if (body.cedula === undefined && body.role === undefined) {
      return NextResponse.json(
        { error: "At least one field (cedula, role) must be provided" },
        { status: 400 },
      );
    }

    // Validate cedula if provided
    if (body.cedula !== undefined) {
      if (typeof body.cedula !== "string") {
        return NextResponse.json(
          { error: "Invalid field type: cedula must be a string" },
          { status: 400 },
        );
      }

      if (body.cedula.length !== CEDULA_LENGTH) {
        return NextResponse.json(
          {
            error: `Cedula must be exactly ${CEDULA_LENGTH} digits without hyphens`,
          },
          { status: 400 },
        );
      }

      if (!/^\d+$/.test(body.cedula)) {
        return NextResponse.json(
          { error: "Cedula must contain only numeric digits" },
          { status: 400 },
        );
      }
    }

    // Validate role if provided
    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json(
          {
            error: `Invalid role. Allowed roles are: ${VALID_ROLES.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    // Check if user exists
    const checkUserQuery = "SELECT id FROM users WHERE id = ?";
    const [checkUserRows] = await pool.query<User[]>(checkUserQuery, [userId]);

    if (checkUserRows.length === 0) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: (string | UserRole | number)[] = [];

    if (body.cedula !== undefined) {
      updateFields.push("cedula = ?");
      updateValues.push(body.cedula);
    }

    if (body.role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(body.role);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(userId);

    const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    await pool.query<ResultSetHeader>(updateQuery, updateValues);

    // Fetch updated user
    const selectQuery =
      "SELECT id, cedula, role, created_at, updated_at FROM users WHERE id = ?";
    const [updatedRows] = await pool.query<User[]>(selectQuery, [userId]);

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: updatedRows[0],
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("PUT /api/auth/[id] error:", error);

    // Check for duplicate cedula error
    if (error instanceof Error && error.message.includes("Duplicate entry")) {
      return NextResponse.json(
        { error: "User with this cedula already exists" },
        { status: 400 },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
