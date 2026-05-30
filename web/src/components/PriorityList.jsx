import { useState } from "react";
import { completeVisit } from "../api/viola";

const LEVEL_STYLE = {
  매우위험: "bg-red-100 text-red-700",
  위험: "bg-orange-100 text-orange-700",
  주의: "bg-yellow-100 text-yellow-700",
  낮음: "bg-green-100 text-green-700",
};

function RiskBadge({ level }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level] ?? "bg-gray-100 text-gray-600"}`}
    >
      {level}
    </span>
  );
}

function TagList({ tags }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function PriorityList({ items, loading, onVisitComplete }) {
  const [completing, setCompleting] = useState(null);

  async function handleComplete(householdId) {
    setCompleting(householdId);
    try {
      await completeVisit(householdId);
      onVisitComplete?.(householdId);
    } finally {
      setCompleting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        표시할 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-gray-400">
            <th className="py-2 pr-3 text-left font-medium">순위</th>
            <th className="py-2 pr-3 text-left font-medium">주소</th>
            <th className="py-2 pr-3 text-left font-medium">등급</th>
            <th className="py-2 pr-3 text-left font-medium">위험 요인</th>
            <th className="py-2 pr-3 text-right font-medium">지수</th>
            <th className="py-2 text-right font-medium">처리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.household_id}
              className="border-b last:border-0 hover:bg-gray-50"
            >
              <td className="py-3 pr-3 font-mono text-xs text-gray-400">
                #{item.rank}
              </td>
              <td className="py-3 pr-3">
                <p className="font-medium">{item.address}</p>
                {item.days_since_last_visit > 0 && (
                  <p className="text-xs text-gray-400">
                    미방문 {item.days_since_last_visit}일
                  </p>
                )}
              </td>
              <td className="py-3 pr-3">
                <RiskBadge level={item.risk_level} />
              </td>
              <td className="py-3 pr-3">
                <TagList tags={item.risk_tags} />
              </td>
              <td className="py-3 pr-3 text-right font-mono font-semibold">
                {(item.risk_index * 100).toFixed(0)}
              </td>
              <td className="py-3 text-right">
                <button
                  onClick={() => handleComplete(item.household_id)}
                  disabled={completing === item.household_id}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {completing === item.household_id ? "처리중…" : "방문 완료"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
