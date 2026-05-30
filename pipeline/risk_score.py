"""
risk_score.py
-------------
반지하 가구별 침수 위험지수 산출 모듈
 
위험지수 = 침수이력 × 0.40 + 취약계층지수 × 0.35 + 강수예보 × 0.25
"""
 
from dataclasses import dataclass
 
 
@dataclass
class HouseholdData:
    """가구 정보 입력 데이터"""
    address: str
    flood_count: int          # 과거 침수 횟수
    in_flood_zone: bool       # 침수흔적도 반경 내 위치 여부
    is_single_elderly: bool   # 독거노인 여부
    disability_grade: int     # 장애 등급 (0=없음, 1~6)
    is_basic_recipient: bool  # 기초생활수급 여부
    days_since_visit: int     # 마지막 방문 이후 경과일
    forecast_mm: float        # 6시간 예상 강수량 (mm)
    heavy_rain_alert: bool    # 호우특보 발효 여부
 
 
def calc_flood_history_score(flood_count: int, in_flood_zone: bool) -> float:
    """
    침수 이력 점수 산출 (0~100)
    - 과거 침수 횟수 기반 점수 + 침수흔적도 구역 가산점
    """
    base = min(flood_count * 20, 80)  # 횟수당 20점, 최대 80점
    zone_bonus = 20 if in_flood_zone else 0
    return min(base + zone_bonus, 100)
 
 
def calc_vulnerability_score(
    is_single_elderly: bool,
    disability_grade: int,
    is_basic_recipient: bool,
    days_since_visit: int,
) -> float:
    """
    취약계층 지수 산출 (0~100)
    - 독거노인, 장애 등급, 수급 여부, 미방문 기간 합산
    """
    score = 0.0
    if is_single_elderly:
        score += 30
    if disability_grade >= 1:
        score += min(disability_grade * 8, 40)  # 등급당 8점, 최대 40점
    if is_basic_recipient:
        score += 15
    # 미방문 기간: 30일 이상부터 가산, 최대 15점
    visit_score = min(max(days_since_visit - 30, 0) * 0.5, 15)
    score += visit_score
    return min(score, 100)
 
 
def calc_forecast_score(forecast_mm: float, heavy_rain_alert: bool) -> float:
    """
    강수 예보 점수 산출 (0~100)
    - 6시간 예상 강수량 + 호우특보 발효 여부
    """
    # 강수량 구간별 점수
    if forecast_mm >= 100:
        base = 90
    elif forecast_mm >= 50:
        base = 70
    elif forecast_mm >= 30:
        base = 50
    elif forecast_mm >= 10:
        base = 30
    else:
        base = 10
    alert_bonus = 10 if heavy_rain_alert else 0
    return min(base + alert_bonus, 100)
 
 
def calc_risk_score(data: HouseholdData) -> dict:
    """
    최종 위험지수 산출
    반환값: 항목별 점수 + 최종 점수 + 위험 등급
    """
    flood_score = calc_flood_history_score(data.flood_count, data.in_flood_zone)
    vuln_score = calc_vulnerability_score(
        data.is_single_elderly,
        data.disability_grade,
        data.is_basic_recipient,
        data.days_since_visit,
    )
    forecast_score = calc_forecast_score(data.forecast_mm, data.heavy_rain_alert)
 
    total = (
        flood_score * 0.40
        + vuln_score * 0.35
        + forecast_score * 0.25
    )
 
    if total >= 80:
        grade = "매우위험"
    elif total >= 60:
        grade = "위험"
    elif total >= 40:
        grade = "주의"
    else:
        grade = "낮음"
 
    return {
        "address": data.address,
        "flood_score": round(flood_score, 1),
        "vulnerability_score": round(vuln_score, 1),
        "forecast_score": round(forecast_score, 1),
        "total_score": round(total, 1),
        "grade": grade,
    }
 
 
def rank_households(households: list[HouseholdData]) -> list[dict]:
    """가구 리스트를 위험지수 내림차순으로 정렬해 반환"""
    results = [calc_risk_score(h) for h in households]
    return sorted(results, key=lambda x: x["total_score"], reverse=True)
 
 
# ── 실행 예시 ──────────────────────────────────────────
if __name__ == "__main__":
    sample = [
        HouseholdData(
            address="서울시 관악구 신림동 105-3 B동",
            flood_count=4,
            in_flood_zone=True,
            is_single_elderly=True,
            disability_grade=0,
            is_basic_recipient=True,
            days_since_visit=62,
            forecast_mm=87,
            heavy_rain_alert=True,
        ),
        HouseholdData(
            address="서울시 관악구 봉천동 321 반지하",
            flood_count=3,
            in_flood_zone=True,
            is_single_elderly=False,
            disability_grade=2,
            is_basic_recipient=False,
            days_since_visit=20,
            forecast_mm=87,
            heavy_rain_alert=True,
        ),
        HouseholdData(
            address="서울시 관악구 남현동 44-2 지하",
            flood_count=0,
            in_flood_zone=False,
            is_single_elderly=True,
            disability_grade=0,
            is_basic_recipient=True,
            days_since_visit=40,
            forecast_mm=87,
            heavy_rain_alert=True,
        ),
    ]
 
    ranked = rank_households(sample)
 
    print("=" * 55)
    print("비올라 AI — 오늘의 방문 우선순위")
    print("=" * 55)
    for i, r in enumerate(ranked, 1):
        print(f"\n{i}순위  {r['address']}")
        print(f"  침수이력 {r['flood_score']}점  취약계층 {r['vulnerability_score']}점  강수예보 {r['forecast_score']}점")
        print(f"  ▶ 최종 위험지수: {r['total_score']}점 [{r['grade']}]")
    print("\n" + "=" * 55)
