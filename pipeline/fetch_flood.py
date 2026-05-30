"""
행정안전부 침수흔적도 데이터를 조회하여
가구 좌표 기준 침수 이력 점수를 반환합니다.

API: 공공데이터포털 침수흔적조회서비스
URL: http://apis.data.go.kr/1741000/FloodHistoryService2
"""

import os
import math

import requests
from dotenv import load_dotenv

load_dotenv()

DATA_GO_KR_KEY = os.getenv("DATA_GO_KR_KEY")

FLOOD_API_URL = (
    "http://apis.data.go.kr/1741000/FloodHistoryService2/getFloodHistoryList2"
)

# 침수흔적 반경 기준 (미터)
FLOOD_ZONE_RADIUS_M = 100


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 좌표 사이의 거리를 미터 단위로 반환합니다 (Haversine 공식)."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def fetch_flood_history(sigungu_code: str, page: int = 1, num_rows: int = 100) -> dict:
    """
    시군구 코드 기준 침수흔적 목록을 조회합니다.

    Args:
        sigungu_code: 시군구 코드 5자리 (예: '11650' = 서울 관악구)
    """
    params = {
        "serviceKey": DATA_GO_KR_KEY,
        "pageNo": page,
        "numOfRows": num_rows,
        "type": "json",
        "sigunguCd": sigungu_code,
    }
    resp = requests.get(FLOOD_API_URL, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _extract_records(raw: dict) -> list[dict]:
    """API 응답에서 침수흔적 레코드 목록을 추출합니다."""
    try:
        return raw["response"]["body"]["items"]["item"]
    except (KeyError, TypeError):
        return []


def get_flood_info(lat: float, lon: float, sigungu_code: str) -> dict:
    """
    가구 좌표를 기준으로 침수 이력 정보를 반환합니다.

    Returns:
        {
            "flood_count": int,       # 반경 100m 내 침수 기록 수
            "in_flood_zone": bool,    # 침수흔적도 반경 내 위치 여부
            "nearest_m": float | None # 가장 가까운 침수 지점까지의 거리(m)
        }
    """
    raw = fetch_flood_history(sigungu_code)
    records = _extract_records(raw)

    nearby = []
    for rec in records:
        try:
            rec_lat = float(rec.get("lat") or rec.get("latitude") or 0)
            rec_lon = float(rec.get("lon") or rec.get("longitude") or 0)
        except (ValueError, TypeError):
            continue
        if rec_lat == 0 or rec_lon == 0:
            continue
        dist = _haversine_m(lat, lon, rec_lat, rec_lon)
        if dist <= FLOOD_ZONE_RADIUS_M:
            nearby.append(dist)

    nearest = min(nearby) if nearby else None
    return {
        "flood_count": len(nearby),
        "in_flood_zone": len(nearby) > 0,
        "nearest_m": round(nearest, 1) if nearest is not None else None,
    }


def flood_score_from_coords(lat: float, lon: float, sigungu_code: str) -> dict:
    """
    위도/경도를 입력받아 침수이력 점수 딕셔너리를 반환합니다.
    risk_score.FloodHistory에 바로 넣을 수 있는 형태로 반환됩니다.

    Returns:
        {
            "flood_count": int,
            "in_flood_zone": bool,
            "flood_score_input": FloodHistory  # risk_score 모듈용
        }
    """
    from risk_score import FloodHistory

    info = get_flood_info(lat, lon, sigungu_code)
    flood_history = FloodHistory(
        flood_count=info["flood_count"],
        in_flood_zone=info["in_flood_zone"],
    )
    return {
        **info,
        "flood_history": flood_history,
    }


if __name__ == "__main__":
    # 테스트: 서울 관악구 봉천동
    result = flood_score_from_coords(
        lat=37.4784,
        lon=126.9516,
        sigungu_code="11620",  # 서울 관악구
    )
    print(result)
