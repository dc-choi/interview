---
tags: [fit, interview, wrtn]
status: done
category: "Interview - Fit"
aliases: ["뤼튼 JD 분석", "Wrtn JD", "Wrtn Interview JD"]
---
# 뤼튼 (Wrtn) Backend Engineer (Node.js) — JD 분석 & 매칭

> 지원 경로: 헤드헌터 추천 (2026-04-20)
> 참고 공개 공고: https://wrtn.career.greetinghr.com/ko/o/119686 (헤드헌터 JD와 동일 여부 미확인)
> 이전 직접 지원 이력: 25.3.04 · 25.6.27 · 26.02.12 — 모두 서류 탈락

---

## 1. JD 원문

**주요 업무**
- 제품이 출시되는 모든 과정에 참여
- NodeJS (NestJS) 기반으로 비즈니스 로직 개발·배포
- 협업하기 좋은 코드를 지향하면서 지속적인 리팩토링
- 테스트 케이스를 기반으로 테스트 코드 작성
- 코드리뷰를 통해 코드 개선

**자격요건**
- AI를 활용한 서비스에 관심이 많은 분
- NestJS 또는 Express, TypeScript, MongoDB, mongoose 활용 API 개발에 능숙한 분
- 요구사항을 파악하여 MongoDB로 데이터 모델링하고 시스템을 설계한 경험
- Git을 통한 협업에 익숙한 분
- 클라우드 인프라(AWS / Azure / GCP) 활용 서비스 개발 경험
- 코드리뷰·회의 등을 통해 건설적인 피드백을 주고받는 걸 좋아하는 분

**우대사항**
- LLM 기반 서비스 개발 경험
- 메시지큐(Kafka, SQS, RabbitMQ) 활용 비동기 처리 경험
- APM(Datadog, New Relic, Pinpoint) 트러블슈팅 경험
- 유닛테스트·통합테스트 등 테스트코드 작성에 익숙
- DDD에 관심
- Redis의 다양한 기능 활용
- Kubernetes 기반 서비스 개발 경험
- Websocket 활용 기능 개발 경험
- MSA 기반 개발 혹은 대규모 트래픽 처리 경험

**채용 절차**: 서류 → 실무 인터뷰 → 컬처핏 인터뷰 → 대표 인터뷰 → 레퍼런스 체크 & 합격 안내

**복지**: 한도 없는 개인 법인카드, 무제한 연차, 자율 출퇴근·원격 근무, 주택 자금 지원, 스톡옵션, 건강검진·상해보험, 교육비

---

## 2. 회사 & 포지션 개요

| 항목 | 내용 |
| --- | --- |
| 회사 | 뤼튼테크놀로지스 (Wrtn) |
| 서비스 | LLM 기반 생산성 플랫폼 (글쓰기·검색·캐릭터 챗) |
| 포지션 | Backend Engineer (Node.js) |
| 주요 스택 | NestJS · TypeScript · **MongoDB + mongoose** |
| 채용 절차 | 서류 → 실무 → 컬처핏 → 대표 → 레퍼런스 (5단계) |

---

## 3. 자격요건 vs 내 경험

| 자격요건 | 매칭도 | 내 근거 |
| --- | --- | --- |
| AI 서비스 관심 | 중 | 액션파워(다글로) 지원 진행, AI SaaS 관심 입증. 직접 구축은 부재 |
| NestJS/Express/TS API 능숙 | **강** | 4년차. 트라이포드랩 NestJS 2년 2개월, 시솔지주 Express 2년 |
| **MongoDB + mongoose** | **약~중** ⚠️ | MongoDB→MySQL 마이그레이션 이력 = 양날. mongoose 실사용 깊이 확인 필요 |
| MongoDB 데이터 모델링 | 중 | 스키마 설계 + MySQL 이관 관점에서 양쪽 모델링 이해 가능 |
| Git 협업 | **강** | PR 기반 리뷰, 테스트 연동, 머지 정책 운영 |
| 클라우드 인프라 | **강** | AWS 풍부 (ECS, RDS, CloudFront, EventBridge, SQS) |
| 코드리뷰 문화 | **강** | 커버리지 가드, 리뷰 기반 개선 경험 |

---

## 4. 우대사항 vs 내 경험

