"""
기상청 단기/초단기예보 API로 강수 예보 데이터를 수집하고
위험지수 산출에 필요한 강수예보 점수(0~1)를 반환합니다.
"""

import math
import os

import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

KMA_API_KEY = os.getenv("KMA_API_KEY")

ULTRA_SRT_FCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst"
)
VILAGE_FCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
)

# KMA 격자 변환 상수 (기상청 공식 제공값)
_RE = 6371.00877
_GRID = 5.0
_SLAT1, _SLAT2 = 30.0, 60.0
_OLON, _OLAT = 126.0, 38.0
_XO, _YO = 43, 136


def latlon_to_grid(lat: float, lon: float) -> tuple[int, int]:
    """위도/경도 → 기상청 격자 좌표(nx, ny) 변환."""
    DEGRAD = math.pi / 180.0
    re = _RE / _GRID
    slat1 = _SLAT1 * DEGRAD
    slat2 = _SLAT2 * DEGRAD
    olon = _OLON * DEGRAD
    olat = _OLAT * DEGRAD

    sn = math.log(math.cos(slat1) / math.cos(slat2))
    sn /= math.log(
        math.tan(math.pi * 0.25 + slat2 * 0.5)
        / math.tan(math.pi * 0.25 + slat1 * 0.5)
    )
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = (sf**sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / (ro**sn)

    ra = math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5)
    ra = re * sf / (ra**sn)
    theta = lon * DEGRAD - olon
    if theta > math.pi:
        theta -= 2.0 * math.pi
    if theta < -math.pi:
        theta += 2.0 * math.pi
    theta *= sn

    nx = int(ra * math.sin(theta) + _XO + 0.5)
    ny = int(ro - ra * math.cos(theta) + _YO + 0.5)
    return nx, ny


def _base_time_ultra() -> tuple[str, str]:
    """초단기예보 base_date/base_time 계산 (매 시 30분 발표, 45분 이후 조회 가능)."""
    now = datetime.now()
    if now.minute < 45:
        base = now - timedelta(hours=1)
        base_time = f"{base.hour:02d}30"
        base_date = base.strftime("%Y%m%d")
    else:
        base_time = f"{now.hour:02d}30"
        base_date = now.strftime("%Y%m%d")
    return base_date, base_time


def _base_time_vilage() -> tuple[str, str]:
    """단기예보 base_date/base_time 계산 (3시간 단위, 발표 10분 뒤 조회 가능)."""
    base_hours = [2, 5, 8, 11, 14, 17, 20, 23]
    now = datetime.now() - timedelta(minutes=10)
    for h in reversed(base_hours):
        if now.hour > h or (now.hour == h and now.minute >= 0):
            return now.strftime("%Y%m%d"), f"{h:02d}00"
    # 자정 이전이면 전날 23시 발표분
    yesterday = now - timedelta(days=1)
    return yesterday.strftime("%Y%m%d"), "2300"


def _get(url: str, params: dict) -> dict:
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def fetch_ultra_short_forecast(nx: int, ny: int) -> dict:
    """초단기예보 (향후 6시간) 원본 JSON 반환."""
    base_date, base_time = _base_time_ultra()
    return _get(
        ULTRA_SRT_FCST_URL,
        {
            "serviceKey": KMA_API_KEY,
            "pageNo": 1,
            "numOfRows": 60,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        },
    )


def fetch_short_forecast(nx: int, ny: int) -> dict:
    """단기예보 원본 JSON 반환."""
    base_date, base_time = _base_time_vilage()
    return _get(
        VILAGE_FCST_URL,
        {
            "serviceKey": KMA_API_KEY,
            "pageNo": 1,
            "numOfRows": 200,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        },
    )


def _items(data: dict) -> list[dict]:
    return (
        data.get("response", {})
        .get("body", {})
        .get("items", {})
        .get("item", [])
    )


def _parse_precipitation_6h(ultra_data: dict) -> float:
    """초단기예보 RN1 카테고리에서 향후 6시간 누적 강수량(mm) 추출."""
    total = 0.0
    for item in _items(ultra_data):
        if item.get("category") != "RN1":
            continue
        val = item.get("fcstValue", "강수없음")
        if val in ("강수없음", "-"):
            continue
        if "미만" in val:
            total += 0.5
        elif "이상" in val:
            total += float(val.replace("mm 이상", "").strip())
        elif "~" in val:
            lo, hi = val.replace("mm", "").split("~")
            total += (float(lo) + float(hi)) / 2
        else:
            try:
                total += float(val.replace("mm", "").strip())
            except ValueError:
                pass
    return total


def _parse_heavy_rain_alert(short_data: dict) -> bool:
    """단기예보에서 호우 위험 여부 판단 (강수확률 ≥ 80% AND 강수형태 = 비)."""
    items = _items(short_data)[:48]  # 향후 6시간(3h×2구간)
    pop_high = any(
        it.get("category") == "POP" and int(it.get("fcstValue", 0)) >= 80
        for it in items
    )
    pty_rain = any(
        it.get("category") == "PTY" and it.get("fcstValue") in ("1", "4")
        for it in items
    )
    return pop_high and pty_rain


def rain_score(precipitation_mm: float, heavy_rain_alert: bool) -> float:
    """
    강수량 + 호우특보 → 강수예보 점수 (0~1).
    위험지수 공식의 강수예보 × 0.25 항목에 직접 사용합니다.

    기준: 0mm→0, 10mm→~0.39, 30mm→~0.78, 50mm+→1.0
    호우특보 발효 시 +0.3 보정 (최대 1.0)
    """
    if precipitation_mm <= 0:
        score = 0.0
    elif precipitation_mm >= 50:
        score = 1.0
    else:
        score = 1 - math.exp(-precipitation_mm / 20)

    if heavy_rain_alert:
        score = min(1.0, score + 0.3)

    return round(score, 4)


def get_rain_score(lat: float, lon: float) -> dict:
    """
    위도/경도를 입력받아 강수예보 점수 딕셔너리를 반환합니다.

    Returns:
        {
            "nx": int,
            "ny": int,
            "precipitation_6h_mm": float,
            "heavy_rain_alert": bool,
            "rain_score": float  # 0~1
        }
    """
    nx, ny = latlon_to_grid(lat, lon)
    ultra_data = fetch_ultra_short_forecast(nx, ny)
    short_data = fetch_short_forecast(nx, ny)

    precip_mm = _parse_precipitation_6h(ultra_data)
    alert = _parse_heavy_rain_alert(short_data)

    return {
        "nx": nx,
        "ny": ny,
        "precipitation_6h_mm": precip_mm,
        "heavy_rain_alert": alert,
        "rain_score": rain_score(precip_mm, alert),
    }


if __name__ == "__main__":
    # 테스트: 서울 관악구 봉천동 (반지하 밀집 지역)
    result = get_rain_score(lat=37.4784, lon=126.9516)
    print(result)
