import type { LearnerModuleNote } from "@/lib/learner-module-types";
import { NotebookPen } from "lucide-react";

export default function NotesTab({ notes }: { notes: LearnerModuleNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground">
          <NotebookPen className="size-5" />
        </div>
        <h3 className="text-base font-semibold text-card-foreground">
          No notes added yet.
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Notes for this module will appear here once they are available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-lg border border-border p-4 flex gap-3"
        >
          <NotebookPen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-card-foreground mb-1">
              {note.heading}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {note.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
