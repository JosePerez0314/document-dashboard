import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getUserId } from "@/lib/auth";

type UserRole = "ADMIN" | "REVISOR";

interface User extends RowDataPacket {
  id: number;
  cedula: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user
 */
export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const query =
      "SELECT id, cedula, role, created_at, updated_at FROM users WHERE id = ?";
    const [rows] = await pool.query<User[]>(query, [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = rows[0];

    return NextResponse.json(
      {
        id: user.id,
        cedula: user.cedula,
        role: user.role,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}
