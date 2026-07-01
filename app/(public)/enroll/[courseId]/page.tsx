"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
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
} from "lucide-react";
import PublicNav from "@/components/learner/PublicNav";
import { getCourseById } from "@/lib/mock-data";

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

  const course = getCourseById(courseId);
  if (!course) notFound();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    getValues,
    formState: { errors },
  } = useForm<OnboardingFormData>();

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

  function onSubmit() {
    // Mock account creation - no backend yet
    setSubmitted(true);
  }

  const password = watch("password");

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="mx-auto max-w-lg p-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2">
            Account Created!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your account and enrollment for <strong>{course.title}</strong>{" "}
            have been submitted. Sign in to track your enrollment status.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
          >
            Go to Login
          </Link>
        </main>
      </div>
    );
  }

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

        <p className="text-xs font-semibold text-primary mb-1">
          ENROLLING IN
        </p>
        <h1 className="text-2xl font-bold text-card-foreground mb-8">
          {course.title}
        </h1>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <div key={s.title} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
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
          className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-5"
        >
          {step === 0 && (
            <>
              <h2 className="text-lg font-bold text-card-foreground mb-1">
                Personal Information
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tell us a bit about yourself.
              </p>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  {...register("fullName", { required: "Full name is required" })}
                  type="text"
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
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
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1.5">
                    Phone
                  </label>
                  <input
                    {...register("phone", { required: "Phone is required" })}
                    type="tel"
                    placeholder="+880 1XXXXXXXXX"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    {...register("dateOfBirth", {
                      required: "Date of birth is required",
                    })}
                    type="date"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <h2 className="text-lg font-bold text-card-foreground mb-1">
                Address & Identification
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                We need this to verify your identity for certification.
              </p>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  National ID (NID) Number
                </label>
                <input
                  {...register("nidNumber", {
                    required: "NID number is required",
                  })}
                  type="text"
                  placeholder="e.g. 1990123456789"
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.nidNumber && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.nidNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  Address
                </label>
                <textarea
                  {...register("address", { required: "Address is required" })}
                  rows={2}
                  placeholder="House, Road, Area"
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1.5">
                    City
                  </label>
                  <input
                    {...register("city", { required: "City is required" })}
                    type="text"
                    placeholder="e.g. Dhaka"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1.5">
                    Postal Code
                  </label>
                  <input
                    {...register("postalCode", {
                      required: "Postal code is required",
                    })}
                    type="text"
                    placeholder="e.g. 1207"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <h2 className="text-lg font-bold text-card-foreground mb-1">
                Account Security
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a profile photo and set a password for your account.
              </p>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {photoPreview ? (
                      <Image
                        src={photoPreview}
                        alt="Profile preview"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4" />
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
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
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
                    className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
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

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
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
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <h2 className="text-lg font-bold text-card-foreground mb-1">
                Review & Confirm
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Please review your details before creating your account. You
                can edit any section below.
              </p>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex justify-between gap-4 px-4 py-2.5 text-sm bg-muted/50">
                  <dt className="text-muted-foreground">Course</dt>
                  <dd className="text-card-foreground font-medium text-right">
                    {course.title}
                  </dd>
                </div>
              </div>

              {reviewSections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-lg border border-border overflow-hidden mt-4"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                    <p className="text-sm font-semibold text-card-foreground">
                      {section.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(section.step)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                  <dl className="divide-y divide-border">
                    {section.rows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 px-4 py-2.5 text-sm"
                      >
                        <dt className="text-muted-foreground shrink-0">
                          {label}
                        </dt>
                        <dd className="text-card-foreground text-right break-words">
                          {value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="px-5 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
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
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                Create Account
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
