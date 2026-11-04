const STEPS = ["Book", "Pay", "Ticket"] as const;

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;

        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                aria-hidden
                className={`h-px w-4 sm:w-6 ${done ? "bg-accent/70" : "bg-line"}`}
              />
            ) : null}
            <span
              className={`flex items-center gap-1.5 ${
                active ? "text-ink" : done ? "text-accent" : "text-mute/50"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                  active
                    ? "border-accent bg-accent text-white"
                    : done
                      ? "border-accent/60 text-accent"
                      : "border-line text-mute/50"
                }`}
              >
                {done ? "✓" : step}
              </span>
              <span className={active ? "" : "hidden sm:inline"}>{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
