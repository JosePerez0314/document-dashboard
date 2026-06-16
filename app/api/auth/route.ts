import { NextResponse, NextRequest } from "next/server";
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

interface CreateUserBody {
  cedula: string;
  role?: UserRole;
}

const VALID_ROLES: UserRole[] = ["ADMIN", "REVISOR"];
const CEDULA_LENGTH = 11;

/**
 * GET /api/auth
 * Returns all users
 */
export async function GET() {
  try {
    const query =
      "SELECT id, cedula, role, created_at, updated_at FROM users ORDER BY created_at DESC";
    const [rows] = await pool.query<User[]>(query);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("GET /api/auth error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/auth
 * Creates a new user
 * Body: { cedula: string, role?: "ADMIN" | "REVISOR" }
 */
export async function POST(req: NextRequest) {
  try {
    const body: CreateUserBody = await req.json();

    // Validate cedula
    if (!body.cedula || typeof body.cedula !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required field: cedula" },
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

    // Validate and set role
    const finalRole: UserRole = body.role || "REVISOR";

    if (!VALID_ROLES.includes(finalRole)) {
      return NextResponse.json(
        {
          error: `Invalid role. Allowed roles are: ${VALID_ROLES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const query = "INSERT INTO users (cedula, role) VALUES (?, ?)";
    const values: [string, UserRole] = [body.cedula, finalRole];

    const [result] = await pool.query<ResultSetHeader>(query, values);

    // Fetch and return the created user
    const selectQuery =
      "SELECT id, cedula, role, created_at, updated_at FROM users WHERE id = ?";
    const [rows] = await pool.query<User[]>(selectQuery, [result.insertId]);

    const createdUser = rows[0];

    return NextResponse.json(createdUser, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/auth error:", error);

    // Check for duplicate entry error
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
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
