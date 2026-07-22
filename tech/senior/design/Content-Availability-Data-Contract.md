---
tags: [senior, system-design, availability, data-contract, ott, opensearch]
status: done
verified_at: 2026-07-21
category: "Senior - 설계"
aliases: ["Content Availability Data Contract", "콘텐츠 가용성 데이터 계약", "OTT Offer 계약"]
---

# 콘텐츠 가용성 데이터 계약

이 문서는 콘텐츠별 OTT 제공 상태를 DB, Redis, OpenSearch와 추천 로그에서 같은 의미로 전달하기 위한 정본 계약이다. 캐시 갱신과 장애 격리는 [[Content-Availability-System-Design|콘텐츠 가용성 조회 시스템 설계]], 화면별 노출 판단은 [[Recommendation-System-Eligibility-Availability|추천 자격 조건과 가용성]]이 소유한다.

## 정본 grain과 식별자

- Content는 작품 정본, Provider는 OTT 사업자, Offer는 특정 시장에서 작품을 이용하는 한 가지 방식이다.
- 같은 Provider가 한 작품에 정액제, 대여와 구매 offer를 동시에 가질 수 있다.
- Snapshot grain과 `projectionKey`는 `{market}:{contentId}`다. `market`은 비즈니스 제공 지역이며 인프라 region이 아니다.
- `offerId`는 upstream의 안정 ID를 우선한다. 없으면 버전이 붙은 정본 tuple인 `providerId`, provider content mapping ID, market, access type, 정렬한 `requiredPlanIds` 집합 또는 entitlement rule ID로 합성한다.
- 가격, 관측 시각, deeplink와 제공 종료 시각처럼 바뀌는 값은 합성 ID에 넣지 않는다.

## Snapshot과 Offer

```graphql
union ContentAvailabilityResult =
    ObservedContentAvailability
  | UnavailableContentAvailability

type ObservedContentAvailability {
  snapshot: AvailabilitySnapshot!
}

type UnavailableContentAvailability {
  reason: AvailabilityUnavailableReason!
}

type AvailabilitySnapshot {
  projectionKey: ID!
  contentId: ID!
  market: Market!
  offers: [AvailabilityOffer!]!
  observedAt: DateTime!
  observationSource: ID!
  observationFence: Long!
  sourceVersion: String
  stateRevision: Long!
  projectionRevision: Long!
}

type AvailabilityOffer {
  offerId: ID!
  providerId: ID!
  accessType: AccessType!
  requiredPlanIds: [ID!]!
  startsAt: DateTime
  endsAt: DateTime
  deeplink: URL
  deeplinkStatus: DeeplinkStatus!
  price: Decimal
  currency: CurrencyCode
}

enum AccessType { SUBSCRIPTION FREE RENT BUY }
enum FreshnessStatus { FRESH STALE }
enum DeeplinkStatus { VERIFIED UNVERIFIED INVALID }
enum AvailabilityUnavailableReason { NO_VALID_SNAPSHOT }
```

- GraphQL 응답은 `__typename`을 상태 판별자로 사용한다. `ObservedContentAvailability`는 non-null `snapshot`을 반드시 가지며, `UnavailableContentAvailability`는 유효한 snapshot이 없음을 뜻한다. 저장소와 event의 tagged union은 각각 `observationStatus=OBSERVED`, `UNAVAILABLE`로 직렬화하며 같은 불변조건을 검증한다.
- `requiredPlanIds=[]`는 plan entitlement 일치가 필요 없다는 뜻이며 구매, 재생 권한이나 사용자 인증이 완료됐다는 뜻은 아니다. `SUBSCRIPTION` offer는 provider 기본 구독권도 정규화된 plan ID로 표현해 배열이 비어 있으면 계약 위반으로 격리한다. 다른 access type도 배열이 non-empty라면 plan 조건을 추가로 검사한다.
- 값이 여러 개면 그중 하나의 active entitlement만 있어도 충족하는 OR 조건이다. `providerId` 일치만으로 구독을 추정하지 않는다.
- 여러 entitlement가 동시에 필요한 AND나 중첩 조건이 생기면 배열의 뜻을 바꾸지 않는다. 연산자와 피연산자, rule version을 가진 별도 `entitlementRule`로 확장하고 schema version 전환을 거친다.
- `price`와 `currency`는 대여와 구매 등에 필요할 때 함께 채운다. 둘 중 하나만 있는 부분 상태는 허용하지 않는다.
- 직접 이동 CTA는 `deeplink`가 있고 `deeplinkStatus=VERIFIED`일 때만 허용한다. `UNVERIFIED`, `INVALID` 또는 `null` deeplink는 CTA allowlist 밖이다.
- `startsAt`, `endsAt`은 열린 경계일 수 있다. `endsAt <= now`인 offer는 마지막 snapshot에 남아 있어도 현재 유효하지 않다.
- `sourceVersion`은 같은 `observationSource` 안에서만 versioned comparator로 비교한다. Comparator 의미가 바뀌면 migration 경계를 두며, 여러 feed를 합치면 source별 cursor를 별도 상태로 보존한 뒤 snapshot을 만든다.

