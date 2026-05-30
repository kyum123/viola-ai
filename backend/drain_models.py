"""빗물받이 우선점검 관련 ORM 모델 및 Pydantic 스키마."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text
from sqlalchemy import func

from database import Base


# ── ORM 모델 ──────────────────────────────────────────────────────────────────
class DrainPoint(Base):
    """빗물받이(우수관 입구) 위치 및 상태 테이블."""
    __tablename__ = "drain_points"

    id = Column(String, primary_key=True)         # 예: "DR-11620-0042"
    address = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    sigungu_code = Column(String(5), nullable=False)

    # 위험 요인
    in_flood_zone = Column(Boolean, default=False)    # 침수흔적도 반경 내
    complaint_count = Column(Integer, default=0)      # 민원 이력 수
    last_inspected_at = Column(Date, nullable=True)   # 마지막 점검일

    created_at = Column(DateTime, server_default=func.now())


class DrainInspectionRecord(Base):
    """빗물받이 점검 완료 기록."""
    __tablename__ = "drain_inspection_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    drain_id = Column(String, nullable=False)
    inspected_at = Column(DateTime, server_default=func.now())
    inspector = Column(String, nullable=True)
    result = Column(String, nullable=True)   # 정상 / 이물질 제거 / 파손 교체 필요
    note = Column(Text, nullable=True)


# ── 위험점수 산출 ─────────────────────────────────────────────────────────────
def drain_risk_score(
    in_flood_zone: bool,
    complaint_count: int,
    days_since_inspection: int,
) -> float:
    """
    빗물받이 위험점수 (0~1).

    가중치:
    - 침수흔적 인근 여부  40%
    - 민원 이력           35%
    - 마지막 점검 경과일  25%
    """
    # 침수흔적 점수
    flood_s = 1.0 if in_flood_zone else 0.0

    # 민원 이력 점수 (0건→0, 1건→0.3, 3건→0.7, 5건+→1.0)
    complaint_map = {0: 0.0, 1: 0.30, 2: 0.50, 3: 0.70, 4: 0.85}
    complaint_s = complaint_map.get(complaint_count, 1.0)

    # 점검 경과일 점수 (30일→0.2, 90일→0.5, 180일+→1.0)
    if days_since_inspection >= 180:
        inspect_s = 1.0
    elif days_since_inspection >= 90:
        inspect_s = 0.5
    elif days_since_inspection >= 30:
        inspect_s = 0.2
    else:
        inspect_s = 0.0

    score = 0.40 * flood_s + 0.35 * complaint_s + 0.25 * inspect_s
    return round(min(1.0, score), 4)


# ── Pydantic 스키마 ───────────────────────────────────────────────────────────
class DrainPriorityItem(BaseModel):
    rank: int
    drain_id: str
    address: str
    lat: float
    lon: float
    risk_score: float = Field(ge=0, le=1)
    in_flood_zone: bool
    complaint_count: int
    days_since_inspection: int
    last_inspected_at: Optional[date] = None
    risk_tags: list[str]

    model_config = {"from_attributes": True}


class DrainPriorityResponse(BaseModel):
    total: int
    as_of: date
    items: list[DrainPriorityItem]


class DrainInspectRequest(BaseModel):
    drain_id: str
    inspector: Optional[str] = None
    result: Optional[str] = None   # 정상 / 이물질 제거 / 파손 교체 필요
    note: Optional[str] = None


class DrainInspectResponse(BaseModel):
    drain_id: str
    inspected_at: datetime
    message: str
