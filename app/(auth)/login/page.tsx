"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  Presentation,
  LoaderCircle,
} from "lucide-react";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

type LoginRole = "STUDENT" | "ADMIN" | "INSTRUCTOR";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<LoginRole>("STUDENT");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError("Invalid email or password.");
        return;
      }

      router.push(
        role === "ADMIN"
          ? "/admin/dashboard"
          : role === "INSTRUCTOR"
            ? "/instructor/dashboard"
            : "/dashboard",
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mb-4">
            <Image
              src="/pstc_logo.png"
              alt="PSTC"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-card-foreground">
            Welcome to <span className="text-primary">PSTC LMS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Access Type Toggle */}
          <div className="mb-6 grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-full">
            <button
              type="button"
              onClick={() => setRole("STUDENT")}
              className={`flex items-center justify-center gap-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                role === "STUDENT"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole("INSTRUCTOR")}
              className={`flex items-center justify-center gap-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                role === "INSTRUCTOR"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Presentation className="w-4 h-4" />
              Instructor
            </button>
            <button
              type="button"
              onClick={() => setRole("ADMIN")}
              className={`flex items-center justify-center gap-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                role === "ADMIN"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register("email", {
                    required: "This field is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email",
                    },
                  })}
                  type="email"
                  placeholder={
                    role === "ADMIN"
                      ? "admin@pstc.edu"
                      : role === "INSTRUCTOR"
                        ? "farhana.kabir@pstc.edu"
                        : "fahim@example.com"
                  }
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-card-foreground">
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register("password", {
                    required: "This field is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                {...register("rememberMe")}
                type="checkbox"
                id="rememberMe"
                className="w-4 h-4 rounded border-border cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 text-sm text-muted-foreground cursor-pointer"
              >
                Remember me
              </label>
            </div>

            {authError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {authError}
              </p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Sign in as{" "}
              {role === "ADMIN"
                ? "Admin"
                : role === "INSTRUCTOR"
                  ? "Instructor"
                  : "Student"}
            </button>
          </form>

          {role === "STUDENT" && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link
                href="/enroll"
                className="font-medium text-primary hover:underline"
              >
                Create an account
              </Link>
            </p>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Professional Skills Training Center — Learn. Get Certified. Grow.
        </p>
      </div>
    </div>
  );
}
