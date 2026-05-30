"""Pydantic 요청/응답 스키마 및 SQLAlchemy ORM 모델."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text
from sqlalchemy import func

from database import Base


# ── ORM 모델 (PostgreSQL 테이블) ──────────────────────────────────────────────
class Household(Base):
    """반지하 가구 기본 정보 테이블."""
    __tablename__ = "households"

    id = Column(String, primary_key=True)   # 예: "GW-2024-001"
    address = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    sigungu_code = Column(String(5), nullable=False)

    # 취약계층 정보
    is_elderly = Column(Boolean, default=False)
    is_disabled = Column(Boolean, default=False)
    disability_grade = Column(Integer, default=0)
    is_living_alone = Column(Boolean, default=False)
    is_basic_recipient = Column(Boolean, default=False)

    # 침수 이력
    flood_count = Column(Integer, default=0)
    in_flood_zone = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class VisitRecord(Base):
    """방문 기록 테이블 (담당자 방문 완료 처리)."""
    __tablename__ = "visit_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    household_id = Column(String, nullable=False)
    visited_at = Column(DateTime, server_default=func.now())
    visited_by = Column(String, nullable=True)   # 담당자 이름
    note = Column(Text, nullable=True)


class RiskCache(Base):
    """위험지수 캐시 테이블 (계산 결과를 하루 단위로 저장)."""
    __tablename__ = "risk_cache"

    household_id = Column(String, primary_key=True)
    calc_date = Column(Date, primary_key=True)
    flood_score = Column(Float)
    vuln_score = Column(Float)
    rain_score = Column(Float)
    risk_index = Column(Float)
    risk_level = Column(String(10))
    risk_tags = Column(Text)    # JSON 직렬화 문자열


# ── Pydantic 스키마 ───────────────────────────────────────────────────────────
class RiskResponse(BaseModel):
    """단일 가구 위험지수 응답."""
    household_id: str
    address: str
    lat: float
    lon: float
    flood_score: float = Field(ge=0, le=1)
    vulnerability_score: float = Field(ge=0, le=1)
    rain_score: float = Field(ge=0, le=1)
    risk_index: float = Field(ge=0, le=1)
    risk_level: str
    risk_tags: list[str]

    model_config = {"from_attributes": True}


class PriorityListItem(BaseModel):
    """방문 우선순위 리스트 항목 (위험지수 내림차순)."""
    rank: int
    household_id: str
    address: str
    risk_index: float
    risk_level: str
    risk_tags: list[str]
    days_since_last_visit: int
    last_visited_at: Optional[datetime] = None


class PriorityListResponse(BaseModel):
    """방문 우선순위 리스트 전체 응답."""
    total: int
    as_of: date
    items: list[PriorityListItem]


class VisitCompleteRequest(BaseModel):
    """방문 완료 처리 요청."""
    household_id: str
    visited_by: Optional[str] = None
    note: Optional[str] = None


class VisitCompleteResponse(BaseModel):
    household_id: str
    visited_at: datetime
    message: str


class HealthResponse(BaseModel):
    status: str
    db: bool
    version: str = "0.1.0"
