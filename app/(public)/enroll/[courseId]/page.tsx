"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import {
  Check,
  ChevronLeft,
  User,
  MapPin,
  ShieldCheck,
  ClipboardCheck,
  Pencil,
  Upload,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import PublicNav from "@/components/learner/PublicNav";

interface Course {
  id: string;
  title: string;
  description: string;
  durationHours: number;
}

interface OnboardingFormData {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nidNumber: string;
  address: string;
  city: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
}

const steps = [
  { title: "Personal Info", icon: User },
  { title: "Address & ID", icon: MapPin },
  { title: "Account Security", icon: ShieldCheck },
  { title: "Review & Confirm", icon: ClipboardCheck },
];

export default function CourseOnboardingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);

  const [course, setCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    getValues,
    formState: { errors },
  } = useForm<OnboardingFormData>();

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoadingCourse(true);
        setCourseError(null);

        const response = await fetch(`/api/public/courses/${courseId}`, {
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Course not found.");
        }

        setCourse(result.course);
      } catch (error) {
        setCourseError(
          error instanceof Error ? error.message : "Course not found.",
        );
      } finally {
        setLoadingCourse(false);
      }
    }

    loadCourse();
  }, [courseId]);

  const stepFields: (keyof OnboardingFormData)[][] = [
    ["fullName", "email", "phone", "dateOfBirth"],
    ["nidNumber", "address", "city", "postalCode"],
    ["password", "confirmPassword"],
    [],
  ];

  async function goNext() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: OnboardingFormData) {
    if (!course) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          nidNumber: data.nidNumber,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          password: data.password,
          courseId: course.id,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | { user: { email: string } }
        | null;

      if (!response.ok) {
        const message =
          result && "error" in result && result.error
            ? result.error
            : "Failed to create your account.";
        throw new Error(message);
      }

      const loginResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (loginResult?.error) {
        throw new Error("Account created but login failed.");
      }

      window.location.href = "/courses";
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create your account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const password = watch("password");

  const reviewSections = [
    {
      step: 0,
      title: "Personal Info",
      rows: [
        ["Full Name", getValues("fullName")],
        ["Email", getValues("email")],
        ["Phone", getValues("phone")],
        ["Date of Birth", getValues("dateOfBirth")],
      ],
    },
    {
      step: 1,
      title: "Address & ID",
      rows: [
        ["NID Number", getValues("nidNumber")],
        ["Address", getValues("address")],
        ["City", getValues("city")],
        ["Postal Code", getValues("postalCode")],
      ],
    },
    {
      step: 2,
      title: "Account Security",
      rows: [
        ["Profile Photo", photoPreview ? "Uploaded" : "Not uploaded"],
        ["Password", getValues("password") ? "••••••••" : "—"],
      ],
    },
  ];

  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="mx-auto max-w-2xl p-6 py-20 text-center">
          <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading course...</p>
        </main>
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="mx-auto max-w-lg p-6 py-20 text-center">
          <h1 className="mb-2 text-xl font-bold text-card-foreground">
            Course not found
          </h1>
          <p className="mb-6 text-muted-foreground">
            {courseError || "This course is not available."}
          </p>
          <Link
            href="/enroll"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back to Course Catalog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="mx-auto max-w-2xl p-6 py-10">
        <Link
          href="/enroll"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ChevronLeft size={16} />
          Back to Course Catalog
        </Link>

        <p className="mb-1 text-xs font-semibold text-primary">ENROLLING IN</p>
        <h1 className="mb-8 text-2xl font-bold text-card-foreground">
          {course.title}
        </h1>

        <div className="mb-8 flex items-center">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isDone = idx < step;

            return (
              <div
                key={s.title}
                className="flex flex-1 items-center last:flex-none"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : isActive
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  <span
                    className={`whitespace-nowrap text-xs font-medium ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    className={`mx-3 h-0.5 flex-1 ${
                      isDone ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-xl border border-border bg-card p-6 sm:p-8"
        >
          {step === 0 && (
            <>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Personal Information
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Tell us a bit about yourself.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Full Name
                </label>
                <input
                  {...register("fullName", {
                    required: "Full name is required",
                  })}
                  type="text"
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Email
                </label>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email",
                    },
                  })}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                    Phone
                  </label>
                  <input
                    {...register("phone", { required: "Phone is required" })}
                    type="tel"
                    placeholder="+880 1XXXXXXXXX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                    Date of Birth
                  </label>
                  <input
                    {...register("dateOfBirth", {
                      required: "Date of birth is required",
                    })}
                    type="date"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Address & Identification
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                We need this to verify your identity for certification.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  National ID (NID) Number
                </label>
                <input
                  {...register("nidNumber", {
                    required: "NID number is required",
                  })}
                  type="text"
                  placeholder="e.g. 1990123456789"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.nidNumber && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.nidNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Address
                </label>
                <textarea
                  {...register("address", { required: "Address is required" })}
                  rows={2}
                  placeholder="House, Road, Area"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                    City
                  </label>
                  <input
                    {...register("city", { required: "City is required" })}
                    type="text"
                    placeholder="e.g. Dhaka"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                    Postal Code
                  </label>
                  <input
                    {...register("postalCode", {
                      required: "Postal code is required",
                    })}
                    type="text"
                    placeholder="e.g. 1207"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.postalCode.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Account Security
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload a profile photo and set a password for your account.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Profile Photo
                </label>

                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    {photoPreview ? (
                      <Image
                        src={photoPreview}
                        alt="Profile preview"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Password
                </label>

                <div className="relative">
                  <input
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Confirm Password
                </label>
                <input
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  })}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mb-1 text-lg font-bold text-card-foreground">
                Review & Confirm
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Please review your details before creating your account. You can
                edit any section below.
              </p>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex justify-between gap-4 bg-muted/50 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">Course</dt>
                  <dd className="text-right font-medium text-card-foreground">
                    {course.title}
                  </dd>
                </div>
              </div>

              {reviewSections.map((section) => (
                <div
                  key={section.title}
                  className="mt-4 overflow-hidden rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
                    <p className="text-sm font-semibold text-card-foreground">
                      {section.title}
                    </p>

                    <button
                      type="button"
                      onClick={() => setStep(section.step)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>

                  <dl className="divide-y divide-border">
                    {section.rows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 px-4 py-2.5 text-sm"
                      >
                        <dt className="shrink-0 text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="break-words text-right text-card-foreground">
                          {value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </>
          )}

          {submitError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-between pt-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Create Account
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}