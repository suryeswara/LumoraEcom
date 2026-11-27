export default function StatCard({ label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <p className="caption-1 text-subtle">{label}</p>
      <p className="heading-5">{value}</p>
      {hint && <p className="caption-2 text-subtle">{hint}</p>}
    </div>
  );
}
