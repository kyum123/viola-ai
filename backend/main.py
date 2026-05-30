"""비올라(Viola) FastAPI 서버."""

import json
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# pipeline 모듈 경로 추가
sys.path.append(str(Path(__file__).parent.parent / "pipeline"))

from database import Base, check_connection, engine, get_db
from drain_models import (
    DrainInspectRequest,
    DrainInspectResponse,
    DrainInspectionRecord,
    DrainPoint,
    DrainPriorityItem,
    DrainPriorityResponse,
    drain_risk_score,
)
from models import (
    HealthResponse,
    Household,
    PriorityListItem,
    PriorityListResponse,
    RiskCache,
    RiskResponse,
    VisitCompleteRequest,
    VisitCompleteResponse,
    VisitRecord,
)
from risk_score import (
    FloodHistory,
    HouseholdInput,
    VulnerabilityInfo,
    calculate_risk,
    rank_households,
)
from fetch_weather import get_rain_score

app = FastAPI(
    title="Viola API",
    description="반지하 침수취약계층 우선방문 추천 AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 배포 시 React 도메인으로 제한할 것
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


# ── 헬퍼 ─────────────────────────────────────────────────────────────────────
def _days_since_last_visit(household_id: str, db: Session) -> tuple[int, Optional[datetime]]:
    """해당 가구의 마지막 방문 경과일과 방문 일시를 반환합니다."""
    record = (
        db.query(VisitRecord)
        .filter(VisitRecord.household_id == household_id)
        .order_by(VisitRecord.visited_at.desc())
        .first()
    )
    if record is None:
        return 9999, None
    delta = datetime.now() - record.visited_at
    return delta.days, record.visited_at


def _build_household_input(row: Household, db: Session) -> HouseholdInput:
    days, _ = _days_since_last_visit(row.id, db)
    rain = get_rain_score(row.lat, row.lon)
    return HouseholdInput(
        household_id=row.id,
        lat=row.lat,
        lon=row.lon,
        flood=FloodHistory(
            flood_count=row.flood_count,
            in_flood_zone=row.in_flood_zone,
        ),
        vuln=VulnerabilityInfo(
            is_elderly=row.is_elderly,
            is_disabled=row.is_disabled,
            disability_grade=row.disability_grade,
            is_living_alone=row.is_living_alone,
            is_basic_recipient=row.is_basic_recipient,
            days_since_last_visit=days,
        ),
        rain_score=rain["rain_score"],
    )


# ── 엔드포인트 ────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["system"])
def health_check():
    """서버 및 DB 상태를 확인합니다."""
    return HealthResponse(status="ok", db=check_connection())


@app.get("/risk/{household_id}", response_model=RiskResponse, tags=["risk"])
def get_risk(household_id: str, db: Session = Depends(get_db)):
    """
    특정 가구의 위험지수를 실시간으로 산출합니다.

    기상청 API를 호출하여 최신 강수예보를 반영합니다.
    """
    row = db.query(Household).filter(Household.id == household_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="가구를 찾을 수 없습니다.")

    inp = _build_household_input(row, db)
    result = calculate_risk(inp)

    return RiskResponse(
        household_id=row.id,
        address=row.address,
        lat=row.lat,
        lon=row.lon,
        flood_score=result.flood_score,
        vulnerability_score=result.vulnerability_score,
        rain_score=result.rain_score,
        risk_index=result.risk_index,
        risk_level=result.risk_level,
        risk_tags=result.risk_tags,
    )


@app.get("/priority-list", response_model=PriorityListResponse, tags=["risk"])
def get_priority_list(
    sigungu_code: str = Query(..., description="시군구 코드 5자리 (예: 11620)"),
    top_n: int = Query(50, ge=1, le=500, description="상위 N개 반환"),
    db: Session = Depends(get_db),
):
    """
    지자체 관내 반지하 가구를 위험지수 내림차순으로 정렬한 방문 우선순위 리스트를 반환합니다.

    대시보드 메인 테이블에 표시되는 데이터입니다.
    """
    rows = (
        db.query(Household)
        .filter(Household.sigungu_code == sigungu_code)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="해당 시군구 가구 데이터가 없습니다.")

    inputs = [_build_household_input(row, db) for row in rows]
    ranked = rank_households(inputs)[:top_n]

    row_map = {r.id: r for r in rows}
    items = []
    for rank_idx, res in enumerate(ranked, start=1):
        row = row_map[res.household_id]
        days, last_visited = _days_since_last_visit(res.household_id, db)
        items.append(
            PriorityListItem(
                rank=rank_idx,
                household_id=res.household_id,
                address=row.address,
                risk_index=res.risk_index,
                risk_level=res.risk_level,
                risk_tags=res.risk_tags,
                days_since_last_visit=days if days != 9999 else -1,
                last_visited_at=last_visited,
            )
        )

    return PriorityListResponse(
        total=len(items),
        as_of=date.today(),
        items=items,
    )


@app.post("/visit-complete", response_model=VisitCompleteResponse, tags=["visit"])
def complete_visit(body: VisitCompleteRequest, db: Session = Depends(get_db)):
    """
    담당자가 방문을 완료했을 때 기록합니다.

    방문 완료 처리 후 해당 가구의 위험지수 재산출 시 미방문 경과일이 초기화됩니다.
    """
    row = db.query(Household).filter(Household.id == body.household_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="가구를 찾을 수 없습니다.")

    record = VisitRecord(
        household_id=body.household_id,
        visited_by=body.visited_by,
        note=body.note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return VisitCompleteResponse(
        household_id=body.household_id,
        visited_at=record.visited_at,
        message="방문 완료가 기록되었습니다.",
    )


@app.get("/rain-score", tags=["weather"])
def rain_score_by_coords(
    lat: float = Query(..., description="위도"),
    lon: float = Query(..., description="경도"),
):
    """
    좌표 기준 기상청 실시간 강수예보 점수를 반환합니다.

    모바일 앱 지도 화면에서 격자 단위 색상 표시에 활용합니다.
    """
    return get_rain_score(lat, lon)


# ── 빗물받이 우선점검 대시보드 ────────────────────────────────────────────────
@app.get("/drain-priority", response_model=DrainPriorityResponse, tags=["drain"])
def get_drain_priority(
    sigungu_code: str = Query(..., description="시군구 코드 5자리 (예: 11620)"),
    top_n: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    빗물받이를 위험점수·민원 이력·침수흔적 기반으로 정렬한 우선점검 리스트를 반환합니다.
    """
    rows = (
        db.query(DrainPoint)
        .filter(DrainPoint.sigungu_code == sigungu_code)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="해당 시군구 빗물받이 데이터가 없습니다.")

    scored = []
    for row in rows:
        last = (
            db.query(DrainInspectionRecord)
            .filter(DrainInspectionRecord.drain_id == row.id)
            .order_by(DrainInspectionRecord.inspected_at.desc())
            .first()
        )
        if last:
            days = (datetime.now() - last.inspected_at).days
            last_date = last.inspected_at.date()
        else:
            days = 9999
            last_date = None

        score = drain_risk_score(row.in_flood_zone, row.complaint_count, days)

        tags = []
        if row.in_flood_zone:
            tags.append("침수흔적 인근")
        if row.complaint_count > 0:
            tags.append(f"민원 {row.complaint_count}건")
        if days >= 180:
            tags.append("장기 미점검")
        elif days >= 90:
            tags.append(f"미점검 {days}일")

        scored.append((score, row, days, last_date, tags))

    scored.sort(key=lambda x: x[0], reverse=True)

    items = [
        DrainPriorityItem(
            rank=i + 1,
            drain_id=row.id,
            address=row.address,
            lat=row.lat,
            lon=row.lon,
            risk_score=score,
            in_flood_zone=row.in_flood_zone,
            complaint_count=row.complaint_count,
            days_since_inspection=days if days != 9999 else -1,
            last_inspected_at=last_date,
            risk_tags=tags,
        )
        for i, (score, row, days, last_date, tags) in enumerate(scored[:top_n])
    ]

    return DrainPriorityResponse(total=len(items), as_of=date.today(), items=items)


@app.post("/drain-inspect", response_model=DrainInspectResponse, tags=["drain"])
def complete_drain_inspection(body: DrainInspectRequest, db: Session = Depends(get_db)):
    """현장 점검 완료를 기록합니다."""
    row = db.query(DrainPoint).filter(DrainPoint.id == body.drain_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="빗물받이를 찾을 수 없습니다.")

    record = DrainInspectionRecord(
        drain_id=body.drain_id,
        inspector=body.inspector,
        result=body.result,
        note=body.note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return DrainInspectResponse(
        drain_id=body.drain_id,
        inspected_at=record.inspected_at,
        message="점검 완료가 기록되었습니다.",
    )
