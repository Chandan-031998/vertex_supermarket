export default function StatCard({ label, value }) {
  return (
    <div className="card stat-card p-4 sm:p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</h3>
    </div>
  );
}
