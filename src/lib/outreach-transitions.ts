export type OutreachStatus = "DRAFT" | "SENT" | "REPLIED" | "INCOMPLETE" | "DONE";

const LEGAL_TRANSITIONS: Record<OutreachStatus, OutreachStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["REPLIED", "DONE"],
  REPLIED: ["INCOMPLETE", "DONE"],
  INCOMPLETE: ["REPLIED", "DONE"],
  DONE: [],
};

export function assertValidTransition(from: OutreachStatus, to: OutreachStatus): void {
  const allowed = LEGAL_TRANSITIONS[from];
  if (!allowed) {
    throw new Error(`Unknown source status: ${from}`);
  }
  if (!allowed.includes(to)) {
    throw new Error(
      `Illegal status transition: ${from} → ${to}. Allowed from ${from}: [${allowed.join(", ") || "none"}]`
    );
  }
}
