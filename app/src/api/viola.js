import axios from "axios";

// 개발: Expo 에뮬레이터에서 로컬 백엔드 접근 주소
const BASE_URL = "http://10.0.2.2:8000"; // Android 에뮬레이터
// const BASE_URL = "http://localhost:8000"; // iOS 시뮬레이터

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export const fetchPriorityList = (sigunguCode, topN = 50) =>
  api
    .get("/priority-list", { params: { sigungu_code: sigunguCode, top_n: topN } })
    .then((r) => r.data);

export const fetchRisk = (householdId) =>
  api.get(`/risk/${householdId}`).then((r) => r.data);

export const fetchRainScore = (lat, lon) =>
  api.get("/rain-score", { params: { lat, lon } }).then((r) => r.data);

export const completeVisit = (householdId, visitedBy = null, note = null) =>
  api
    .post("/visit-complete", { household_id: householdId, visited_by: visitedBy, note })
    .then((r) => r.data);
