import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

type UserRole = "ADMIN" | "REVISOR";

interface User extends RowDataPacket {
  id: number;
  cedula: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

interface LoginBody {
  cedula: string;
}

const CEDULA_LENGTH = 11;

/**
 * POST /api/auth/login
 * Authenticates a user by cedula
 * Body: { cedula: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body: LoginBody = await req.json();

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

    // Look up user by cedula
    const query =
      "SELECT id, cedula, role, created_at, updated_at FROM users WHERE cedula = ? LIMIT 1";
    const [rows] = await pool.query<User[]>(query, [body.cedula]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "User not found. Access denied" },
        { status: 401 },
      );
    }

    const user = rows[0];

    return NextResponse.json(
      {
        message: "Login successful",
        user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/auth/login error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
