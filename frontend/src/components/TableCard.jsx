export default function TableCard({ title, children, action }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
