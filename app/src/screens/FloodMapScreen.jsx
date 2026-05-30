import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { fetchPriorityList } from "../api/viola";

const LEVEL_COLOR = {
  매우위험: "#ef4444",
  위험: "#f97316",
  주의: "#eab308",
  낮음: "#22c55e",
};

const SIGUNGU_CODE = "11620"; // 서울 관악구 (실제로는 사용자 위치 기반으로 결정)

export default function FloodMapScreen() {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    })();
  }, []);

  useEffect(() => {
    fetchPriorityList(SIGUNGU_CODE, 200)
      .then((data) => setItems(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initialRegion = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { latitude: 37.4784, longitude: 126.9516, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation>
        {items.map((item) => {
          const color = LEVEL_COLOR[item.risk_level] ?? "#6b7280";
          return (
            <React.Fragment key={item.household_id}>
              <Circle
                center={{ latitude: item.lat, longitude: item.lng }}
                radius={40}
                fillColor={color + "55"}
                strokeColor={color}
                strokeWidth={1}
              />
              <Marker
                coordinate={{ latitude: item.lat, longitude: item.lng }}
                pinColor={color}
                onPress={() => setSelected(item)}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* 범례 */}
      <View style={styles.legend}>
        {Object.entries(LEVEL_COLOR).map(([label, color]) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      )}

      {/* 마커 클릭 팝업 */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalAddress}>{selected?.address}</Text>
            <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLOR[selected?.risk_level] + "22" }]}>
              <Text style={[styles.levelText, { color: LEVEL_COLOR[selected?.risk_level] }]}>
                {selected?.risk_level}  {Math.round((selected?.risk_index ?? 0) * 100)}점
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {selected?.risk_tags?.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.dismissHint}>탭하면 닫힙니다</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  legend: {
    position: "absolute",
    bottom: 24,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: "#374151" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalAddress: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  levelBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { fontSize: 14, fontWeight: "600" },
  tag: { backgroundColor: "#f3f4f6", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 },
  tagText: { fontSize: 12, color: "#6b7280" },
  dismissHint: { marginTop: 16, textAlign: "center", fontSize: 12, color: "#9ca3af" },
});
