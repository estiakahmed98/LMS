import type { LearnerModuleNote } from "@/lib/learner-module-types";
import { NotebookPen } from "lucide-react";

export default function NotesTab({ notes }: { notes: LearnerModuleNote[] }) {
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
