export default function TableCard({ title, children, action }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-r from-white to-emerald-50/50 px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
        {action}
      </div>
      <div className="overflow-x-auto overscroll-x-contain">{children}</div>
    </div>
  );
}
