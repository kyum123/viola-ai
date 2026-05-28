<div align="center">

# 🌧️ Viola AI
### 반지하 침수취약계층 우선방문 추천 AI 서비스

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> 집중호우 전, **한정된 행정력을 가장 위험한 가구에 먼저** 배분하는 AI 기반 방문 우선순위 추천 시스템

</div>

---

## 📌 배경

2022년 서울 반지하 침수 사망사고 이후, 집중호우 전 반지하 취약가구에 대한 선제적 점검 필요성이 제기됐습니다.  
그러나 기존 침수 대응은 **"어디가 위험한지"** 를 보여주는 데 그쳤고,  
**"누구에게 먼저 연락해야 하는가"** 라는 행정 효율화 문제는 여전히 담당자의 수동 판단에 의존합니다.

Viola AI는 공공데이터 6종을 결합해 **가구 단위 위험지수**를 산출하고,  
복지과 담당자에게 "오늘 이 순서로 방문하세요"를 자동 추천합니다.

---

## 🗂️ 활용 공공데이터

| 데이터 | 제공기관 | 활용 방식 |
|---|---|---|
| 침수흔적도 | 행정안전부 | 과거 침수 이력 및 위험 구역 식별 |
| 건축행정 데이터 | 국토교통부 | 반지하 가구 위치 및 세대수 파악 |
| 단기/초단기 예보 | 기상청 | 강수량 예보 기반 위험지수 실시간 보정 |
| 장애인·독거노인 현황 (SSIS) | 보건복지부 | 취약계층 해당 여부 파악 |
| 기초생활수급자 현황 | 보건복지부 | 경제적 취약가구 식별 |
| 복지서비스 방문 기록 | 지자체 | 장기 미방문 가구 우선 처리 |

---

## ⚙️ 위험지수 산출 방식

```
위험지수 = 침수이력 × 0.40
         + 취약계층지수 × 0.35
         + 강수예보 × 0.25
```

| 항목 | 가중치 | 세부 기준 |
|---|---|---|
| 침수 이력 | 40% | 과거 침수 횟수, 침수흔적도 반경 내 위치 |
| 취약계층 지수 | 35% | 독거 여부, 고령, 장애 등급, 수급 여부, 마지막 방문 경과일 |
| 강수 예보 | 25% | 6시간 예상 강수량, 호우특보 발효 여부 |

---

## 🏗️ 시스템 구조

```
공공데이터 수집 (Airflow)
        ↓
공간 데이터 결합·정규화 (PostGIS)
        ↓
AI 위험점수 산출 (Python)
        ↓
     ┌──────────────┐
     ↓              ↓
  시민 앱         지자체 웹 대시보드
 (React Native)      (React)
  침수위험 지도       방문 우선순위 리스트
  귀갓길 우회 안내    빗물받이 점검 추천
  대피소 안내        방문 완료 처리
```

---

## 📁 프로젝트 구조

```
viola-ai/
├── pipeline/               # 공공데이터 수집·처리
│   ├── fetch_weather.py    # 기상청 API 수집
│   ├── fetch_flood.py      # 침수흔적도 파싱
│   ├── fetch_welfare.py    # 복지 데이터 처리
│   └── risk_score.py       # 위험지수 산출 모델
├── backend/                # FastAPI 서버
│   ├── main.py
│   ├── routers/
│   │   ├── risk_map.py     # 위험지도 API
│   │   ├── visit_list.py   # 방문 우선순위 API
│   │   ├── route.py        # 귀갓길 우회 경로 API
│   │   └── drain.py        # 빗물받이 점검 API
│   └── models/
├── web/                    # 지자체 담당자용 대시보드 (React)
├── app/                    # 시민용 앱 (React Native)
└── docs/                   # 설계 문서
```

---

## 🚀 시작하기

### 요구사항
- Python 3.11+
- PostgreSQL 15+ (PostGIS 확장 포함)
- Node.js 20+

### 설치

```bash
git clone https://github.com/kyum123/viola-ai.git
cd viola-ai

# 파이프라인 의존성 설치
cd pipeline
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env에 기상청 API 키, DB 접속 정보 입력

# 위험점수 계산 실행
python risk_score.py
```

### 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API 문서: `http://localhost:8000/docs`

---

## 🗺️ 로드맵

- [x] 서비스 기획 및 데이터 설계
- [x] 위험지수 산출 모델 설계
- [ ] 공공데이터 수집 파이프라인 구축
- [ ] FastAPI 백엔드 MVP
- [ ] 지자체 웹 대시보드
- [ ] 시민용 앱 (React Native)
- [ ] 서울시 관악구 파일럿 적용
- [ ] 전국 지자체 확장

---

## 👥 팀

> 공공데이터 활용 창업경진대회 출품작

---

## 📄 라이선스

MIT License
