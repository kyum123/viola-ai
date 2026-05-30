const WEIGHTS = [
  { label: "침수 이력", weight: "40%", detail: "과거 침수 횟수, 침수흔적도 반경 100m 내 위치" },
  { label: "취약계층 지수", weight: "35%", detail: "독거·고령·장애 등급·기초수급·마지막 방문 경과일" },
  { label: "강수 예보", weight: "25%", detail: "6시간 예상 강수량, 호우특보 발효 여부" },
];

const DATA_SOURCES = [
  { name: "침수흔적도", org: "행정안전부", use: "과거 침수 이력·위험 구역 식별" },
  { name: "건축행정 DB", org: "국토교통부", use: "반지하 가구 위치·세대수 파악" },
  { name: "단기/초단기 예보", org: "기상청", use: "강수량 예보 기반 실시간 보정" },
  { name: "장애인·독거노인 현황", org: "보건복지부", use: "취약계층 해당 여부 파악" },
  { name: "기초생활수급자 현황", org: "보건복지부", use: "경제적 취약가구 식별" },
  { name: "복지서비스 방문 기록", org: "지자체", use: "장기 미방문 가구 우선 처리" },
];

export default function InfoPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 위험지수 산출 기준 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700">위험지수 산출 기준</h3>
        <p className="mb-3 rounded-lg bg-blue-50 px-4 py-2 font-mono text-xs text-blue-800">
          위험지수 = 침수이력 × 0.40 + 취약계층 × 0.35 + 강수예보 × 0.25
        </p>
        <div className="space-y-3">
          {WEIGHTS.map(({ label, weight, detail }) => (
            <div key={label} className="flex gap-3">
              <span className="mt-0.5 shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {weight}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 활용 공공데이터 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700">활용 공공데이터</h3>
        <div className="space-y-2">
          {DATA_SOURCES.map(({ name, org, use }) => (
            <div key={name} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {org}
              </span>
              <div>
                <span className="font-medium text-gray-800">{name}</span>
                <span className="ml-1 text-xs text-gray-400">— {use}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
