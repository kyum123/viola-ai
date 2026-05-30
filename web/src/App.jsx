import { useEffect, useState } from "react";
import { fetchPriorityList, fetchRainScore } from "./api/viola";
import DrainDashboard from "./components/DrainDashboard";
import InfoPanel from "./components/InfoPanel";
import PriorityList from "./components/PriorityList";
import RiskMap from "./components/RiskMap";
import SummaryCards from "./components/SummaryCards";

const DEFAULT_SIGUNGU = import.meta.env.VITE_DEFAULT_SIGUNGU ?? "11620";

const TABS = [
  { key: "visit", label: "🏠 방문 우선순위" },
  { key: "drain", label: "🌀 빗물받이 점검" },
];

function computeStats(items, rainfallMm) {
  return {
    total: items.length,
    recommended: items.filter((i) => i.risk_level === "매우위험" || i.risk_level === "위험").length,
    floodZones: items.filter((i) => i.risk_tags.includes("침수위험구역")).length,
    rainfall: rainfallMm != null ? rainfallMm.toFixed(1) : "—",
  };
}

export default function App() {
  const [tab, setTab] = useState("visit");
  const [items, setItems] = useState([]);
  const [rainfall, setRainfall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [listData, rainData] = await Promise.all([
        fetchPriorityList(DEFAULT_SIGUNGU, 100),
        fetchRainScore(37.4812, 126.9290),
      ]);
      setItems(listData.items ?? []);
      setRainfall(rainData.precipitation_6h_mm ?? null);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleVisitComplete(householdId) {
    setItems((prev) => prev.filter((i) => i.household_id !== householdId));
  }

  const stats = computeStats(items, rainfall);

  return (
    <div className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="bg-blue-700 px-6 py-4 text-white shadow">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              🌧 비올라 <span className="font-light">Viola</span>
            </h1>
            <p className="text-xs text-blue-200">반지하 침수취약계층 우선방문 추천 AI</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {lastUpdated && (
              <span className="text-blue-200">
                갱신: {lastUpdated.toLocaleTimeString("ko-KR")}
              </span>
            )}
            <button
              onClick={load}
              className="rounded-lg border border-blue-400 px-3 py-1.5 text-sm hover:bg-blue-600 transition"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="mx-auto mt-3 flex max-w-screen-xl gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-white text-blue-700"
                  : "text-blue-200 hover:bg-blue-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl flex-1 space-y-6 px-6 py-6">
        {tab === "visit" && (
          <>
            <SummaryCards stats={stats} loading={loading} />

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <h2 className="mb-3 font-semibold text-gray-700">침수 위험 지도</h2>
                  <div className="h-[460px]">
                    <RiskMap items={items} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">AI 방문 우선순위</h2>
                    <span className="text-xs text-gray-400">총 {items.length}건</span>
                  </div>
                  <div className="max-h-[460px] overflow-y-auto">
                    <PriorityList
                      items={items}
                      loading={loading}
                      onVisitComplete={handleVisitComplete}
                    />
                  </div>
                </div>
              </div>
            </div>

            <InfoPanel />
          </>
        )}

        {tab === "drain" && (
          <DrainDashboard sigunguCode={DEFAULT_SIGUNGU} />
        )}
      </main>

      <footer className="border-t bg-white px-6 py-4 text-center text-xs text-gray-400">
        비올라(Viola) — 공공데이터 활용 창업경진대회 출품작
      </footer>
    </div>
  );
}
