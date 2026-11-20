interface HeaderProps {
  adoptedCount: number;
  onOpenSavedPlan: () => void;
}

export function Header({ adoptedCount, onOpenSavedPlan }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          ClearWinter
        </a>

        <nav
          aria-label="Primary sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#routines"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Routines
          </a>
          <a
            href="#indoor-air"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Indoor Air
          </a>
          <a
            href="#alternatives"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Alternatives
          </a>
          <a
            href="#advisor"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Advisor
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenSavedPlan}
            className="min-h-[40px] rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Saved Plan (<span className="font-mono tabular-nums">{adoptedCount}</span>)
          </button>
        </div>
      </div>
    </header>
  );
}
