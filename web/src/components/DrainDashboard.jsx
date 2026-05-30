import { useEffect, useState } from "react";
import { completeDrainInspect, fetchDrainPriority } from "../api/viola";

const RESULT_OPTIONS = ["정상", "이물질 제거", "파손 교체 필요"];

function ScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 75 ? "bg-red-500" : pct >= 50 ? "bg-orange-400" : pct >= 25 ? "bg-yellow-400" : "bg-green-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-gray-500">{pct}</span>
    </div>
  );
}

function TagList({ tags }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
          {t}
        </span>
      ))}
    </div>
  );
}

function InspectModal({ item, onClose, onDone }) {
  const [result, setResult] = useState("정상");
  const [inspector, setInspector] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await completeDrainInspect(item.drain_id, inspector || null, result, note || null);
      onDone(item.drain_id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-gray-800">현장 점검 완료</h3>
        <p className="mb-4 text-sm text-gray-400">{item.address}</p>

        <label className="mb-1 block text-sm font-medium text-gray-700">점검 결과</label>
        <div className="mb-4 flex gap-2">
          {RESULT_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setResult(r)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                result === r
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">담당자</label>
        <input
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          placeholder="이름 (선택)"
          value={inspector}
          onChange={(e) => setInspector(e.target.value)}
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">메모</label>
        <textarea
          className="mb-6 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          rows={2}
          placeholder="특이사항 (선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "처리중…" : "점검 완료 기록"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DrainDashboard({ sigunguCode }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchDrainPriority(sigunguCode)
      .then((data) => setItems(data.items ?? []))
      .catch(() => setError("데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [sigunguCode]);

  function handleDone(drainId) {
    setItems((prev) => prev.filter((i) => i.drain_id !== drainId));
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-center text-sm text-red-500">{error}</p>;
  }

  return (
    <>
      {modalItem && (
        <InspectModal item={modalItem} onClose={() => setModalItem(null)} onDone={handleDone} />
      )}

      <div className="rounded-xl bg-white shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-800">빗물받이 우선점검 리스트</h2>
            <p className="text-xs text-gray-400">위험점수 · 민원 이력 · 침수흔적 기반 정렬</p>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
            {items.length}건
          </span>
        </div>

        {/* 테이블 */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-400">
                <th className="py-3 pl-5 pr-3 text-left font-medium">순위</th>
                <th className="py-3 pr-3 text-left font-medium">위치</th>
                <th className="py-3 pr-3 text-left font-medium">위험점수</th>
                <th className="py-3 pr-3 text-left font-medium">위험 요인</th>
                <th className="py-3 pr-3 text-right font-medium">마지막 점검</th>
                <th className="py-3 pr-5 text-right font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.drain_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 pl-5 pr-3 font-mono text-xs text-gray-400">#{item.rank}</td>
                  <td className="py-3 pr-3">
                    <p className="font-medium text-gray-800">{item.address}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <ScoreBar score={item.risk_score} />
                  </td>
                  <td className="py-3 pr-3">
                    <TagList tags={item.risk_tags} />
                  </td>
                  <td className="py-3 pr-3 text-right text-xs text-gray-500">
                    {item.days_since_inspection >= 0
                      ? `${item.days_since_inspection}일 전`
                      : "기록 없음"}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <button
                      onClick={() => setModalItem(item)}
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-orange-600"
                    >
                      점검 지시
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">점검 대상이 없습니다.</p>
          )}
        </div>
      </div>
    </>
  );
}
