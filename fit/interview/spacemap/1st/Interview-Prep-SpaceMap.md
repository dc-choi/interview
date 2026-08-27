---
tags: [fit, interview, spacemap]
status: index
category: "Interview - Fit"
aliases: ["SpaceMap Interview Prep 1st", "스페이스맵 1차 면접 준비"]
---
# 스페이스맵 (SpaceMap) 1차 면접 준비 — 목차

> 역사적 스냅샷: 이 문서는 2026년 1차 면접 준비 당시 기록이다. 전형은 무응답으로 탈락 간주되어 종료됐으며 현재 할 일로 사용하지 않는다. 최종 상태는 [[Job-Search-Tracker-2024-2026-Kinolights|2024-2026 이직 트래커 아카이브]]를 따른다.

> 예정 일시: 2026-05-22(금) 14:30, 1차 직무 대면 면접. 실제 시작 시각과 진행 기록은 [[Interview-Retro-SpaceMap-1st|1차 회고]]에 남겼다.
> 공개 채용 공고: https://www.wanted.co.kr/wd/349481
> 템플릿: [[Interview-Prep-Template|면접 준비 템플릿]]

200줄 분할 원칙에 따라 주제별 하위 문서로 분리했습니다.

## 하위 문서

- ⭐ [[Interview-Prep-SpaceMap-Domain|STM, SSA 도메인 브리프]] (회사 핵심 — 충돌위험 Pc, conjunction screening, 내 파이프라인 매핑, 역질문)
- [[Interview-Prep-SpaceMap-JD|JD 분석 & 회사 맞춤 답변]] (지원 동기, 이직 사유)
- [[Interview-Prep-SpaceMap-Master-Fork|마스터 fork 답변]] (왜 백엔드, 잦은 이직, 공백기, AI 도구, **워라밸 강도** ★ JD 명시, 실패 사례)
- [[Interview-Prep-SpaceMap-Tech-Resume|이력서 기반 기술 질문 (DB Lock, 인덱스, 이벤트, 아키텍처, 관측성, 데이터 수집)]]
- [[Interview-Prep-SpaceMap-Tech-JD|JD 기반 기술 질문 (Python/FastAPI, Airflow, PostgreSQL, NoSQL, 파이프라인, REST, NestJS)]]
- [[Interview-Prep-SpaceMap-Service|서비스 맥락 질문, 컬처핏, 역질문]]
- [[Interview-Prep-SpaceMap-Checklist|면접 준비 체크리스트]]
- [[Interview-Prep-SpaceMap-Cheatsheet|🔥 30분 훑기용 치트시트 (면접 직전)]]
- [[Interview-Retro-SpaceMap-1st|1차 면접 회고]]

## 이 면접의 3대 관통 전략

1. **경력 갭 정면 돌파** — JD는 5년+, 나는 **4년차**로 약 1년의 갭이 있다. 연차보다 다룬 문제의 깊이와 범위로 설명한다. 동시성 정합성, 수집 파이프라인, 인덱스 최적화, 아키텍처 전환과 관측성 구축을 근거로 들되 내부 규모와 수치는 공개하지 않는다.
2. **데이터 수집/처리 파이프라인 = 최강 무기** — JD 주요 업무 첫 줄이 "데이터 수집/처리 파이프라인 및 API 서버"다. 수집, 정합성, 가공과 API 노출을 하나의 흐름으로 보는 경험을 연결한다.
3. **Python/FastAPI, Airflow, PostgreSQL 갭은 솔직 인정 + 전이 가능성** — ⚠️ JD에서 셋 다 **필수 자격요건**(우대 아님). 모른다고 숨기지 말 것. "NestJS 데코레이터, DI 깊이가 FastAPI 전이의 토대", "batch 파이프라인 설계 경험이 Airflow DAG 개념과 매핑", "MySQL InnoDB 깊이가 PostgreSQL 전이의 토대"로 방어.

## 마스터 답변 참조

- [[My-Self-Intro|자기소개 마스터]] (회사 매핑 끝줄: "우주 데이터가 대용량, 시계열이라는 점에서 수집과 정합성 문제를 다룬 경험과 본질이 같다")
- [[My-Motivation-Reasons|이직 사유 마스터]] (잦은 이직, 공백기 꼬리)
- [[My-Tech-Cards|기술 카드 마스터 8개]] (이 자리 강조: 카드 1 동시성 제어, 카드 2 비동기 처리, 카드 3 조회 최적화, 카드 5 관측성), [[My-Tech-Cards-Extended|기술 심화]], [[My-Tech-Cards-Data|데이터]], [[My-Tech-Cards-Ops|운영]]
- [[My-FIT-Answers|FIT 답변 마스터]] (왜 백엔드, **워라밸 강도** ★ JD 명시, 실패, AI 도구), [[My-FIT-Answers-Extended|보조]]
- [[My-Reverse-Questions|역질문 마스터]] (이 자리 우선: 데이터 엔진 실체, 기술 경계, 업무 강도와 초기 기대)

## prep/ 가이드 정렬 체크 (회사별 fork시 누락 위험 → 본 섹션으로 구조화)

- [[Self-Analysis|WHY 시드]] — 본인 욕구(주도성, 성장, 가치) → "왜 백엔드", "왜 데이터 난이도 높은 도메인" 근거
- [[Developer-Interview-13-Questions|13Q 의도]] — 단골 질문 의도 (특히 #4 동기, #6 실패, #11 왜 이 회사)
- [[Developer-Interview-Signals|시그널]] — "함께 일하고 싶은 사람" 신호 (모르면 모른다, 갭 솔직, 가정 명시 후 설계)
- [[Sensitive-Question-Answers|민감 질문 치환]] — #1 잦은 이직, #2 공백기, **#7 워라밸 (부정 단어 본인이 먼저 X, JD 명시라 100% 출제)**
- [[FIT-Framework|메타 가이드]] — 딥테크 직무 면접 톤, 역질문 마이크 넘기기, 갭을 밀도로 재정의

## 면접 형식별 적용 (JD 단계 판단)

- **CS, 시스템 디자인**: JD "데이터 수집, 처리 파이프라인" 정중앙 → [[System-Design-Practice-Topics|시스템 디자인 연습]] 中 대용량 수집 파이프라인 토픽 면접에도 들어올 수 있음. [[Interview-Prep-SpaceMap-Tech-JD|Tech-JD #5]]가 그 답.
- **라이브 코딩**: 면접 직무 면접에 포함 여부 미확인 — 면접 시작 시 절차 확인. 포함 시 [[Live-Coding-Process|라이브 코딩 프로세스]] 참조.
