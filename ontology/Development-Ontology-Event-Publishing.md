---
tags: [ai, ontology, development, messaging, reliability]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Event Publishing Decision Map", "이벤트 발행 판단 지도"]
knowledge_baseline_date: 2026-09-05
knowledge_source_revision: 3c41985f38e6b8ea0b6cdde43daf54e862e34c5d
---

# DB 저장 후 이벤트 발행 판단 지도

> 대상 질의: 업무 데이터를 DB에 저장한 뒤 이벤트를 보내 다른 처리기가 후속 작업을 실행한다.
>
> 용도: 개발 요청을 읽을 때 관련 원문과 검토 항목을 먼저 찾는 읽기 전용 지도다. 아래 내용은 작성된 가설과 query-time 검토 항목이며, 기술 채택 결정, 현재 코드 사실, 자동으로 생성한 승인 관계가 아니다.
>
> `status: done`은 이 문서 작성이 끝났다는 뜻일 뿐, 설계나 구현의 완료를 뜻하지 않는다.
>
> `knowledge_baseline_date`는 이 지도가 저장소 원문을 대조한 날짜다. 원문이 인용한 1차 자료 전체를 그 날짜에 재검증했다는 뜻은 아니며, 그 최신성은 각 원문 문서의 출처와 `verified_at`을 따른다.

## 판단 시작점

DB 변경이 성공했지만 프로세스 종료나 브로커 전송 실패로 후속 처리가 영구히 누락되면 안 되는가를 먼저 확인한다. 그렇다면 DB 저장과 이벤트 기록을 같은 로컬 트랜잭션에 남기고, 별도 Relay가 발행하는 Outbox를 검토한다. 단, Outbox는 발행 중복 가능성을 남기므로 소비 처리와 외부 부수효과의 멱등성까지 함께 검토한다.

## 고려사항과 확인 경로

