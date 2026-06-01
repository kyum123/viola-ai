import { useEffect, useRef, useState } from "react";

const LEVEL_COLOR = {
  매우위험: "#ef4444",
  위험: "#f97316",
  주의: "#eab308",
  낮음: "#22c55e",
};

// 행안부 생활안전지도 WMS (공개 API, 키 불필요)
const WMS_BASE = "https://safemap.go.kr/wmservice/safemap";
const WMS_OPTIONS = [
  { value: "",             label: "레이어 없음" },
  { value: "A2SM_FLOODDMG", label: "침수흔적도" },
  { value: "A2SM_FLOODMAP", label: "도시침수지도" },
  { value: "A2SM_RIVRISK",  label: "하천범람지도" },
];

function buildWmsUrl(map, layer) {
  try {
    const bounds = map.getBounds();
    if (!bounds) return null;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const size = map.getSize();
    const params = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetMap",
      LAYERS: layer,
      SRS: "EPSG:4326",
      BBOX: `${sw.getLng()},${sw.getLat()},${ne.getLng()},${ne.getLat()}`,
      WIDTH: size.width,
      HEIGHT: size.height,
      FORMAT: "image/png",
      TRANSPARENT: "true",
      STYLES: "",
    });
    return `${WMS_BASE}?${params}`;
  } catch {
    return null;
  }
}

