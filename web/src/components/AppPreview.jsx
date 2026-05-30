import { useState } from "react";
import { MOCK_PRIORITY_LIST, MOCK_RAIN_SCORE } from "../api/mockData";

const LEVEL_COLOR = {
  매우위험: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500" },
  위험:     { bg: "bg-orange-100", text: "text-orange-600", dot: "bg-orange-400" },
  주의:     { bg: "bg-yellow-100", text: "text-yellow-600", dot: "bg-yellow-400" },
  낮음:     { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500" },
};

const SHELTERS = ["관악구청 임시대피소", "봉천동 주민센터"];

// ── 폰 프레임 ──────────────────────────────────────────────────────────────
function PhoneFrame({ title, children }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-sm font-semibold text-gray-600">{title}</p>
      <div className="relative w-[260px] rounded-[36px] border-[6px] border-gray-800 bg-gray-800 shadow-2xl">
        {/* 상단 노치 */}
        <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-gray-900" />
        {/* 화면 */}
        <div className="h-[520px] overflow-hidden rounded-[30px] bg-gray-50">
          {/* 상태바 */}
          <div className="flex items-center justify-between bg-blue-700 px-4 pt-6 pb-2">
            <span className="text-[10px] text-white opacity-80">🌧 비올라</span>
            <span className="text-[10px] text-white opacity-80">11:32</span>
          </div>
          <div className="h-[460px] overflow-y-auto">{children}</div>
        </div>
        {/* 홈 버튼 바 */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-20 rounded-full bg-gray-600" />
        </div>
      </div>
    </div>
  );
}

// ── 화면 1: 침수위험 지도 ─────────────────────────────────────────────────
function FloodMapScreen() {
  const [selected, setSelected] = useState(null);
  const items = MOCK_PRIORITY_LIST.items.slice(0, 8);
  return (
    <div className="relative h-full bg-sky-100">
      {/* 지도 배경 */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-sky-200 to-sky-300">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,#0369a1 0,#0369a1 1px,transparent 0,transparent 40px),repeating-linear-gradient(90deg,#0369a1 0,#0369a1 1px,transparent 0,transparent 40px)" }} />
        {/* 마커들 */}
        {items.map((item) => {
          const c = LEVEL_COLOR[item.risk_level];
          const x = 20 + ((item.lng - 126.90) / 0.07) * 200;
          const y = 10 + ((37.50 - item.lat) / 0.04) * 200;
          return (
            <button key={item.household_id}
              onClick={() => setSelected(selected?.household_id === item.household_id ? null : item)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: x, top: y }}>
              <div className={`h-4 w-4 rounded-full border-2 border-white ${c.dot} shadow`} />
            </button>
          );
        })}
        {/* 범례 */}
        <div className="absolute bottom-2 left-2 rounded-lg bg-white/90 p-1.5 text-[9px] space-y-0.5">
          {Object.entries(LEVEL_COLOR).map(([label, c]) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${c.dot}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 선택된 마커 팝업 */}
      {selected && (
        <div className="mx-3 -mt-4 rounded-xl bg-white p-3 shadow-lg">
          <p className="text-[11px] font-bold text-gray-800 leading-tight">{selected.address}</p>
          <div className="mt-1 flex items-center gap-1">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_COLOR[selected.risk_level].bg} ${LEVEL_COLOR[selected.risk_level].text}`}>
              {selected.risk_level}
            </span>
            <span className="text-[10px] text-gray-500">{Math.round(selected.risk_index * 100)}점</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {selected.risk_tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded bg-gray-100 px-1 text-[9px] text-gray-600">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* 안내 */}
      {!selected && (
        <p className="mt-3 text-center text-[10px] text-gray-400">마커를 탭하면 위험 정보를 볼 수 있어요</p>
      )}
    </div>
  );
}

// ── 화면 2: 귀갓길 우회 안내 ──────────────────────────────────────────────
function RouteGuideScreen() {
  const isWarning = MOCK_RAIN_SCORE.rain_score >= 0.4;
  return (
    <div className="bg-gray-50">
      {/* 경고 배너 */}
      <div className={`flex items-start gap-2 px-3 py-3 ${isWarning ? "bg-red-50" : "bg-green-50"}`}>
        <span className="text-xl">{isWarning ? "⚠️" : "✅"}</span>
        <div>
          <p className="text-[11px] font-bold text-gray-800">
            {isWarning ? "침수 위험 — 귀가 시 주의하세요" : "현재 침수 위험 낮음"}
          </p>
          <p className="text-[10px] text-gray-500">
            6시간 예상 강수량 {MOCK_RAIN_SCORE.precipitation_6h_mm}mm
          </p>
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="mx-3 mt-2 h-28 rounded-xl bg-gradient-to-br from-sky-200 to-sky-300 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,#0369a1 0,#0369a1 1px,transparent 0,transparent 30px),repeating-linear-gradient(90deg,#0369a1 0,#0369a1 1px,transparent 0,transparent 30px)" }} />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="h-5 w-5 rounded-full bg-blue-600 border-2 border-white shadow flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
          {isWarning && <div className="h-16 w-16 rounded-full bg-red-400/30 border border-red-400" />}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {/* 집 출입구 경고 */}
        {isWarning && (
          <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-3">
            <p className="text-[11px] font-bold text-red-700">🚪 집 출입구 침수 주의</p>
            <p className="mt-0.5 text-[10px] text-gray-600 leading-tight">반지하 출입구 침수 가능성. 귀가 전 확인하세요.</p>
          </div>
        )}

        {/* 대피소 */}
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-[11px] font-bold text-gray-800 mb-1">🏫 인근 대피소</p>
          {SHELTERS.map((s) => (
            <p key={s} className="text-[10px] text-gray-600 py-0.5">📍 {s}</p>
          ))}
          <div className="mt-2 rounded-lg bg-blue-600 py-1.5 text-center">
            <span className="text-[10px] font-semibold text-white">지도 앱에서 찾기</span>
          </div>
        </div>

        {/* 행동 요령 */}
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-[11px] font-bold text-gray-800 mb-1">📢 행동 요령</p>
          {["즉시 높은 곳으로 대피", "전기 차단기 내리기", "119 신고"].map((t, i) => (
            <p key={i} className="text-[10px] text-gray-600 py-0.5">{i + 1}. {t}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 화면 3: 방문 우선순위 ─────────────────────────────────────────────────
function PriorityListScreen() {
  const [done, setDone] = useState([]);
  const items = MOCK_PRIORITY_LIST.items.filter((i) => !done.includes(i.household_id));

  return (
    <div className="bg-gray-50">
      <div className="flex items-center justify-between bg-white px-3 py-2 border-b">
        <span className="text-[11px] font-bold text-gray-800">방문 권고 {items.length}건</span>
        <span className="text-[10px] text-gray-400">위험지수 내림차순</span>
      </div>
      <div className="space-y-2 p-2">
        {items.slice(0, 5).map((item) => {
          const c = LEVEL_COLOR[item.risk_level];
          return (
            <div key={item.household_id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400">#{item.rank}</p>
                  <p className="text-[11px] font-semibold text-gray-800 leading-tight">{item.address}</p>
                  {item.days_since_last_visit > 0 && (
                    <p className="text-[10px] text-orange-500">미방문 {item.days_since_last_visit}일</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${c.bg} ${c.text}`}>
                    {item.risk_level}
                  </span>
                  <p className="mt-0.5 text-[13px] font-black text-blue-700">{Math.round(item.risk_index * 100)}</p>
                </div>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <button className="flex-1 rounded-lg border border-blue-600 py-1 text-[10px] font-semibold text-blue-600">
                  📞 연락
                </button>
                <button
                  onClick={() => setDone((p) => [...p, item.household_id])}
                  className="flex-1 rounded-lg bg-blue-600 py-1 text-[10px] font-semibold text-white">
                  ✅ 완료
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-8 text-center text-[11px] text-gray-400">모든 방문을 완료했습니다 🎉</p>
        )}
      </div>
    </div>
  );
}

