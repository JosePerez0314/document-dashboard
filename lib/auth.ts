import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: number;
  role: string;
}

export async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret)
      throw new Error("FATAL: JWT_SECRET environment variable is missing");

    const decoded = jwt.verify(token, secret) as JwtPayload;

    return decoded.id;
  } catch (error) {
    return null;
  }
}