function markerSvg(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function shelterSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
    <rect x="2" y="2" width="18" height="18" rx="4" fill="#10b981" stroke="white" stroke-width="2"/>
    <text x="11" y="15" font-size="13" fill="white" text-anchor="middle" font-weight="bold">+</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function loadKakaoSdk(appKey) {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) { resolve(); return; }
    if (document.querySelector('script[src*="dapi.kakao.com"]')) {
      const timer = setInterval(() => {
        if (window.kakao?.maps) { clearInterval(timer); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function RiskMap({ items, shelters, center }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const shelterMarkersRef = useRef([]);
  const wmsImgRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [wmsLayer, setWmsLayer] = useState("A2SM_FLOODDMG");
  const [shelterVisible, setShelterVisible] = useState(false);

  // SDK 동적 로드
  useEffect(() => {
    const key = import.meta.env.VITE_KAKAO_MAP_KEY;
    if (!key) { setError(true); return; }
    loadKakaoSdk(key)
      .then(() => setReady(true))
      .catch(() => setError(true));
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const defaultCenter = center ?? { lat: 37.4812, lng: 126.9290 };
    mapRef.current = new window.kakao.maps.Map(containerRef.current, {
      center: new window.kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
      level: 5,
    });
  }, [ready]);

  // WMS 오버레이 img 생성 (카카오맵 컨테이너 내, z-index 150 — 타일 위, 마커 아래)
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const img = document.createElement("img");
    img.alt = "행안부 침수지도";
    Object.assign(img.style, {
      position: "absolute",
      top: "0", right: "0", bottom: "0", left: "0",
      width: "100%", height: "100%",
      pointerEvents: "none",
      opacity: "0.45",
      zIndex: "150",
      display: "none",
    });
    img.onerror = () => { img.style.display = "none"; };
    containerRef.current.appendChild(img);
    wmsImgRef.current = img;
    return () => img.remove();
  }, [ready]);

  // WMS URL 갱신 (레이어 선택 또는 지도 이동·줌 시)
  useEffect(() => {
    if (!ready || !mapRef.current || !wmsImgRef.current) return;
    const img = wmsImgRef.current;

    function update() {
      if (wmsLayer) {
        const url = buildWmsUrl(mapRef.current, wmsLayer);
        if (!url) return;
        img.src = url;
        img.style.display = "";
      } else {
        img.style.display = "none";
      }
    }

    update();
    window.kakao.maps.event.addListener(mapRef.current, "idle", update);
    return () => window.kakao.maps.event.removeListener(mapRef.current, "idle", update);
  }, [ready, wmsLayer]);

  // 위험 가구 마커 갱신
  useEffect(() => {
    if (!mapRef.current || !items?.length) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const infowindow = new window.kakao.maps.InfoWindow({ zIndex: 1 });

    items.forEach((item) => {
      const color = LEVEL_COLOR[item.risk_level] ?? "#6b7280";
      const position = new window.kakao.maps.LatLng(item.lat, item.lng);
      const marker = new window.kakao.maps.Marker({
        position,
        image: new window.kakao.maps.MarkerImage(
          markerSvg(color),
          new window.kakao.maps.Size(20, 20),
          { offset: new window.kakao.maps.Point(10, 10) }
        ),
      });
      marker.setMap(mapRef.current);

      const tagBadges = item.risk_tags
        .map((t) => `<span style="display:inline-block;white-space:nowrap;background:#f3f4f6;border-radius:4px;padding:1px 5px;margin:2px 2px 0 0">${t}</span>`)
        .join("");
      const content = `
        <div style="padding:8px 12px;font-size:12px;line-height:1.6;min-width:220px;max-width:280px;word-break:keep-all">
          <strong>${item.address}</strong><br/>
          등급: <b style="color:${color}">${item.risk_level}</b>
          &nbsp;(${(item.risk_index * 100).toFixed(0)}점)<br/>
          <div style="margin-top:4px">${tagBadges}</div>
        </div>`;

      window.kakao.maps.event.addListener(marker, "click", () => {
        infowindow.setContent(content);
        infowindow.open(mapRef.current, marker);
      });
      markersRef.current.push(marker);
    });
  }, [items, ready]);

  // 민방위 대피시설 마커 갱신
  useEffect(() => {
    if (!mapRef.current) return;
    shelterMarkersRef.current.forEach((m) => m.setMap(null));
    shelterMarkersRef.current = [];

    if (!shelterVisible || !shelters?.length) return;

    const infowindow = new window.kakao.maps.InfoWindow({ zIndex: 1 });

    shelters.forEach((shelter) => {
      const position = new window.kakao.maps.LatLng(shelter.lat, shelter.lng);
      const marker = new window.kakao.maps.Marker({
        position,
        image: new window.kakao.maps.MarkerImage(
          shelterSvg(),
          new window.kakao.maps.Size(22, 22),
          { offset: new window.kakao.maps.Point(11, 11) }
        ),
      });
      marker.setMap(mapRef.current);

      const content = `
        <div style="padding:8px 12px;font-size:12px;line-height:1.6;min-width:180px;word-break:keep-all">
          <strong style="color:#10b981">🏥 ${shelter.name}</strong><br/>
          ${shelter.address}<br/>
          <span style="font-size:11px;color:#6b7280">수용 ${shelter.capacity}명 · 민방위 대피시설</span>
        </div>`;

      window.kakao.maps.event.addListener(marker, "click", () => {
        infowindow.setContent(content);
        infowindow.open(mapRef.current, marker);
      });
      shelterMarkersRef.current.push(marker);
    });
  }, [shelters, shelterVisible, ready]);

  const selectedLabel = WMS_OPTIONS.find((o) => o.value === wmsLayer)?.label;

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-xl">
      <div ref={containerRef} className="h-full w-full" />

      {/* 상단 컨트롤: WMS 레이어 선택 + 대피소 토글 */}
      {ready && (
        <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-1.5">
          <select
            value={wmsLayer}
            onChange={(e) => setWmsLayer(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium shadow"
          >
            {WMS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShelterVisible((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium shadow transition ${
              shelterVisible
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            🏥 대피소 {shelterVisible ? "ON" : "OFF"}
          </button>
        </div>
      )}

      {/* 범례 */}
      {ready && (
        <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-white/90 px-3 py-2 shadow text-xs space-y-1">
          {Object.entries(LEVEL_COLOR).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))}
          {wmsLayer && (
            <div className="mt-1 border-t pt-1 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded opacity-60" style={{ background: "#3b82f6" }} />
              {selectedLabel} (행안부)
            </div>
          )}
          {shelterVisible && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded" style={{ background: "#10b981" }} />
              민방위 대피시설
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-sm text-gray-400">
          카카오맵 API 키를 .env에 설정해 주세요.
        </div>
      )}
    </div>
  );
}
