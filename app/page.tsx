import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-client";

export default async function Home() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/login");
    }

    // Route to appropriate dashboard based on role
    if (user.role === "ADMIN") {
      redirect("/admin");
    } else if (user.role === "REVISOR") {
      redirect("/revisor");
    }
  } catch (error) {
    // On auth check error, redirect to login
    console.error("Auth check error:", error);
    redirect("/login");
  }

  // Fallback (should not reach here)
  return null;
}
