"use client";

import { Download } from "lucide-react";

export default function CertificatePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground print:hidden"
    >
      <Download className="h-4 w-4" />
      Print / Save PDF
    </button>
  );
}
