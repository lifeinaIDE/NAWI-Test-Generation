import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import DisclaimerFooter from "../components/DisclaimerFooter";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

const demoAccounts = [
  {
    role: "TECHNICIAN",
    username: "technician",
    label: "Technician",
    color: "border-sky-500/30 bg-sky-950/20 text-sky-400 hover:bg-sky-900/30",
    badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  },
  {
    role: "REVIEWER",
    username: "reviewer",
    label: "Reviewer",
    color: "border-purple-500/30 bg-purple-950/20 text-purple-400 hover:bg-purple-900/30",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  {
    role: "ADMIN",
    username: "admin",
    label: "Admin",
    color: "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  {
    role: "VIEWER",
    username: "viewer",
    label: "Viewer",
    color: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/40",
    badge: "bg-zinc-800 text-zinc-400 border border-zinc-700",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await login(data.username.trim(), data.password);
      navigate("/dashboard");
    } catch {
      setError("password", { message: "Invalid username or password" });
    }
  }

  function handleSelectDemo(username: string) {
    setValue("username", username, { shouldValidate: true });
    setValue("password", "demo123", { shouldValidate: true });
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 selection:bg-zinc-800">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <svg className="w-6 h-6 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-100">NAWI Report System</h1>
          <p className="text-zinc-500 text-xs mt-1">Legal Metrology · OIML R-76 Calibration Platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4" id="login-form">
          <div className="space-y-3">
            <div>
              <label htmlFor="username" className="block text-[11px] font-medium text-zinc-400 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register("username")}
                className="w-full bg-zinc-900/60 border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:bg-zinc-900 transition-all rounded-xl"
                placeholder="Enter username"
              />
              {errors.username && <p className="text-red-400/90 text-xs mt-1.5 px-1">{errors.username.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-medium text-zinc-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className="w-full bg-zinc-900/60 border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:bg-zinc-900 transition-all rounded-xl"
                placeholder="Enter password"
              />
              {errors.password && <p className="text-red-400/90 text-xs mt-1.5 px-1">{errors.password.message}</p>}
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-50 font-medium text-sm py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            {isSubmitting ? "Authenticating..." : "Sign in"}
          </button>
        </form>

        {/* Demo Accounts Hint Box */}
        <div className="w-full mt-6 pt-5 border-t border-zinc-800/60">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Demo Accounts Hint
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">pwd: demo123</span>
          </div>

          <p className="text-[11px] text-zinc-500 mb-3">
            Click any role to pre-fill credentials and test role-specific features:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => handleSelectDemo(account.username)}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${account.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-200">{account.label}</span>
                  <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${account.badge}`}>
                    {account.role}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1">{account.username}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full max-w-xl mt-8">
        <DisclaimerFooter />
      </div>
    </div>
  );
}
