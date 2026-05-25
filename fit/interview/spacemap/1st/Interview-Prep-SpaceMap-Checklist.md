---
tags: [fit, interview, spacemap]
status: done
category: "Interview - Fit"
aliases: ["SpaceMap 면접 체크리스트", "스페이스맵 면접 준비 체크리스트"]
---
# 스페이스맵 1차 — 면접 준비 체크리스트

> 상위 TOC: [[Interview-Prep-SpaceMap|스페이스맵 1차 면접 준비]]

---

## 면접 정보

- **일시**: 2026.05.22(금) 14:30
- **장소**: 서울 성동구 왕십리로 220, 한양대학교 융합교육관 908호
- **도착 후**: 9층 도착 시 인사담당자에게 전화
- **형식**: 대면 1차 면접 (직무) — 변동사항 있으면 사전 연락

## 면접 시작 전 확인

- [ ] 면접관 구성(직함) 문의 — 직무 면접인지 임원 포함인지
- [ ] 전체 채용 절차 재확인 (1차 다음 단계가 무엇인지)
- [ ] 핵심 역질문 2~3개 외워서 준비 ([[Interview-Prep-SpaceMap-Service|Service 문서]])

## 보강이 필요한 기술 영역

> JD 요구 대비 갭이 있는 영역. 5/22까지 우선순위대로 복습.

**갭 1순위 — Python / FastAPI**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| FastAPI 구조 (데코레이터·DI·Pydantic) — NestJS와 매핑 | `[[NestJS-Lifecycle]]` + (FastAPI 공식 문서) | [ ] |
| Python async/await, GIL, 멀티프로세싱 | `[[Async-IO]]` + (외부 자료) | [ ] |

**갭 2순위 — 데이터 파이프라인 / Airflow**

| 영역                                          | 관련 문서                                                         | 복습 완료 |
| ------------------------------------------- | ------------------------------------------------------------- | ----- |
| Airflow 핵심 개념 (DAG·Operator·retry·backfill) | `[[Spring-Batch-Essentials]]` + (Airflow 공식 문서)               | [ ]   |
| 멱등성·전달 보장·백프레셔                              | `[[Idempotency]]` `[[Delivery-Semantics]]` `[[Backpressure]]` | [ ]   |
| OLTP vs OLAP, 시계열 데이터 저장                    | `[[OLTP-vs-OLAP]]` `[[ClickHouse]]`                           | [ ]   |

**갭 3순위 — PostgreSQL**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| MySQL vs PostgreSQL (MVCC·VACUUM·인덱스 종류) | `[[MySQL-vs-PostgreSQL]]` | [ ] |
| PG 인덱스 (GIN/GiST/BRIN), 공간 데이터 | `[[Index]]` + (PostGIS 개요) | [ ] |
| 격리 수준 차이 | `[[Isolation-Level]]` | [ ] |

**강점 영역 — 답변 다듬기 (이미 강하니 복습보다 스토리텔링 점검)**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| DB Lock 동시성 (수집 정합성으로 번역) | `[[Lock]]` `[[Transaction-Lock-Contention]]` | [ ] |
| 복합 인덱스·실행계획 (시계열 대용량으로 번역) | `[[Index]]` `[[Execution-Plan]]` | [ ] |
| 이벤트 아키텍처 (파이프라인 단계 분리로 번역) | `[[EventBridge]]` `[[SQS]]` `[[Messaging-Patterns]]` | [ ] |
| 관측성 (데이터 엔진 신뢰성으로 번역) | `[[Observability]]` `[[Log-Pipeline]]` | [ ] |
| 대용량 수집 파이프라인 설계 | `[[Interview-Prep-SpaceMap-Tech-JD]]` #5 | [ ] |

## 강하게 어필할 포인트

> 매칭도 "강"인 항목. 면접에서 반드시 언급. **모든 답을 "데이터 수집·처리 파이프라인" 축으로 모을 것.**

1. **데이터 수집·처리 파이프라인 전 구간 경험** — JD 주요 업무 첫 줄과 정확히 일치. 수천 대 IoT 디바이스 데이터를 수집(DB Lock 정합성)→분리(EventBridge/SQS)→저장(복합 인덱스)→노출(Read Replica)
2. **데이터 규모와 무관한 성능 구조** — 1억 건에서도 인덱스 1탐색. 슬로우 쿼리 99.3% 개선, 3000대 확장 시 144분→7.2초
3. **데이터 엔진 신뢰성** — Grafana/Prometheus/Loki 관측 인프라 0→1 구축, SLO 알림. B2G/방산의 신뢰성 요구와 직결
4. **빠른 스택 적응 이력** — Java→Node, JSP→Spring, MongoDB→MySQL. Python·Airflow·우주 도메인 갭이 "닫히는 종류"임을 증명
5. **보안 도메인 감각** — 정보관리보안학과 + FIDO 인증 서버 팀 리딩(공식 인증 통과). B2G/방산 환경 fit
6. **교육 도메인 경험** — 출석부(주일학교 **99개 모임 멀티테넌트 SaaS** 무중단 운영, 학생 2,794·출석 13.3K건·MAO 43곳) + 카카오테크 멘토

## 주의사항

- **경력 갭을 먼저 사과하듯 꺼내지 말 것** — 질문받으면 [[Interview-Prep-SpaceMap-Service|Service #6]]로 당당하게. 먼저 위축되면 면접 톤 전체가 내려감
- **모르는 건 모른다고** — Python·Airflow·PostgreSQL 직접 경험 없음을 인정하되, 반드시 인접 경험 + 학습 경로를 같이. 아는 척은 5년차 포지션에서 즉시 들통
- **단정하지 말 것** — 우주 데이터의 실제 형태를 모름. "~라고 가정하면" 후 설계하고 역으로 되묻는 흐름
- **"강한 업무 강도" 질문 대비** — 무조건 수용도, 방어적 회피도 아닌 "구조·자동화로 강도를 감당한다" 프레임. 실체는 역질문으로 확인
- **모든 답을 파이프라인 축으로** — 산만하게 여러 강점을 나열하지 말고, "데이터 수집·처리 파이프라인"이라는 하나의 서사로 수렴시킬 것
- 면접 현장 일반 주의: [[FIT-Framework#면접 현장 주의사항|면접 현장 주의사항]]

## 당일 준비물

- [ ] 이력서·포트폴리오 출력본 (또는 태블릿)
- [ ] 신분증
- [ ] 인사담당자 연락처 저장 (9층 도착 시 전화)
- [ ] 필기구·노트 (역질문 메모용)
- [ ] 한양대 융합교육관 위치·이동 경로 사전 확인 (성수동, 한양대역)

## 관련 문서
- [[Interview-Prep-SpaceMap|1차 면접 TOC]]
- [[Interview-Prep-SpaceMap-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-SpaceMap-Tech-Resume|이력서 기반 기술 질문]]
- [[Interview-Prep-SpaceMap-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-SpaceMap-Service|서비스 맥락 + 컬처핏 + 역질문]]
