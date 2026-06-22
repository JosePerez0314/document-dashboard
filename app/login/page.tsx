"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight } from "lucide-react";
import { loginUser } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginAction = async (formData: FormData) => {
    const cedula = formData.get("cedula") as string;

    setError(null);
    setLoading(true);

    try {
      const user = await loginUser(cedula);

      if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "REVISOR") {
        router.push("/revisor");
      } else {
        throw new Error("Unauthorized role.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-105">
        {/* Header Block */}
        <div className="flex flex-col items-center mb-8">
          {/* Badge */}
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="text-white" size={28} />
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 text-center">
            Sistema de Expedientes
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-slate-500 text-center mt-2">
            Control Documental Interno
          </p>
        </div>

        {/* Card */}
        <form
          action={handleLoginAction}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mt-8"
        >
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Label */}
          <label
            htmlFor="cedula"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Cédula de Identidad
          </label>

          {/* Input */}
          <input
            id="cedula"
            name="cedula"
            type="text"
            placeholder="Ingresa tu cédula"
            disabled={loading}
            className="w-full font-mono text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-slate-900 text-white rounded-lg py-3 font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Ingresando..." : "Ingresar"}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
