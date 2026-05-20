---
tags: [architecture, pattern, event-sourcing, ddd, cqrs]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Event Sourcing", "이벤트 소싱", "ES"]
---

# Event Sourcing

상태가 아니라 **상태를 변화시킨 사실(event)을 발생 순서대로 불변으로 저장**하는 패턴. 최종 상태는 이벤트 스트림을 재생(replay)해서 도출한다. CRUD가 "지금 무엇인가"를 저장한다면, Event Sourcing은 "무엇이 어떻게 일어났는가"를 저장한다.

## CRUD와의 차이

| 축 | CRUD | Event Sourcing |
|---|---|---|
| 저장 대상 | 최종 상태 | 발생한 모든 사실 |
| UPDATE / DELETE | 직접 수행 | 개념 없음 (새 이벤트로 표현) |
| 과거 상태 조회 | 별도 이력 테이블 필요 | 특정 시점까지 replay |
| why / how 추적 | 어려움 (현재만 남음) | 자연스러움 (사건 자체가 기록) |

예: 회원 등급이 `프리미엄`인 상황을 CRUD는 `level = 'premium'` 한 줄로 두지만, Event Sourcing은 `MemberRegistered → AddressChanged → MembershipLevelChanged(premium)` 세 이벤트로 표현한다.

## 핵심 구성 요소

| 요소 | 역할 |
|---|---|
| **Command** | 사용자/시스템 요청. 현재형·명령형 (`ChangeMembershipLevelToPremium`) |
| **Event** | 실제로 일어난 사실. **과거형·불변** (`MembershipLevelChanged`) |
| **Aggregate** | 일관성 경계. 자기 상태 변화를 이벤트로 발행 |
| **Event Stream** | Aggregate 인스턴스별 이벤트의 시간 순서 나열 |
| **Event Store** | 모든 이벤트의 중앙 영구 저장소 (append-only) |
| **Projection** | 이벤트를 구독해 Read Model을 갱신하는 핸들러 |
| **Read Model** | 조회 최적화 데이터 (별도 DB·캐시·검색엔진 가능) |

이벤트 이름은 명령(`ProcessOrder`)이 아니라 사실(`OrderPlaced`)로 짓는다. 명령형 이벤트는 발행자가 구독자의 행동을 지시하는 결합이라 새 구독자 추가 시 발행자 수정이 필요해진다.

## 실전 흐름

```
[Write Side]
1. Command 수신
2. Aggregate가 비즈니스 규칙 검증
3. Event 생성 (`changes` 리스트 누적)
4. EventStore.saveEvents() — append-only commit
5. 이벤트 발행 (구독자에게)

[Read Side]
6. Projection이 이벤트 수신
7. Read Model 갱신 (별도 테이블·캐시·검색 인덱스)
8. 사용자는 Read Model만 조회
```

상태 복원 흐름:
- Aggregate 로드 시 Event Store에서 해당 aggregate_id의 이벤트 시간순으로 가져옴
- `applyChange(event)`를 순서대로 실행 → 현재 상태 도출
- Aggregate는 자기 상태를 직접 변경하지 않고, 이벤트를 통해서만 변경

## Snapshot — Replay 비용 완화

이벤트 수가 늘면 매번 처음부터 replay하기 비싸진다.

```
N번째 이벤트 시점에 현재 상태 직렬화 → snapshot 저장
다음 로드 시: snapshot 복원 → snapshot_version 이후 이벤트만 replay
```

- 적재 주기: 이벤트 N개마다 (예: 100개) 또는 시간 기반 (매일 자정) 또는 도메인 시점 (월 마감)
- snapshot은 read model이 아니라 **aggregate 상태의 캐시**
- snapshot 손상되어도 Event Store가 source of truth라 통째 rebuild 가능

## CQRS와의 관계

Event Sourcing은 거의 항상 CQRS(Command Query Responsibility Segregation)와 함께 쓰인다.

- **Command 쪽**: Event Store에 이벤트 append
- **Query 쪽**: Projection이 만든 Read Model 조회
- 두 모델이 분리되니 각자 다른 DB·다른 스키마·다른 인덱스 가능
- 트레이드오프: **최종 일관성 (eventual consistency)** — 쓰기 직후 읽기에 즉시 반영되지 않음

쓰기·읽기 모델이 분리되지 않으면 Event Sourcing의 이점(이력·복원·시간 여행)을 누리면서 조회 성능까지 chasing 못한다.

## 장점

- **감사 추적**: 모든 상태 변화가 사건으로 영구 보존. 별도 audit log 불필요
- **시간 여행**: 특정 시점의 상태 조회·재현 가능 (디버깅·법적 증빙·테스트)
- **재해 복구**: Event Store만 살아있으면 read model을 통째 재구성
- **비즈니스 규칙 변경 흡수**: 새 규칙으로 과거 이벤트를 replay해 재집계 가능
- **새 Read Model 추가 비용 낮음**: Projection 하나 추가하면 기존 이벤트로부터 자동 구성
- **분산·MSA 친화**: 이벤트가 자연스러운 통신 단위라 서비스 간 결합 낮음

## 단점·트레이드오프

