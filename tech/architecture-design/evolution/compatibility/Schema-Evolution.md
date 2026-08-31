---
tags: [architecture, evolution, schema, event-driven, compatibility]
status: done
verified_at: 2026-08-31
category: "Architecture - 진화"
aliases: ["Schema Evolution", "스키마 진화", "이벤트 스키마 진화", "메시지 계약 진화"]
---

# 스키마 진화 (Schema Evolution)

메시지 스키마는 API보다 되돌리기 어렵다. 이미 발행된 메시지는 회수할 수 없고, 발행자가 소비자의 배포 시점을 통제하지 못하며, event store에 쌓인 이벤트는 사실상 영구다. REST처럼 새 엔드포인트로 격리하는 탈출구가 없어서, 진화의 부담이 전부 호환성 규칙과 그것을 강제하는 도구로 옮겨간다.

이 문서는 이벤트와 메시지 계약을 어느 방향으로 진화시킬지, 무엇이 안전하고 무엇이 깨지며, 그 규칙을 어디서 강제하고 언제 실제로 필드를 지울 수 있는지를 다룬다.

## 호환성은 방향이다

호환의 방향(backward, forward, full) 정의와 그 방향에서 배포 순서가 나오는 일반 프레임워크는 [[Backward-Compatibility-Design|하위 호환성 설계]]가 소유한다. 여기서는 그 프레임워크가 Schema Registry의 compatibility mode로 어떻게 구체화되는지만 본다.

| 모드 | 의미 | 먼저 배포할 쪽 | 대표 허용 변경 |
|---|---|---|---|
| BACKWARD | 새 소비자가 구 데이터를 읽음 | 소비자 | 필드 삭제, default 있는 필드 추가 |
| FORWARD | 구 소비자가 새 데이터를 읽음 | 발행자 | 필드 추가, default 있는 필드 삭제 |
| FULL | 양방향 | 순서 무관 | 모든 필드에 default가 있어야 함 |
| NONE | 검사 없음 | 해당 없음 | 전부 |

- Confluent Schema Registry의 기본값은 **BACKWARD**다 (2026-08-31 문서 기준). Kafka에서 소비자를 토픽 처음으로 되감아 과거 데이터를 다시 읽을 수 있어야 하기 때문이다.
- **transitive 변형**(BACKWARD_TRANSITIVE 등)은 직전 버전이 아니라 **등록된 모든 이전 버전**과 대조한다. 오래된 메시지가 retention 안에 남아 있거나 replay 대상이면 non-transitive는 안전 착시를 준다.
- 순서를 통제할 수 있으면 BACKWARD 또는 FORWARD로 충분하고, 소비자를 다 모르거나 배포 순서를 강제할 수 없으면 FULL_TRANSITIVE가 사실상의 요구사항이 된다.

## 안전한 변경과 깨는 변경

- **안전**: BACKWARD에서 default를 가진 optional 필드 추가, FORWARD에서 default를 가진 optional 필드 삭제, 문서와 description 보강, 값 추가가 아닌 의미 보존 리네이밍(alias 지원 포맷 한정).
- **깨짐**: 설정한 호환 방향과 default 조건을 만족하지 않는 필드 제거와 개명, 타입 변경, default 없는 필수 필드 추가, enum 값 제거, 필드의 의미를 조용히 바꾸기(같은 이름에 다른 단위).
- enum 값 **추가**는 포맷과 호환 방향, default 규칙에 따라 판정이 갈린다. 예를 들어 Avro의 old reader enum에 새 symbol과 reader default가 없으면 resolution error가 나므로 forward와 full 호환을 깬다. 스키마 검사를 통과하는 조합에서도 exhaustive 분기를 하는 소비자는 깨질 수 있다. 같은 회색지대 분류를 요청-응답 계약에서 다룬 예가 [[GraphQL-Schema-Design|GraphQL 스키마 설계]]의 breaking, dangerous, safe 3분류다.

포맷별로 규칙의 강제 지점이 다르다.

| 포맷 | 진화의 축 | 삭제 처리 | 규율의 소재 |
|---|---|---|---|
| Avro | writer 스키마와 reader 스키마를 이름으로 매칭 | reader에 없는 writer 필드는 무시 | reader에만 있는 필드는 default가 없으면 오류 |
| Protobuf | **필드 번호**가 정체성, 이름이 아님 | 번호를 `reserved`로 봉인 | 번호 재사용 금지가 사람 규율이 아니라 문법 |
| JSON | 강제 장치 없음 | 없음 | 전부 사람과 CI에 옴 |

