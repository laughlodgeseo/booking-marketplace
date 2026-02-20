export function AuthMotionBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(68%_56%_at_12%_10%,rgba(196,217,243,0.44)_0%,rgba(244,249,255,0.00)_66%),radial-gradient(58%_44%_at_86%_16%,rgba(186,206,236,0.34)_0%,rgba(244,249,255,0.00)_68%),radial-gradient(62%_48%_at_50%_86%,rgba(214,226,244,0.30)_0%,rgba(244,249,255,0.00)_72%),linear-gradient(160deg,#f7fbff_0%,#eef5ff_46%,#f9fbff_100%)]" />
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(94,118,152,0.24)_0.6px,transparent_0.6px),linear-gradient(90deg,rgba(94,118,152,0.2)_0.6px,transparent_0.6px)] [background-size:4px_4px]" />
      <div className="absolute inset-0 bg-[radial-gradient(72%_60%_at_50%_50%,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0)_72%)]" />
    </div>
  );
}
