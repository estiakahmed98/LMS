import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle, Globe, Phone } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#showcase", label: "Solutions" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About BOED" },
      { href: "/contact", label: "Contact" },
      { href: "/enroll", label: "Course Catalog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/verify", label: "Verify Certificate" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-card">
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/pstc_logo_3.png"
                alt="BOED LMS"
                width={32}
                height={32}
                className="h-8 w-8 rounded-md object-contain"
              />
              <span className="text-lg font-bold text-foreground">
                BOED <span className="text-primary">LMS</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The complete learning management platform for modern institutions
              — courses, live classes, assessments, and results in one place.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Globe, MessageCircle, Phone, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BOED LMS. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for the Professional Skills Training Center
          </p>
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/2 z-0 -translate-x-1/2 select-none text-[18vw] leading-none font-black whitespace-nowrap text-foreground/3"
      >
        BOED LMS
      </span>
    </footer>
  );
}
