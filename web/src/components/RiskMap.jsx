import { useEffect, useRef } from "react";

const LEVEL_COLOR = {
  매우위험: "#ef4444",
  위험: "#f97316",
  주의: "#eab308",
  낮음: "#22c55e",
};

// 카카오맵 마커 SVG (원형, 등급별 색상)
function markerSvg(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export default function RiskMap({ items, center }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    if (!window.kakao?.maps || !containerRef.current) return;

    const defaultCenter = center ?? { lat: 37.5665, lng: 126.978 };
    const latLng = new window.kakao.maps.LatLng(
      defaultCenter.lat,
      defaultCenter.lng
    );
    mapRef.current = new window.kakao.maps.Map(containerRef.current, {
      center: latLng,
      level: 5,
    });
  }, []);

  // 아이템 변경 시 마커 갱신
  useEffect(() => {
    if (!mapRef.current || !items?.length) return;

    // 기존 마커 제거
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

      const content = `
        <div style="padding:8px 12px;font-size:12px;line-height:1.6;min-width:160px">
          <strong>${item.address}</strong><br/>
          등급: <b style="color:${color}">${item.risk_level}</b>
          &nbsp;(${(item.risk_index * 100).toFixed(0)}점)<br/>
          ${item.risk_tags.join(" · ")}
        </div>`;

      window.kakao.maps.event.addListener(marker, "click", () => {
        infowindow.setContent(content);
        infowindow.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [items]);

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-xl">
      <div ref={containerRef} className="h-full w-full" />

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-2 shadow text-xs space-y-1">
        {Object.entries(LEVEL_COLOR).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: color }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* 카카오맵 미로드 fallback */}
      {!window.kakao?.maps && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-sm text-gray-400">
          카카오맵 API 키를 .env에 설정해 주세요.
        </div>
      )}
    </div>
  );
}