| 고려사항 | 적용 조건과 검토 가설 | 원문 근거 | 현재 코드에서 확인할 것 | 비용 또는 tradeoff |
| --- | --- | --- | --- | --- |
| DB 저장과 발행의 간극 | DB 변경 뒤 이벤트 유실이 허용되지 않으면, 비즈니스 쓰기와 outbox insert를 같은 트랜잭션으로 묶을 수 있는지 검토한다. | [[Transactional-Outbox#문제: Dual Write Problem]], [[Transactional-Outbox#해결: Outbox 테이블]] | 트랜잭션 경계, 이벤트 생성 위치, commit 뒤 직접 브로커 호출 여부, 실패 시 재처리 근거 | outbox 스키마와 쓰기, Relay 장애 관측을 추가로 운영한다. |
| Relay와 중복 발행 | Relay 재시도, 발행 성공 뒤 상태 마킹 전 종료가 가능한 경우 at-least-once를 전제로 둔다. polling과 CDC는 지연, 운영 역량, 기존 인프라로 판단한다. | [[Transactional-Outbox#Relay 구현 방식]], [[Transactional-Outbox#어느 축도 중복을 없애지는 못한다]] | outbox 상태와 인덱스, 발행 확인 기록, retry와 실패 관측, Relay의 실행 위치 | polling은 DB 조회와 지연을, CDC는 connector와 broker 운영 부담을 늘린다. |
| 다중 인스턴스와 좌초 회수 | Relay가 여러 인스턴스에서 실행되면 행 claim, 단일 runner, 중복 허용 중 어떤 제어가 필요한지 검토한다. claim을 쓴다면 crash 뒤 lease 또는 회수 경로가 있어야 한다. | [[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때]], [[Transactional-Outbox#행 단위 claim]] | 배포 인스턴스 수, scheduler 중복 실행, lock 또는 claim 상태, timeout과 좌초 행 회수 | claim 상태, timeout, 회수와 운영 지표가 추가된다. |
| 소비 처리의 멱등성 | 같은 이벤트가 다시 도착해도 효과가 한 번과 같아야 하면 자연 멱등, 상태 전이 가드, Inbox를 효과 성격에 따라 조합할 수 있으므로 함께 검토한다. check-then-act 분리는 동시 중복에 취약하다. | [[Idempotent-Consumer#멱등성 확보 전략]], [[Idempotent-Consumer#원자성이 핵심 — check-then-act 레이스]], [[Idempotent-Consumer#Inbox 패턴]] | 이벤트 ID 또는 업무 키, UNIQUE 제약, ACK 시점, 중복 수신 시 결과, 업무 쓰기와 dedup 기록의 트랜잭션 | Inbox 저장 공간, UNIQUE 충돌 처리, 조회와 보존 기간 관리가 필요하다. |
| 외부 부수효과와 키 보관 | 결제, 알림, 외부 API처럼 같은 DB 트랜잭션에 묶을 수 없는 효과는 provider 멱등 키와 결과 대사 가능성을 검토한다. 키 TTL은 재시도, DLQ, 수동 재처리 기간보다 길어야 한다. | [[Idempotent-Consumer#외부 알림 발송과 클라이언트 `event_id`]], [[Idempotency-Key#고유 식별자 종류]], [[Idempotency-Key#TTL 정리]] | provider의 멱등 계약, 동일 키 재시도, 결과 불명확 시 대사, TTL과 메시지 보존 및 redrive 기간 | provider 계약 차이, 대사 절차와 키 보관 비용을 감수한다. |
| 순서와 이벤트 내용 | 후속 처리에 현재 상태만 필요하면 식별자 기반 재조회가 가능한지, 중간 전이나 projection처럼 순서가 의미 있으면 version 또는 sequence가 있는지 검토한다. 이벤트는 구독자에게 명령하기보다 발생 사실을 나타내는지 확인한다. | [[Transactional-Outbox#이벤트 설계 — 목적이 아닌 사실을 발행]], [[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성]] | partition 또는 ordering key, version 또는 sequence, stale payload 처리, 이벤트 이름과 소비자별 책임 | 원본 재조회는 source DB 부하를, version과 sequence는 스키마 및 처리 복잡도를 늘린다. |

## 적용 조건

- DB 변경과 비동기 후속 처리 사이에서 유실이 업무 오류가 되는 경우
- 후속 처리기가 독립적으로 재시도되거나 여러 인스턴스에서 실행될 수 있는 경우
- 중복 발행 또는 중복 수신이 금전, 상태 전이, 외부 요청에 영향을 줄 수 있는 경우

## 단순 작업일 때의 비적용 사례

1. 하나의 DB 트랜잭션 안에서 필요한 업무 레코드와 파생 레코드를 함께 저장하고, 별도 브로커나 독립 처리기가 없다면 Outbox와 Relay는 추가하지 않는다.
2. 캐시 예열처럼 누락돼도 다음 요청이나 주기 작업으로 자연 복구되고, 손실을 명시적으로 받아들인 보조 작업이면 durable event 보장을 요구하지 않는다.

## 제안 출력 예시

> 이 요청은 DB commit 이후의 발행 실패가 후속 처리 누락으로 이어질 수 있습니다. 먼저 현재 트랜잭션과 브로커 호출 위치를 확인하겠습니다. 유실이 허용되지 않으면 같은 DB 트랜잭션의 outbox 기록, Relay 재시도, 소비자의 event ID 기반 멱등 처리를 함께 제안할 수 있습니다. 외부 API가 있으면 provider의 멱등 키와 결과 대사 방식도 확인이 필요합니다.

> 캐시 예열처럼 누락을 허용하고 다음 요청에서 복구되는 작업이라면 Outbox를 도입하지 않고, 단순 비동기 실행과 실패 관측으로 충분한지 먼저 판단하겠습니다.

## 원문 연결

- [[Transactional-Outbox#문제: Dual Write Problem|Transactional Outbox, Dual Write Problem]]
- [[Transactional-Outbox#해결: Outbox 테이블|Transactional Outbox, Outbox 테이블]]
- [[Idempotent-Consumer#멱등성 확보 전략|멱등 컨슈머, 멱등성 확보 전략]]
- [[Idempotency-Key#중복 감지 저장소|멱등성 키, 중복 감지 저장소]]

## 관련 문서

- [[Development-Ontology]]
- [[Development-Ontology-Contract]]
- [[Development-Ontology-Evaluation]]
- [[Ontology-Context-Platform-Implementation|Markdown Vault 기반 온톨로지 구축 방법]]
- [[Ontology-Operations|실행 절차와 한계]]
