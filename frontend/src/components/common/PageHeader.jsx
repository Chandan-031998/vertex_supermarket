import { LogOut, Menu } from "lucide-react";

export default function PageHeader({
  title,
  subtitle,
  onMenuClick,
  onLogout,
}) {
  return (
    <header className="page-header card relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 md:self-auto"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
