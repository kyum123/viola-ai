import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { completeVisit, fetchPriorityList } from "../api/viola";

const SIGUNGU_CODE = "11620";

const LEVEL_COLOR = {
  매우위험: "#ef4444",
  위험: "#f97316",
  주의: "#eab308",
  낮음: "#22c55e",
};

function RiskBadge({ level }) {
  const color = LEVEL_COLOR[level] ?? "#6b7280";
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <Text style={[styles.badgeText, { color }]}>{level}</Text>
    </View>
  );
}

function TagRow({ tags }) {
  return (
    <View style={styles.tagRow}>
      {tags.map((t) => (
        <View key={t} style={styles.tag}>
          <Text style={styles.tagText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function HouseholdCard({ item, onComplete }) {
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    Alert.alert(
      "방문 완료",
      `${item.address}\n방문 완료로 처리하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "완료",
          onPress: async () => {
            setCompleting(true);
            try {
              await completeVisit(item.household_id);
              onComplete(item.household_id);
            } catch (_) {
              Alert.alert("오류", "처리 중 문제가 발생했습니다.");
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  }

  function handleCall() {
    // 실제 구현: 가구 전화번호 API에서 불러와 Linking.openURL(`tel:${phone}`) 호출
    Alert.alert("연락하기", `${item.address}\n(전화번호는 별도 권한 필요)`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.rank}>#{item.rank}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
          {item.days_since_last_visit > 0 && (
            <Text style={styles.visitDays}>미방문 {item.days_since_last_visit}일</Text>
          )}
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNum}>{Math.round(item.risk_index * 100)}</Text>
          <Text style={styles.scoreLabel}>점</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <RiskBadge level={item.risk_level} />
        <TagRow tags={item.risk_tags} />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Text style={styles.callBtnText}>📞 연락하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={completing}
        >
          <Text style={styles.completeBtnText}>
            {completing ? "처리중…" : "✅ 방문 완료"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PriorityListScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchPriorityList(SIGUNGU_CODE, 100);
      setItems(data.items ?? []);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function handleComplete(householdId) {
    setItems((prev) => prev.filter((i) => i.household_id !== householdId));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>방문 권고 {items.length}건</Text>
        <Text style={styles.listHeaderSub}>위험지수 내림차순</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.household_id}
        renderItem={({ item }) => (
          <HouseholdCard item={item} onComplete={handleComplete} />
        )}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>방문 권고 가구가 없습니다.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  listHeaderText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  listHeaderSub: { fontSize: 12, color: "#9ca3af" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  rank: { fontSize: 12, color: "#9ca3af", fontFamily: "monospace", marginTop: 2, width: 28 },
  address: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  visitDays: { fontSize: 12, color: "#f97316", marginTop: 2 },
  scoreBox: { alignItems: "center" },
  scoreNum: { fontSize: 22, fontWeight: "800", color: "#1d4ed8" },
  scoreLabel: { fontSize: 11, color: "#9ca3af" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: { backgroundColor: "#f3f4f6", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11, color: "#6b7280" },
  cardActions: { flexDirection: "row", gap: 8 },
  callBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  callBtnText: { color: "#1d4ed8", fontWeight: "600", fontSize: 14 },
  completeBtn: {
    flex: 1,
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  completeBtnDisabled: { opacity: 0.5 },
  completeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 14 },
});