- Avro는 필드를 이름으로 매칭하므로 순서는 무관하다. reader가 가진 필드가 writer에 없으면 **reader의 default**를 쓰고, default가 없으면 오류다. 즉 Avro에서 default는 편의가 아니라 진화의 필수 조건이다. 숫자 promotion은 int → long → float → double 방향으로만 허용된다 (Avro 1.12 명세 기준).
- Protobuf에서 필드 번호는 wire format상 필드의 정체성이라 배포 후 변경할 수 없다. 필드를 지웠으면 번호를 `reserved`에 등록해 재사용을 막아야 한다. 재사용하면 구 데이터가 새 필드로 조용히 잘못 해석된다. 포맷 자체의 소개는 [[gRPC|gRPC]]와 [[Java-IO-Serialization-and-Data-Formats|직렬화와 데이터 포맷]]이 소유한다.
- JSON은 스키마 강제가 없어 가장 자유로워 보이지만, 그래서 가장 위험하다. 안전한 변경과 깨는 변경의 구분이 코드 리뷰어의 기억에만 남는다.

## 소비자 쪽 규율: Tolerant Reader

발행자가 규칙을 완벽히 지켜도 소비자가 엄격 파서면 dangerous change에서 깨진다. must-ignore, 필요한 것만 읽기, 미지 enum fallback, 파싱 지점 격리로 이뤄진 **Tolerant Reader** 규율 자체는 [[Backward-Compatibility-Design|하위 호환성 설계]]가 소유한다. 메시지 계약에서 추가되는 것은 두 가지다.

- 메시지 소비는 요청-응답과 달리 **재시도와 replay가 있다**. 미지 값에서 예외를 던지면 그 메시지는 재시도 루프나 DLQ로 가고, 스키마가 아니라 운영 문제로 번진다.
- 그래서 registry의 전체 스키마 검증을 소비 시점 안전장치로 믿지 않는다. 과한 검증은 발행자의 무해한 추가까지 소비 실패로 만든다.

요청-응답 계약에서 같은 원리를 적용한 클라이언트 진화 내성 3종은 [[GraphQL-Schema-Design|GraphQL 스키마 설계]]가 소유한다.

## 계약을 강제하는 지점

CI의 스키마 diff와 consumer-driven contract 테스트로 깨짐을 기계가 잡게 하는 일반론은 [[Backward-Compatibility-Design|하위 호환성 설계]]가, 그 검사를 품질 게이트로 배치하는 방법론은 [[Architecture-Fitness-Functions|아키텍처 fitness function]]이 소유한다. 메시지 계약에만 있는 강제 지점은 **등록 게이트**다.

- Schema Registry의 compatibility mode를 subject별로 명시하고, 위반 스키마는 등록 자체가 실패하게 둔다. 사람이 아니라 브로커 앞단이 판정한다.
- 다만 등록 게이트는 발행 직전이라 늦다. CI 단계의 스키마 diff와 순서가 겹치는 것이 아니라, 우회 경로(수동 등록, 다른 파이프라인)를 막는 최후 방어선이다.

## 전송 중 메시지와 저장된 이벤트

같은 스키마 진화 문제가 두 지점에서 서로 다른 해법을 요구한다.

- **전송 중 메시지**: 이미 브로커에 들어간 메시지는 제자리에서 수정할 수 없다. 필요하면 읽어서 변환한 뒤 새 topic이나 새 version으로 재발행할 수 있지만 원본과 순서, 중복, 소비자 전환을 함께 관리해야 한다. 그래서 **발행 전에** registry 호환성 검사로 막는 것이 기본이다.
- **저장된 이벤트**: event store의 과거는 바꿀 수 없다. 그래서 **읽기 경로에서** Upcaster로 구 버전을 신 버전으로 변환해 흡수한다. 변환 코드 예시, 변환 체인 누적 대응과 `event_type` + `version` 필드 도입 권고는 [[Event-Sourcing|Event Sourcing]]이 소유한다.
- 둘은 대체재가 아니다. Event Sourcing으로 저장하면서 외부로도 발행하는 시스템은 **양쪽 다** 필요하다. Upcaster는 내부 재구성만 구제하고, 이미 외부로 나간 메시지는 구제하지 못한다.
- 이벤트 발행 경로 자체의 신뢰성은 [[Transactional-Outbox|Transactional Outbox]]가, CDC로 스키마 변경을 흘려보낼 때의 운영은 [[CDC-Debezium-Operations|Debezium 운영]]이 소유한다.

## 폐기에서 제거까지

Expand, migrate, contract 3단계와 contract를 시간이 아니라 사용량 계측과 소비자 인벤토리라는 증거로 넘어간다는 원칙은 [[Backward-Compatibility-Design|하위 호환성 설계]]가 소유한다. 메시지 계약에서는 소비자 증거 위에 **저장된 과거**라는 조건이 추가로 붙는다.

1. **보존 정책과 replay horizon 확인** — `delete` 정책이면 retention window가 지났는가. `compact` 정책이면 같은 key의 이전 값이 정리됐는가. 두 정책을 함께 쓰는지와 tombstone 보존 기간까지 확인해 실제 replay 범위를 판정한다.
2. **replay 대상 구간 확인** — 재처리를 어디까지 돌리는가. replay 시작점이 필드 도입 이전이면 소비자가 전부 이관돼도 필드를 지울 수 없다.

