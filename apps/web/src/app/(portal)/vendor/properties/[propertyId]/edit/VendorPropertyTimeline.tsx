"use client";

type TimelineStep = "DRAFT" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
type StepTone = "done" | "current" | "todo";

function normalizeStatus(input: string): string {
  return input.trim().toUpperCase();
}

function stepTone(current: string, step: TimelineStep): StepTone {
  const s = normalizeStatus(current);

  if (step === "DRAFT") {
    if (s === "DRAFT") return "current";
    return "done";
  }

  if (step === "UNDER_REVIEW") {
    if (s === "UNDER_REVIEW") return "current";
    if (s === "DRAFT") return "todo";
    return "done";
  }

  if (step === "CHANGES_REQUESTED") {
    if (s === "CHANGES_REQUESTED") return "current";
    if (s === "DRAFT" || s === "UNDER_REVIEW") return "todo";
    return "done";
  }

  if (step === "APPROVED") {
    if (s === "APPROVED" || s === "APPROVED_PENDING_ACTIVATION_PAYMENT" || s === "PUBLISHED") {
      return "current";
    }
    return "todo";
  }

  return "todo";
}

export function VendorPropertyTimeline(props: { status: string }) {
  const current = props.status;
  const steps: Array<{ key: TimelineStep; title: string; desc: string }> = [
    { key: "DRAFT", title: "Draft", desc: "Prepare listing details, photos, and documents." },
    { key: "UNDER_REVIEW", title: "Under review", desc: "Admin verifies quality and ownership." },
    { key: "CHANGES_REQUESTED", title: "Changes requested", desc: "Apply requested edits and resubmit." },
    { key: "APPROVED", title: "Approved", desc: "Ready for activation/publish workflow." },
  ];

  return (
    <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6">
      <div className="text-sm font-semibold text-primary">Status timeline</div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {steps.map((st) => {
          const tone = stepTone(current, st.key);
          const cls =
            tone === "done"
              ? "border-success/30 bg-success/12"
              : tone === "current"
                ? "border-brand bg-warm-alt"
                : "border-line bg-surface";
          return (
            <div key={st.key} className={`rounded-xl border p-4 ${cls}`}>
              <div className="text-xs font-semibold text-secondary">{st.key}</div>
              <div className="mt-1 text-sm font-semibold text-primary">{st.title}</div>
              <div className="mt-1 text-sm text-secondary">{st.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