- **읽기 성능**: replay 비용 (Snapshot으로 완화)
- **저장 공간**: 모든 이벤트 영구 보관 → CRUD 대비 큰 스토리지
- **최종 일관성**: 쓰기 직후 read model에 즉시 반영 안 됨. UI·UX 설계에 영향
- **러닝 커브**: DDD·Aggregate·CQRS 개념 선행 필요
- **인프라 복잡도**: Event Store·Projection·구독·복구 파이프라인 운영 부담
- **이벤트 스키마 evolution**: 한 번 저장된 이벤트는 바꾸기 어렵다. **버전 필드·업캐스터(upcaster) 패턴** 필수
- **동시 쓰기 충돌**: 같은 aggregate 동시 수정 시 `expected_version` 기반 optimistic concurrency 필요

## 이벤트 스키마 진화 — Upcaster 패턴

```
저장된 이벤트: { type: 'OrderPlaced', v: 1, data: { items: [...] } }

코드는 v2 기대: { type: 'OrderPlaced', v: 2, data: { items, currency } }

Upcaster: v1 이벤트를 v2로 변환해서 Aggregate에 전달
```

- 이벤트는 절대 수정하지 않고, 읽을 때 변환 레이어를 통과시킴
- 신규 필드 default 값 또는 도메인 규칙으로 채움
- v3·v4 누적되면 변환 체인 관리가 부담 → snapshot에 최신 형태로 저장하는 것이 보완책

## Outbox / Event Store / Event Sourcing — 인접 개념 구분

| 패턴 | 무엇을 저장하나 | 상태 모델 | 적용 비용 |
|---|---|---|---|
| **Transactional Outbox** | 발행 대기 이벤트 | 기존 상태 테이블 그대로 | 낮음 |
| **Event Store + 상태 혼합** | 영속 이벤트 + 별도 상태 테이블 | 둘 다 유지 (중간 지점) | 중간 |
| **Event Sourcing** | 영속 이벤트만 | 상태는 replay로 도출 | 높음 |

Outbox는 **메시지 발행 신뢰성** 문제 해결이 목적이고, Event Sourcing은 **상태 모델링 자체**를 바꾸는 결정이다. Outbox로 시작해 Event Store 확장(과거 이벤트 리플레이·새 read model 구성)까지는 점진 가능하지만, 본격 Event Sourcing은 도메인 모델·CQRS·인프라까지 동시 결정이라 별도 도입 결정이 필요하다.

## 적합한 도메인

- 감사·규제 요구가 강한 시스템 (금융·의료·정부·SOX·GDPR 대응)
- 재화·자산의 흐름을 추적해야 하는 시스템 (거래·결제·재고)
- **제품 생애주기·상태 전이가 비즈니스 본질인 시스템** (DPP·공급망 추적·물류)
- 과거 시점 상태 재현이 자주 필요한 시스템 (분석·복기·디버깅)
- 마이크로서비스 환경에서 서비스 간 결합을 낮추고 싶을 때

## 부적합한 경우

- 단순 CRUD로 충분한 도메인 — 과설계
- 팀이 DDD·CQRS 경험 없는 초기 단계 — 러닝 커브 부담
- 즉시 일관성이 강하게 요구되는 트랜잭션 코어 — 최종 일관성과 충돌
- 도메인이 자주 통째로 바뀌는 초기 PMF 탐색 단계 — 이벤트 스키마 evolution 비용

## 운영 시 주의점

- **이벤트는 불변** — 수정·삭제 금지. 보정이 필요하면 새 이벤트(`PaymentReversed`)로 표현
- **이벤트 페이로드 최소화** — 변하지 않는 사실만. 외부 시스템 응답·시간 의존 데이터는 별도 조회 (Zero Payload 전략과 결합)
- **Aggregate 경계 설계가 핵심** — 너무 크면 동시성 충돌·이벤트 폭주, 너무 작으면 일관성 보장 깨짐
- **버전 필드 처음부터** — `event_type` + `version` 으로 시작해야 후속 진화 가능
- **재해 복구 시나리오 미리** — Read Model 전체 rebuild 비용·시간을 사전 측정
- **개인정보·민감 데이터** — Event Store가 영구 저장이라 GDPR 삭제 요청 시 crypto-shredding(키 폐기) 같은 전략 필요

## 관련 문서

- [[Transactional-Outbox|Outbox 패턴]] (메시지 발행 신뢰성 — Event Sourcing과 자주 결합)
- [[Saga-Pattern|Saga 패턴]] (분산 트랜잭션 — Event Sourcing과 자연스러운 짝)
- [[DDD&Hexagonal|DDD·Hexagonal]] (Aggregate·경계 모델링)
- [[CDC&Outbox|CDC vs Outbox]]

## 출처

- [Event Sourcing 패턴 — 매일메일](https://www.maeil-mail.kr/question/292)
- [이벤트 소싱(Event Sourcing) 개념 — mjspring on Medium](https://mjspring.medium.com/%EC%9D%B4%EB%B2%A4%ED%8A%B8-%EC%86%8C%EC%8B%B1-event-sourcing-%EA%B0%9C%EB%85%90-50029f50f78c)
- [Event Sourcing — sabarada](https://sabarada.tistory.com/231)
- [Event Sourcing 핵심 정리 — yoonseon](https://yoonseon.tistory.com/173)
