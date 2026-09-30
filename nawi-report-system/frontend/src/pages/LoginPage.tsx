import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await login(data.username, data.password);
      navigate("/dashboard");
    } catch {
      setError("password", { message: "Invalid credentials" });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 selection:bg-zinc-800">

      <div className="w-full max-w-sm flex flex-col items-center">

        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <svg className="w-6 h-6 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-100">NAWI Report System</h1>
          <p className="text-zinc-500 text-sm mt-2">Legal Metrology · OIML R-76</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6" id="login-form">
          <div className="space-y-4">
            <div>
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register("username")}
                className="w-full bg-zinc-900/50 border-b border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:bg-zinc-900 transition-all rounded-t-xl"
                placeholder="Username"
              />
              {errors.username && <p className="text-red-400/90 text-xs mt-2 px-1">{errors.username.message}</p>}
            </div>

            <div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className="w-full bg-zinc-900/50 border-b border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:bg-zinc-900 transition-all rounded-b-xl"
                placeholder="Password"
              />
              {errors.password && <p className="text-red-400/90 text-xs mt-2 px-1">{errors.password.message}</p>}
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-50 font-medium text-sm py-3.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
          >
            {isSubmitting ? "Authenticating..." : "Continue"}
          </button>
        </form>

      </div>
    </div>
  );
}
