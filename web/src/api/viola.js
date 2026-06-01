import axios from "axios";
import { MOCK_DRAIN_PRIORITY, MOCK_PRIORITY_LIST, MOCK_RAIN_SCORE, MOCK_SHELTER_LIST } from "./mockData";

// true → mock 데이터 (백엔드 없이 데모 가능)
// false → 실제 FastAPI 백엔드 호출
const USE_MOCK = true;

const api = axios.create({ baseURL: "/api" });

export const fetchPriorityList = (sigunguCode, topN = 50) =>
  USE_MOCK
    ? Promise.resolve(MOCK_PRIORITY_LIST)
    : api.get("/priority-list", { params: { sigungu_code: sigunguCode, top_n: topN } }).then((r) => r.data);

export const fetchRisk = (householdId) =>
  api.get(`/risk/${householdId}`).then((r) => r.data);

export const completeVisit = (householdId, visitedBy = null, note = null) =>
  USE_MOCK
    ? Promise.resolve({ household_id: householdId, message: "방문 완료가 기록되었습니다." })
    : api.post("/visit-complete", { household_id: householdId, visited_by: visitedBy, note }).then((r) => r.data);

export const fetchRainScore = (lat, lon) =>
  USE_MOCK
    ? Promise.resolve(MOCK_RAIN_SCORE)
    : api.get("/rain-score", { params: { lat, lon } }).then((r) => r.data);

export const fetchHealth = () => api.get("/health").then((r) => r.data);

export const fetchDrainPriority = (sigunguCode, topN = 50) =>
  USE_MOCK
    ? Promise.resolve(MOCK_DRAIN_PRIORITY)
    : api.get("/drain-priority", { params: { sigungu_code: sigunguCode, top_n: topN } }).then((r) => r.data);

export const completeDrainInspect = (drainId, inspector = null, result = null, note = null) =>
  USE_MOCK
    ? Promise.resolve({ drain_id: drainId, message: "점검 완료가 기록되었습니다." })
    : api.post("/drain-inspect", { drain_id: drainId, inspector, result, note }).then((r) => r.data);

export const fetchShelterList = (sigunguCode) =>
  USE_MOCK
    ? Promise.resolve(MOCK_SHELTER_LIST)
    : api.get("/shelters", { params: { sigungu_code: sigunguCode } }).then((r) => r.data);
