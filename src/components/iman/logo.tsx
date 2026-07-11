// Logo Imán (imán herradura, dos tonos). Para deploys white-label,
// reemplazar este componente o usar BusinessProfile.logoUrl.
import { cn } from "@/lib/utils";

export function ImanLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 132"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden
    >
      <path
        d="M34 92 V56 A26 26 0 0 1 86 56 V92"
        fill="none"
        stroke="currentColor"
        strokeWidth="34"
      />
      <path
        d="M34 92 V56 A26 26 0 0 1 86 56 V92"
        fill="none"
        stroke="var(--acento)"
        strokeWidth="21"
      />
      <rect x="13" y="88" width="42" height="20" rx="4" fill="#ffffff" stroke="currentColor" strokeWidth="5" />
      <rect x="65" y="88" width="42" height="20" rx="4" fill="#ffffff" stroke="currentColor" strokeWidth="5" />
      <path
        d="M28 114 l-7 9 M60 117 v10 M92 114 l7 9"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function ImanWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <ImanLogo className="h-6 w-6" />
      <span>
        Im<span className="text-acento">á</span>n
      </span>
    </span>
  );
}
