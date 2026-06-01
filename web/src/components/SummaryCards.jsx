const CARDS = [
  {
    key: "total",
    label: "관내 반지하 가구",
    unit: "세대",
    color: "border-blue-500",
    icon: "🏠",
  },
  {
    key: "recommended",
    label: "방문 권고",
    unit: "세대",
    color: "border-red-500",
    icon: "📋",
  },
  {
    key: "floodZones",
    label: "침수 위험 구역",
    unit: "구역",
    color: "border-orange-500",
    icon: "⚠️",
  },
  {
    key: "rainfall",
    label: "예상 강수량",
    unit: "mm / 6h",
    color: "border-sky-500",
    icon: "🌧",
  },
  {
    key: "riverLevel",
    label: "하천 수위 위험",
    unit: "점",
    color: "border-teal-500",
    icon: "🌊",
  },
];

export default function SummaryCards({ stats, loading }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {CARDS.map(({ key, label, unit, color, icon }) => (
        <div
          key={key}
          className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${color}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-xl">{icon}</span>
          </div>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-800">
                {stats?.[key] ?? "—"}
              </span>
              <span className="text-sm text-gray-400">{unit}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
