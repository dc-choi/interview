---
tags: [architecture, recommendation-system, eligibility, availability, ott]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation Eligibility and Availability", "추천 자격 조건과 가용성", "OTT 추천 가용성 정책"]
---

# 추천 자격 조건과 가용성

Eligibility는 모델 점수와 별개의 정책 판정이다. 같은 작품도 사용자의 market, 현재 시각, 화면의 약속과 가용성 신뢰 상태에 따라 노출 가능 여부가 달라진다. 따라서 모든 화면에 같은 필터를 적용하지 않고, 보편 제약과 surface별 제품 제약을 분리한다.

```text
decision = eligibility(request, item, availability, subscriptionState, eligibilityPolicyVersion)
decision -> ALLOW | DENY | DEGRADE, eligibilityReasonCodes
```

## 보편 제약과 surface 제약

| 구분 | 예 | 적용 원칙 |
|---|---|---|
| 보편 제약 | 법적 차단, 연령과 안전 정책, 삭제된 정본, 명시적 사용자 차단 | 모든 후보 source와 fallback에서 우회하지 않음 |
| Surface 제약 | 현재 시청 가능성, 구독 일치, 이미 소비함, 제공처 중복 | 화면이 사용자에게 약속하는 가치에 따라 hard 또는 soft로 결정 |

예를 들어 내 OTT 홈은 현재 구독으로 바로 볼 수 있다는 약속 때문에 구독 일치와 최신 가용성을 hard constraint로 둘 수 있다. 전체 발견은 미구독 작품과 대여, 구매 작품도 유효하므로 같은 조건을 feature나 badge로 사용한다. 가격 비교 화면은 여러 offer를 보존하고, 콘텐츠 카드 목록은 정본 작품 단위로 묶을 수 있다.

각 surface 계약에는 다음을 명시한다.

- 화면의 사용자 약속과 목표 행동
- hard constraint, soft preference와 허용할 degradation
- `OBSERVED`, `UNAVAILABLE`과 조회 시 계산한 `FRESH`, `STALE`별 CTA 정책
- `MATCHED`, `NOT_MATCHED`, `NOT_REQUIRED`, `UNKNOWN` 구독 상태 처리
- 목표 개수 미달 시 재조회, fallback 또는 축소 응답 순서
- Eligibility 정책 버전, 결정 사유와 최종 재검사 시점

## Offer 단위 가용성 입력

작품에 제공처 이름만 붙이면 정액제와 대여, 구매를 구분하거나 종료된 deeplink를 제거하기 어렵다. 정확한 schema와 revision 불변조건은 [[Content-Availability-Data-Contract|콘텐츠 가용성 데이터 계약]]이 소유하며, eligibility는 다음 필드를 입력으로 사용한다.

| 필드 | 의미 |
|---|---|
| `contentId`, `market`, `offerId` | 작품, 시장과 offer의 정본 식별자 |
| `providerId`, `accessType` | 제공처와 `SUBSCRIPTION`, `FREE`, `RENT`, `BUY` 구분 |
| `requiredPlanIds` | 하나 이상 일치하면 충족하는 OR 요금제 조건, 빈 배열은 plan 일치 불필요 |
| `startsAt`, `endsAt` | 제공 유효 구간, 열린 경계는 `null` |
| `deeplink`, `deeplinkStatus` | 이동 경로와 검증 상태, 유효하지 않으면 직접 CTA 금지 |
| `observedAt`, `projectionRevision` | 관측 시각과 동일 범위의 단조 증가 revision |

사용자 구독 상태는 공용 offer와 분리해 `MATCHED`, `NOT_MATCHED`, `NOT_REQUIRED`, `UNKNOWN`으로 계산한다. `NOT_REQUIRED`는 access type 이름이 아니라 `requiredPlanIds=[]`일 때만 사용한다. `SUBSCRIPTION` offer의 빈 배열은 계약 위반으로 fail closed하고, `FREE`, `RENT`, `BUY`도 plan 조건이 non-empty면 같은 OR 일치 규칙을 적용한다. `UNKNOWN`을 다른 상태로 조용히 바꾸지 않는다.

## 상태 판정표

다음 표는 초기 안전 기본값이다. `freshMaxAge`, `maxStaleAge`와 refresh timeout은 surface별 SLO와 데이터 품질을 측정한 뒤 수치로 확정한다.

| 관측과 freshness | 지금 보기 화면 | 발견과 상세 화면 | CTA와 fallback |
|---|---|---|---|
| `OBSERVED + FRESH`, 유효 구간 | Surface가 허용한 access type과 구독 상태만 허용 | 모든 유효 offer 표시 가능 | `VERIFIED` deeplink만 직접 CTA 허용 |
| `OBSERVED + FRESH`, 시작 전 또는 종료 후 | 제거 | 작품 정보는 유지 가능 | 해당 offer CTA 제거 |
| `OBSERVED + STALE`, `maxStaleAge` 안 | bounded refresh 성공 때만 직접 시청 약속 | 마지막 offer와 관측 시각 표시 가능 | refresh 실패 시 CTA 제거 후 fallback |
| `OBSERVED + STALE`, `maxStaleAge` 초과 | 제거 | 작품은 유지하되 현재 제공처로 단정하지 않음 | offer CTA 제거 |
| `UNAVAILABLE` 또는 조회 실패 | 제거하고 안전한 목록으로 보충 | 작품 정보는 유지 가능 | 제공처와 직접 CTA를 알 수 없음으로 처리 |

`endsAt <= now`인 offer는 stale 허용 시간과 관계없이 직접 CTA에서 제외한다. 사용자가 보는 카드와 CTA의 약속이 다르면 각각 별도 decision을 기록한다.