살아 있는 소비자가 0이어도 이 두 조건이 남아 있으면 contract 단계로 넘어가지 못한다. DB 스키마는 마이그레이션으로 과거를 고쳐 창을 닫을 수 있지만 발행된 메시지는 그럴 수 없어서, 같은 패턴이라도 contract가 훨씬 길어진다. DB 층의 Expand-Contract 절차는 [[Blue-Green|Blue-Green 배포]]가, 마이그레이션 히스토리와 roll-forward 규칙은 [[Schema-Versioning|스키마 버저닝]]이 소유한다.

## 내부 이벤트와 외부 이벤트

진화 자유도는 계약의 도달 범위에 비례해 줄어든다.

- 한 컨텍스트 안에서만 도는 이벤트는 팀이 모든 소비자를 알고 있어 동시 배포로 깨는 변경을 밀어붙일 수 있다.
- 팀 경계를 넘는 published language는 그럴 수 없다. 소비자 목록이 불완전하고, 배포 시점도 통제 밖이다.
- 그래서 계약을 등급으로 나눠 둔다. 내부 등급은 BACKWARD 정도로 두고 실험 여지를 남기고, 외부 등급은 FULL_TRANSITIVE와 명시적 폐기 기간을 강제한다. 등급이 없으면 모든 이벤트가 가장 엄격한 규칙을 받아 안쪽 개발 속도가 죽는다.
- Application, Internal, External 3계층 이벤트 전파 분류와 8개 결정 층은 [[Event-Driven-Architecture|Event-Driven Architecture]]가 소유한다. 여기서는 그 분류를 계약 등급의 기준으로 쓰기만 한다.

## 흔한 함정

- **버전 필드를 나중에 붙이기** — 초기 이벤트의 version 누락을 v1로 간주하거나 event type과 store metadata로 legacy 이벤트를 골라 upcast할 수는 있다. 다만 예외 분기가 영구히 남으므로 첫 이벤트부터 명시적 version을 두는 편이 단순하다.
- **JSON이라 안전하다는 착각** — 강제 장치가 없는 것이지 깨지지 않는 것이 아니다.
- **registry를 등록소로만 쓰기** — compatibility mode를 NONE으로 두면 registry는 스키마 보관함일 뿐 게이트가 아니다.
- **non-transitive로 만족하기** — replay나 긴 retention이 있으면 직전 버전만 통과해도 두 단계 전 데이터에서 깨진다.
- **소비자만 보고 제거 일정 잡기** — 남은 소비자가 0이어도 retention 안의 메시지와 replay 구간이 필드를 붙잡는다.
- **DB 스키마 호환과 메시지 스키마 호환을 같은 문제로 취급** — DB는 마이그레이션으로 과거를 고칠 수 있지만, 발행된 메시지는 고칠 수 없다.

## 면접 체크포인트

- backward와 forward 호환성을 배포 순서로 유도해 설명하기
- Upcaster와 registry 호환성 검사가 서로 대체재가 아닌 이유
- 필드를 실제로 제거할 수 있는 시점을 무엇으로 판단하는가
- Tolerant Reader 없이 발행자 규율만으로 부족한 이유
- Avro의 default 의무와 Protobuf의 필드 번호 불변이 각각 무엇을 방어하는가
- 내부 이벤트와 외부 이벤트에 다른 호환성 등급을 두는 근거

## 출처

- [Confluent Documentation, Schema Evolution and Compatibility Types](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
- [Confluent Developer, Schema Registry 101, Testing Schema Compatibility](https://developer.confluent.io/courses/schema-registry/schema-compatibility/)
- [Apache Avro, Specification (Schema Resolution)](https://avro.apache.org/docs/1.12.0/specification/)
- [Protocol Buffers, Language Guide (proto3) — Updating A Message Type](https://protobuf.dev/programming-guides/proto3/)
- [Tolerant Reader — martinfowler.com](https://martinfowler.com/bliki/TolerantReader.html)
- [ParallelChange — martinfowler.com](https://martinfowler.com/bliki/ParallelChange.html)

## 관련 문서

- [[Backward-Compatibility-Design|하위 호환성 설계 — 방향과 배포 순서, Tolerant Reader, Expand-Contract의 기질 중립 원칙]]
- [[Event-Sourcing|Event Sourcing — Upcaster 패턴]]
- [[GraphQL-Schema-Design|GraphQL 스키마 설계 — 버전 없는 진화]]
- [[Schema-Versioning|스키마 버저닝 — DB 마이그레이션 히스토리]]
- [[Blue-Green|Blue-Green 배포 — DB Expand-Contract]]
- [[Event-Driven-Architecture|Event-Driven Architecture — 3계층 이벤트 전파]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium-Operations|Debezium 운영 — schema history]]
- [[Architecture-Fitness-Functions|아키텍처 fitness function]]
- [[gRPC|gRPC와 Protocol Buffers]]
- [[Java-IO-Serialization-and-Data-Formats|직렬화와 데이터 포맷]]
