"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  GradingWorkflowConfiguration,
  GradingWorkflowRulePayload,
  GradingWorkflowRuleRow,
} from "@/lib/grading-workflow-types";

const emptyForm: GradingWorkflowRulePayload = {
  name: "",
  courseId: null,
  batchId: null,
  studentId: null,
  makerId: null,
  requiresChecker: false,
  checkerId: null,
  priority: 0,
  active: true,
};

const statusOptions = [
  { value: 0, label: "Low" },
  { value: 250, label: "Medium" },
  { value: 500, label: "High" },
  { value: 1000, label: "Extreme" },
] as const;

function statusValue(priority: number) {
  if (priority >= 1000) return 1000;
  if (priority >= 500) return 500;
  if (priority >= 250) return 250;
  return 0;
}

function statusLabel(priority: number) {
  return (
    statusOptions.find((option) => option.value === statusValue(priority))
      ?.label ?? "Low"
  );
}

export default function GradingWorkflowRules({
  canEdit,
}: {
  canEdit: boolean;
}) {
  const [configuration, setConfiguration] =
    useState<GradingWorkflowConfiguration | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GradingWorkflowRulePayload>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/grading/rules", {
        cache: "no-store",
      });
      if (response.status === 403) {
        setConfiguration(null);
        return;
      }
      const result = await parseApiJson<
        GradingWorkflowConfiguration & { error?: string }
      >(response);
      if (!response.ok)
        throw new Error(result.error ?? "Failed to load workflow rules.");
      setConfiguration(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load workflow rules.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(rule: GradingWorkflowRuleRow) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      courseId: rule.courseId,
      batchId: rule.batchId,
      studentId: rule.studentId,
      makerId: rule.makerId,
      requiresChecker: Boolean(rule.checkerId),
      checkerId: rule.checkerId,
      priority: statusValue(rule.priority),
      active: rule.active,
    });
    setExpanded(true);
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editingId
          ? `/api/admin/grading/rules/${editingId}`
          : "/api/admin/grading/rules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const result = await parseApiJson<{ error?: string }>(response);
      if (!response.ok)
        throw new Error(result.error ?? "Failed to save workflow rule.");
      reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to save workflow rule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(rule: GradingWorkflowRuleRow) {
    if (!window.confirm(`Delete workflow rule “${rule.name}”?`)) return;
    setError(null);
    const response = await fetch(`/api/admin/grading/rules/${rule.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const result = await parseApiJson<{ error?: string }>(response);
      setError(result.error ?? "Failed to delete workflow rule.");
      return;
    }
    if (editingId === rule.id) reset();
    await load();
  }

  if (!loading && !configuration) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <h2 className="text-lg font-bold text-card-foreground">
            Maker–Checker Control
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set global defaults and precise Course + Batch + Student + Maker
            exceptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {configuration?.rules.length ?? 0} rules
          </span>
          {expanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-border p-6">
          {canEdit && configuration ? (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">
                  {editingId ? "Edit rule" : "Create rule"}
                </h3>
                {editingId ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel edit
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Rule name">
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="e.g. Batch A direct approval"
                    className={inputClass}
                  />
                </Field>
                <SelectField
                  label="Course"
                  value={form.courseId}
                  onChange={(value) => setForm({ ...form, courseId: value })}
                  allLabel="All courses"
                  options={configuration.options.courses}
                />
                <SelectField
                  label="Batch"
                  value={form.batchId}
                  onChange={(value) => setForm({ ...form, batchId: value })}
                  allLabel="All batches"
                  options={configuration.options.batches}
                />
                <SelectField
                  label="Student"
                  value={form.studentId}
                  onChange={(value) => setForm({ ...form, studentId: value })}
                  allLabel="All students"
                  options={configuration.options.students}
                />
                <SelectField
                  label="Maker"
                  value={form.makerId}
                  onChange={(value) => setForm({ ...form, makerId: value })}
                  allLabel="Any maker"
                  options={configuration.options.graders}
                />
                <SelectField
                  label="Assigned checker"
                  value={form.checkerId}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      checkerId: value,
                      requiresChecker: Boolean(value),
                    })
                  }
                  allLabel="No checker — direct approval"
                  options={configuration.options.graders.filter(
                    (item) => item.id !== form.makerId,
                  )}
                />
                <Field label="Status">
                  <select
                    value={statusValue(form.priority ?? 0)}
                    onChange={(event) =>
                      setForm({ ...form, priority: Number(event.target.value) })
                    }
                    className={inputClass}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                <input
                  type="checkbox"
                  checked={form.active !== false}
                  onChange={(event) =>
                    setForm({ ...form, active: event.target.checked })
                  }
                />{" "}
                Rule is active
              </label>
              {!form.checkerId ? (
                <p className="text-sm font-medium text-emerald-700">
                  No checker selected: matching submissions will be finalized
                  directly by the Maker.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingId ? "Save changes" : "Add workflow rule"}
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading rules...
            </div>
          ) : configuration?.rules.length ? (
            <div className="grid gap-3">
              {configuration.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between ${rule.active ? "border-border" : "border-dashed border-border opacity-60"}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-card-foreground">
                        {rule.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${rule.checkerId ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        {rule.checkerId
                          ? `Checker: ${rule.checkerName}`
                          : "Direct approval"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Status: {statusLabel(rule.priority)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        rule.courseName && `Course: ${rule.courseName}`,
                        rule.batchName && `Batch: ${rule.batchName}`,
                        rule.studentName && `Student: ${rule.studentName}`,
                        rule.makerName && `Maker: ${rule.makerName}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Global default"}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => edit(rule)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(rule)}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No rules yet. Maker grading will be approved directly by default.
            </p>
          )}
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-card-foreground outline-none focus:border-primary";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-card-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  allLabel: string;
  options: Array<{ id: string; name: string; secondary?: string }>;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className={inputClass}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
            {option.secondary ? ` — ${option.secondary}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}
