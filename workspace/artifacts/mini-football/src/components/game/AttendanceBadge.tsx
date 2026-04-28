import { CheckCircle2, HelpCircle } from "lucide-react";

export function AttendanceBadge({
  attendance,
  className = "",
}: {
  attendance: "confirmed" | "tentative";
  className?: string;
}) {
  if (attendance === "tentative") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${className}`}
        title="Might come"
      >
        <HelpCircle className="w-3 h-3" />
        Maybe
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${className}`}
      title="Confirmed"
    >
      <CheckCircle2 className="w-3 h-3" />
      Confirmed
    </span>
  );
}