## 관측 가능 여부와 조회 시점 freshness

| GraphQL concrete type | 저장소와 event 상태 | 계산한 freshness | 의미 |
|---|---|---|---|
| `ObservedContentAvailability` | `OBSERVED` | `FRESH` | 허용 나이 안의 성공한 관측, `offers=[]`는 현재 offer가 없음을 확인함 |
| `ObservedContentAvailability` | `OBSERVED` | `STALE` | 관측은 존재하지만 consumer가 허용한 나이를 넘은 마지막 성공 snapshot |
| `UnavailableContentAvailability` | `UNAVAILABLE` | `null` | 유효한 snapshot이 없어 현재 상태를 알 수 없음 |

Freshness는 정본 응답 필드가 아니라 consumer가 조회 시점에 `observedAt`, 현재 시각과 versioned `freshMaxAge`로 계산한다. 같은 snapshot도 surface에 따라 다른 값이 될 수 있으며 OpenSearch에는 `FRESH`나 `STALE`을 영구 상태로 저장하지 않는다. Surface 응답이나 추천 event에 파생값을 내보낼 때는 `freshnessStatus`로 기록하고, refresh 실패 여부는 `degradationMode`와 metric으로 분리한다.

`UNAVAILABLE`은 제공처가 없다는 뜻이 아니다. Subgraph 통신 자체가 실패해 nullable `Content.availability`가 `null`인 GraphQL 실행 오류와 resolver가 반환한 `UnavailableContentAvailability`도 구분한다.

## 사용자 구독 overlay

공용 availability snapshot에는 사용자 구독을 넣지 않는다. Consumer는 offer의 `requiredPlanIds`와 별도 구독 조회 결과를 결합한다.

| 상태 | 의미 |
|---|---|
| `MATCHED` | `requiredPlanIds`와 사용자의 active entitlement 집합의 교집합이 하나 이상 있음 |
| `NOT_MATCHED` | plan 조회는 성공했지만 non-empty `requiredPlanIds`와 교집합이 없음 |
| `NOT_REQUIRED` | `requiredPlanIds=[]`여서 plan entitlement 일치가 필요하지 않음 |
| `UNKNOWN` | 구독 조회 실패 또는 판정 자료 부족 |

`UNKNOWN`을 `MATCHED`나 `NOT_MATCHED`로 저장하지 않는다. 카드, badge와 CTA에 미치는 영향은 versioned surface policy가 결정한다.

## Revision 불변조건

- `stateRevision`과 `projectionRevision`의 범위는 모두 `projectionKey`와 같다.
- `stateRevision`은 offer의 의미 있는 상태가 바뀔 때 증가한다.
- `projectionRevision`은 authoritative source 관측이 성공할 때마다 증가한다. 상태가 같아도 새 관측이면 더 큰 값과 새 `observedAt`을 발행한다.
- 단순 DB 재조회나 cache TTL 연장은 관측이 아니므로 revision과 `observedAt`을 바꾸지 않는다.
- Producer는 upstream I/O 전에 `projectionKey`별 단조 증가 `observationFence`를 원자 발급한다. Upstream이 단조 증가 cursor나 version을 주면 `sourceVersion`도 보존한다.
- Commit transaction은 row lock 또는 CAS로 fence가 마지막 적용값보다 큰지, 비교 가능한 `sourceVersion`이 퇴행하지 않는지 검사한 뒤에만 revision을 발급한다. 실패한 오래된 writer는 snapshot과 Outbox를 쓰지 않는다.
- Snapshot과 Outbox에는 `(projectionKey, projectionRevision)` unique constraint를 둔다. 충돌한 writer는 fence와 source version 검사부터 transaction을 재시도하며, stale이면 폐기하고 유효할 때만 새 revision을 받는다. Redis refresh lock은 이 정합성 규칙을 대신하지 않는다.
- Event ID는 `availability:{projectionKey}:{projectionRevision}`처럼 결정적으로 만들 수 있다. 같은 key와 revision의 재전송은 동일 payload hash여야 하며, 다르면 정합성 위반으로 격리한다.
- Consumer는 더 큰 `projectionRevision`만 적용하고, 같은 값은 중복, 작은 값은 늦게 도착한 event로 처리한다.