`MATCHED`는 non-empty plan 조건을 충족한 offer, `NOT_REQUIRED`는 surface가 허용한 plan 조건 없는 무료, 대여와 구매 offer를 통과시킬 수 있다. `NOT_MATCHED`는 내 OTT 홈에서 제거하되 전체 발견에서는 유지할 수 있다. `UNKNOWN`은 일치로 추정하지 않고 직접 시청 약속을 제거해 전체 발견이나 제공처 선택형 fallback으로 내린다. 결제와 접근 권한처럼 보안에 영향을 주는 판단은 별도 권한 시스템에서 fail closed한다.

## 공유 AvailabilityEvaluation

Candidate, slate와 impression은 같은 nullable 계약을 사용한다. 필드는 `evaluationStage`, `evaluatedAt`, `lookupStatus`, `observationStatus`, 파생 `freshnessStatus`, `snapshotRef`, `subscriptionState`, `eligibilityPolicyVersion`, decision과 reason codes, `degradationMode`다. `snapshotRef`는 `projectionKey`, `observedAt`, `projectionRevision`을 가지며, freshness는 `evaluatedAt`을 기준으로 계산한다.

| `lookupStatus` | 관측 필드 | 필수 조건 |
|---|---|---|
| `NOT_EVALUATED` | observation, freshness와 snapshot 모두 `null` | `POLICY_SHORT_CIRCUIT`, `SOURCE_UNSUPPORTED_DEFERRED`, `NOT_REQUIRED_BY_SURFACE` 중 실행하지 않은 reason code 필요 |
| `RESOLVED`와 `OBSERVED` | freshness와 snapshot 필수 | 해당 surface의 `freshMaxAge`로 freshness 계산 |
| `RESOLVED`와 `UNAVAILABLE` | freshness와 snapshot `null` | 알 수 없음을 나타내는 reason code 필요 |
| `FAILED` | observation, freshness와 snapshot 모두 `null` | timeout, transport 같은 `degradationMode` 필요 |

Candidate 단계의 `SOURCE_UNSUPPORTED_DEFERRED`는 후보를 탈락시키지 않는다. 병합 또는 최종 재검사가 실행해 slate 전까지 `RESOLVED`나 `FAILED`로 전이해야 한다. `POLICY_SHORT_CIRCUIT`은 탈락으로 끝나며, `NOT_REQUIRED_BY_SURFACE`만 surface 계약이 허용할 때 후속 단계에도 남을 수 있다.

`subscriptionState`는 구독 overlay를 실행했다면 네 상태 중 하나여야 한다. Policy short circuit, source 미지원으로 연기했거나 surface가 조회를 요구하지 않아 overlay를 실행하지 않았다면 `null`과 위 reason code를 함께 남긴다. 조회는 성공했어도 refresh 실패나 fallback이 결과에 영향을 주면 `degradationMode`를 채운다. Snapshot이 없는 상태에 sentinel revision이나 가짜 freshness를 만들지 않는다.

## Retrieval과 최종 재검사

선택도가 높은 제약을 각 source의 Top K 뒤에서만 적용하면 유효한 후보가 K 밖에 남아 underfill이 발생한다.

1. 정본 삭제, 법적 차단과 신뢰할 수 있는 market 조건은 가능한 source에 push down한다.
2. Surface 정책을 retrieval이 지원하면 같은 `eligibilityPolicyVersion`과 snapshot으로 적용한다.
3. Push down할 수 없으면 최근 pass rate를 기준으로 제한된 overfetch를 하고, 목표 개수 미달 시 횟수와 deadline이 정해진 adaptive retry를 수행한다.
4. 병합 뒤 canonical item과 offer를 surface 계약에 맞춰 dedup한다.
5. 확률을 기록하는 stochastic 선택 직전에 최신 가용성, 구독과 안전 조건을 다시 검사하고 정확한 action space를 고정한다.
6. 선택 뒤 늦은 변경을 감지하면 기존 결정을 폐기하고 새 action space에서 정책 전체를 다시 실행하거나 OPE 무효 상태로 표시한다. Slate 일부만 삭제, 압축하거나 보충한 뒤 기존 propensity를 재사용하지 않는다.

최종 재검사는 오래된 캐시와 source별 snapshot 차이를 막는 방어선이지, retrieval에서 잃은 eligible Recall을 복구하는 수단이 아니다.

## 로그와 운영 지표

각 candidate, slate와 impression에는 위 `AvailabilityEvaluation`을 그대로 남긴다. 이 값이 있어야 당시 결과를 audit하고 정책 변경 전후를 비교할 수 있다.

- Filter 전후 `Recall@K`와 `eligible Recall@K`
- Source와 reason별 pass rate, rejection과 underfill
- Overfetch 배수, adaptive retry 횟수와 추가 지연
- Stale age 분포, 구독 상태별 비율과 refresh 성공률
- 만료 offer, 유효하지 않은 deeplink와 부적격 impression 비율
- Surface별 fallback과 축소 응답 비율

## 관련 문서

- [[Recommendation-System-Candidate-Generation|추천 후보 생성]]
- [[Recommendation-System-Ranking-Reranking|추천 랭킹과 재랭킹]]
- [[Recommendation-System-Serving-Operations|추천 서빙과 운영]]
- [[Recommendation-System-OTT-Aggregator-Design-Proposal|OTT 통합 서비스 추천 시스템 초기 설계안]]
- [[Content-Availability-Data-Contract|콘텐츠 가용성 데이터 계약]]
- [[Content-Availability-System-Design|콘텐츠 가용성 조회 시스템 설계]]

## 출처

- [Filtering vector matches - Google Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/filtering)
