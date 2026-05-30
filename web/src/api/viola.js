import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const fetchPriorityList = (sigunguCode, topN = 50) =>
  api
    .get("/priority-list", { params: { sigungu_code: sigunguCode, top_n: topN } })
    .then((r) => r.data);

export const fetchRisk = (householdId) =>
  api.get(`/risk/${householdId}`).then((r) => r.data);

export const completeVisit = (householdId, visitedBy = null, note = null) =>
  api
    .post("/visit-complete", { household_id: householdId, visited_by: visitedBy, note })
    .then((r) => r.data);

export const fetchRainScore = (lat, lon) =>
  api.get("/rain-score", { params: { lat, lon } }).then((r) => r.data);

export const fetchHealth = () => api.get("/health").then((r) => r.data);

export const fetchDrainPriority = (sigunguCode, topN = 50) =>
  api
    .get("/drain-priority", { params: { sigungu_code: sigunguCode, top_n: topN } })
    .then((r) => r.data);

export const completeDrainInspect = (drainId, inspector = null, result = null, note = null) =>
  api
    .post("/drain-inspect", { drain_id: drainId, inspector, result, note })
    .then((r) => r.data);