Local fence는 동시 요청의 순서만 보장한다. Upstream 자체가 과거 상태를 새 응답으로 돌려줄 수 있다면 monotonic source version, cursor나 이에 준하는 조건부 요청 없이 payload recency를 증명할 수 없으므로 해당 source를 별도 격리하거나 검증해야 한다.

## Redis와 OpenSearch 문서 범위

```text
Redis key     = availability:{market}:{contentId}
OpenSearch _id = {market}:{contentId}
external version = projectionRevision
```

OpenSearch의 `external` version은 같은 `_id`에 저장된 값보다 큰 version만 적용한다. 따라서 revision과 문서 ID의 범위가 반드시 같아야 한다. `_id=contentId`인 한 문서에 여러 market을 넣는다면 market별 revision을 external version으로 사용할 수 없으며, market별 문서로 분리하거나 콘텐츠 문서 전체의 단일 전역 revision을 도입해야 한다.

같은 version의 409는 이미 처리한 동일 event일 때만 성공한 중복으로 간주한다. Event ID와 payload hash가 다르면 조용히 무시하지 않고 invariant violation으로 기록한다.

권리 종료는 삭제가 아니라 더 큰 `projectionRevision`의 정상 snapshot과 `offers=[]`로 표현한다. Projection 자체를 제거해야 할 때는 기본적으로 같은 `_id`에 `deleted=true`, `projectionRevision`, 삭제 시각을 보존한 애플리케이션 수준의 durable tombstone 문서를 `external` version으로 기록하고 검색에서 제외한다.

OpenSearch physical delete의 version 정보는 `index.gc_deletes` 동안만 유지되며 기본값은 60초다. 따라서 physical delete만으로는 그보다 늦게 재처리된 작은 revision의 문서 부활을 막을 수 없다. Physical delete를 허용하려면 projector가 모든 write 전에 확인하는 별도 durable revision barrier를 두고, replay와 backfill 가능 기간 및 모든 재색인이 끝날 때까지 barrier를 보존해야 한다. Barrier가 없으면 tombstone을 제거하지 않는다.

## 소비자와 진화 계약

- Cache와 OpenSearch는 snapshot의 `projectionKey`, `projectionRevision`, `observedAt`과 offer를 같은 이름으로 기록한다. `freshnessStatus`는 읽을 때 계산하고, 추천 event는 [[Recommendation-System-Eligibility-Availability#공유 AvailabilityEvaluation|공유 AvailabilityEvaluation]]로 상태와 nullable snapshot 참조를 남긴다.
- 추천기는 snapshot을 수정하지 않고 별도 `eligibilityPolicyVersion`으로 노출 가능성을 판정한다.
- Field 추가는 additive하게 진행하고 event에 `schemaVersion`을 둔다. 의미 변경은 새 version과 dual-read 또는 backfill 기간을 갖는다.
- 이미 nullable `snapshot` object를 공개한 GraphQL API를 union으로 바꾸는 것은 breaking change다. 기존 API가 운영 중이면 새 versioned field를 추가하고 client operation check와 전환 기간을 거친 뒤 이전 field를 제거한다.
- Reindex는 active snapshot과 durable tombstone을 함께 옮기고 destination에 `version_type=external`을 지정해 source의 external `_version=projectionRevision`을 보존한다. DB에서 다시 적재한다면 각 write에 `version=projectionRevision&version_type=external`을 사용한다. 이를 보장할 수 없으면 외부 revision barrier를 먼저 적재한 뒤 event를 적용하며, reconciliation은 DB 정본과 파생 저장소의 key, revision, deleted 상태, stored `_version`과 payload hash를 비교한다.
- 권리 종료 event는 `offers=[]` snapshot으로, projection 삭제 event는 더 큰 revision의 durable tombstone으로 전파해 오래된 재처리가 상태를 되살리지 못하게 한다.

## 관련 문서

- [[Content-Availability-System-Design|콘텐츠 가용성 조회 시스템 설계]]
- [[Recommendation-System-Eligibility-Availability|추천 자격 조건과 가용성]]
- [[Recommendation-System-Feedback-Data|추천 피드백 데이터]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[OpenSearch-Indexing-Pipeline-Reliability|OpenSearch 인덱싱 파이프라인 신뢰성]]

## 출처

- [Index document and external versioning - OpenSearch](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/)
- [Delete document and deleted version retention - OpenSearch](https://docs.opensearch.org/latest/api-reference/document-apis/delete-document/)
- [Index settings and index.gc_deletes - OpenSearch](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings)
- [Reindex documents and external version preservation - OpenSearch](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/)
- [GraphQL Specification September 2025 - Handling Execution Errors](https://spec.graphql.org/September2025/#sec-Handling-Execution-Errors)