| 우대사항 | 매칭도 | 내 근거 |
| --- | --- | --- |
| LLM 기반 서비스 | **약** ⚠️ | 직접 구축 경험 부재. 관심·학습 어필 필요 |
| 메시지큐 (Kafka/SQS/RabbitMQ) | 중 | AWS EventBridge+SQS 비동기 아키텍처 운영. Kafka/RabbitMQ 직접은 부재 |
| APM (Datadog/NR/Pinpoint) | 약 | Grafana/Prometheus/Loki 직접 구축. 상용 APM 직접은 부재 |
| 유닛·통합 테스트 | **강** | 시솔지주 커버리지 0→70%, PR 60% 가드. jest+supertest 운영 |
| DDD 관심 | 중 | NestJS 모듈/도메인 분리. 이론 보강 필요 |
| Redis 다양한 기능 | 중 | 캐시/세션. Pub/Sub·Stream 확인 필요 |
| Kubernetes | 약 | ECS 중심. K8s 직접 경험 부재 |
| Websocket | ? | 경험 확인 필요 |
| MSA · 대규모 트래픽 | 중 | 단일 서버→CloudFront+ECS 전환, 슬로우쿼리 99.3% 개선 |

---

## 5. 핵심 리스크 · 전략

### 리스크 1: MongoDB 스택 불일치 ⚠️
- 뤼튼 메인 스택은 MongoDB/mongoose. 사용자는 MongoDB→MySQL 마이그레이션한 이력
- 대응:
  - "왜 MongoDB를 걷어냈나" 질문 대비 — 도메인이 관계형에 더 적합했다는 담담한 설명 (트랜잭션 정합성, 조인 빈도)
  - MongoDB 적합 유스케이스를 역으로 이해하고 있음을 어필 (스키마리스 유연성, 수평 확장, AI 응답/로그 저장에 적합)
  - mongoose 스키마·인덱스·populate·집계 파이프라인 복습

### 리스크 2: LLM 서비스 구축 경험 부재 ⚠️
- JD 자격요건 최상단 "AI를 활용한 서비스에 관심". 뤼튼은 AI 생성 서비스가 본질
- 대응:
  - 사이드/학습 이력 강조
  - LLM 호출 패턴 기초 정리 (스트리밍 응답, 토큰 비용 관리, 프롬프트 캐싱, Tool Use, 재시도/타임아웃)
  - 비동기 큐잉·스트리밍 경험을 LLM 서빙 맥락으로 재해석

### 강점 포인트
- **NestJS 4년차 실무** — JD 1순위 스택 직매칭
- **테스트 커버리지 70% 달성** — JD의 "테스트 코드 작성" 강조 지점 정면
- **EventBridge+SQS 비동기 아키텍처** — AI 서빙의 비동기 처리 맥락과 연결
- **Grafana/Prometheus/Loki 모니터링** — 트러블슈팅 스토리 풍부 (APM 대체 가능)
- **대규모 트래픽 대응** — CloudFront+ECS 전환, 슬로우쿼리 99.3% 개선

---

## 6. 이전 탈락 이력과의 차이

| 회차 | 지원일 | 결과 | 비고 |
| --- | --- | --- | --- |
| 1 | 25.3.04 | 서류 탈락 | 직접 지원 |
| 2 | 25.6.27 | 7.3 서류 탈락 | 직접 지원 |
| 3 | 26.02.12 | 2.20 서류 탈락 | 직접 지원 |
| **4** | **26.04.20** | **진행 중** | **헤드헌터 경로** |

- 이번 차이: 헤드헌터 검증 → 실무진 사전 매칭 가능성, 서류 필터링 통과율 상승 기대
- 서류 통과 시 면접에서 MongoDB·LLM 두 리스크가 핵심 검증 포인트가 될 것

---

## 7. 다음 단계

- [ ] 서류 통과 시: 실무 인터뷰 대비 `Interview-Prep-Wrtn-Tech-*` 추가
- [ ] MongoDB/mongoose 복습 (스키마 설계, 인덱스, populate, 집계, 트랜잭션)
- [ ] LLM 서빙 아키텍처 기초 정리 (스트리밍, 비용 관리, 캐싱, Tool Use)
- [ ] Redis 고급 기능 (Pub/Sub, Stream) 정리
- [ ] DDD 기본 개념 복습 (Entity, Value Object, Aggregate, Domain Event)
- [ ] 뤼튼 주요 서비스 동향 조사 (뤼튼 스튜디오, 캐릭터 챗, 검색 등)
