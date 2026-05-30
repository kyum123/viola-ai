import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { fetchRainScore } from "../api/viola";

// 대피소 샘플 데이터 (실제: 행안부 임시주거시설 API 연동)
const SAMPLE_SHELTERS = [
  { id: "s1", name: "관악구청 임시대피소", lat: 37.4784, lng: 126.9516 },
  { id: "s2", name: "봉천동 주민센터", lat: 37.4812, lng: 126.9488 },
];

const WARNING_THRESHOLD = 0.4; // rain_score 이 이상이면 경고

export default function RouteGuideScreen() {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [rainInfo, setRainInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      try {
        const rain = await fetchRainScore(loc.coords.latitude, loc.coords.longitude);
        setRainInfo(rain);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const isWarning = (rainInfo?.rain_score ?? 0) >= WARNING_THRESHOLD;

  function openNaverMap() {
    if (!location) return;
    // 네이버 지도 앱 대피소 검색
    Linking.openURL(`nmap://search?query=임시대피소&lat=${location.latitude}&lng=${location.longitude}`).catch(() =>
      Linking.openURL(`https://map.naver.com/search/임시대피소`)
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>위치 및 날씨 정보를 가져오는 중…</Text>
      </View>
    );
  }

  const region = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : { latitude: 37.4784, longitude: 126.9516, latitudeDelta: 0.015, longitudeDelta: 0.015 };

  return (
    <ScrollView style={styles.container} stickyHeaderIndices={[0]}>
      {/* 경고 배너 */}
      <View style={[styles.banner, isWarning ? styles.bannerWarn : styles.bannerSafe]}>
        <Text style={styles.bannerIcon}>{isWarning ? "⚠️" : "✅"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>
            {isWarning ? "침수 위험 — 귀가 시 주의하세요" : "현재 침수 위험 낮음"}
          </Text>
          {rainInfo && (
            <Text style={styles.bannerSub}>
              6시간 예상 강수량 {rainInfo.precipitation_6h_mm.toFixed(1)}mm
              {rainInfo.heavy_rain_alert ? "  ·  호우특보 발효 중" : ""}
            </Text>
          )}
        </View>
      </View>

      {/* 지도 */}
      <MapView ref={mapRef} style={styles.map} region={region} showsUserLocation>
        {/* 현재 위치 반경 침수 위험 표시 */}
        {isWarning && location && (
          <MapView.Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={200}
            fillColor="rgba(239,68,68,0.15)"
            strokeColor="#ef4444"
            strokeWidth={2}
          />
        )}
        {/* 대피소 마커 */}
        {SAMPLE_SHELTERS.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.name}
            description="임시 대피소"
            pinColor="#3b82f6"
          />
        ))}
      </MapView>

      {/* 안내 카드 */}
      <View style={styles.cardSection}>
        {/* 집 출입구 침수 경고 */}
        {isWarning && (
          <View style={styles.alertCard}>
            <Text style={styles.alertCardTitle}>🚪 집 출입구 침수 주의</Text>
            <Text style={styles.alertCardBody}>
              반지하 출입구 및 채광창을 통한 역류 가능성이 있습니다.{"\n"}
              귀가 전 출입구 침수 여부를 확인하세요.
            </Text>
          </View>
        )}

        {/* 우회 경로 안내 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>🧭 우회 경로 안내</Text>
          <Text style={styles.infoCardBody}>
            침수 위험 구간을 피해 이동하세요.{"\n"}
            지하 보도, 지하차도, 저지대 골목은 피하는 것을 권장합니다.
          </Text>
        </View>

        {/* 대피소 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>🏫 인근 대피소</Text>
          {SAMPLE_SHELTERS.map((s) => (
            <Text key={s.id} style={styles.shelterItem}>
              📍 {s.name}
            </Text>
          ))}
          <TouchableOpacity style={styles.mapButton} onPress={openNaverMap}>
            <Text style={styles.mapButtonText}>지도 앱에서 대피소 찾기</Text>
          </TouchableOpacity>
        </View>

        {/* 행동 요령 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>📢 침수 시 행동 요령</Text>
          {[
            "즉시 높은 곳으로 대피하세요",
            "전기 차단기를 내리세요",
            "119 또는 지자체 재난안전대책본부에 신고하세요",
            "침수된 도로·지하 공간에 진입하지 마세요",
          ].map((tip, i) => (
            <Text key={i} style={styles.tipItem}>
              {i + 1}. {tip}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#6b7280", fontSize: 14 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  bannerWarn: { backgroundColor: "#fef2f2" },
  bannerSafe: { backgroundColor: "#f0fdf4" },
  bannerIcon: { fontSize: 28 },
  bannerTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  bannerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  map: { height: 240, marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  cardSection: { padding: 16, gap: 12 },
  alertCard: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
  },
  alertCardTitle: { fontSize: 15, fontWeight: "700", color: "#b91c1c", marginBottom: 6 },
  alertCardBody: { fontSize: 13, color: "#374151", lineHeight: 20 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  infoCardBody: { fontSize: 13, color: "#374151", lineHeight: 20 },
  shelterItem: { fontSize: 13, color: "#374151", paddingVertical: 3 },
  mapButton: {
    marginTop: 10,
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  mapButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  tipItem: { fontSize: 13, color: "#374151", paddingVertical: 3, lineHeight: 20 },
});