// ── 탭 네비게이션 ─────────────────────────────────────────────────────────
const SCREENS = [
  { key: "flood", label: "🗺️ 침수 지도", subtitle: "시민용", component: FloodMapScreen },
  { key: "route", label: "🧭 귀갓길 안내", subtitle: "반지하 거주자", component: RouteGuideScreen },
  { key: "priority", label: "📋 방문 우선순위", subtitle: "지자체용", component: PriorityListScreen },
];

export default function AppPreview() {
  const [active, setActive] = useState("flood");

  return (
    <div className="space-y-6">
      {/* 설명 */}
      <div className="rounded-xl bg-blue-50 px-5 py-4">
        <h2 className="font-bold text-gray-800">📱 모바일 앱 미리보기</h2>
        <p className="mt-1 text-sm text-gray-500">
          React Native로 개발된 시민·지자체용 앱 화면입니다. 탭을 눌러 각 화면을 체험해보세요.
        </p>
      </div>

      {/* 화면 탭 선택 (모바일) */}
      <div className="flex gap-2 lg:hidden">
        {SCREENS.map(({ key, label }) => (
          <button key={key} onClick={() => setActive(key)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
              active === key ? "bg-blue-600 text-white" : "bg-white text-gray-500 shadow-sm"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 3개 폰 나란히 (데스크탑) */}
      <div className="hidden lg:flex items-start justify-center gap-8">
        {SCREENS.map(({ key, label, subtitle, component: Screen }) => (
          <div key={key}>
            <PhoneFrame title={`${label}\n(${subtitle})`}>
              <Screen />
            </PhoneFrame>
          </div>
        ))}
      </div>

      {/* 모바일에서는 선택된 화면만 */}
      <div className="flex justify-center lg:hidden">
        {SCREENS.filter((s) => s.key === active).map(({ key, label, subtitle, component: Screen }) => (
          <PhoneFrame key={key} title={`${label} (${subtitle})`}>
            <Screen />
          </PhoneFrame>
        ))}
      </div>
    </div>
  );
}
