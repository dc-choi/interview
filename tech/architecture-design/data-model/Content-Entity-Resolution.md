---
tags: [architecture, data-model, content-metadata, entity-resolution]
status: done
verified_at: 2026-07-15
category: "Architecture - 데이터 모델"
aliases: ["Content Entity Resolution", "콘텐츠 식별과 중복 병합", "콘텐츠 정본 모델"]
---

# 콘텐츠 식별과 중복 병합

여러 제공처에서 영화와 시리즈 메타데이터를 수집하면 같은 작품이 서로 다른 ID, 제목, 출시일로 들어온다. 핵심은 수집 레코드를 바로 작품으로 취급하지 않고, 내부 정본과 제공처별 관측을 분리한 뒤 근거가 남는 매칭 절차로 연결하는 것이다.

## 먼저 분리할 다섯 개의 개념

| 개념 | 책임 | 수명 |
|---|---|---|
| `CanonicalContent` | 서비스가 사용하는 내부 작품 정체성 | 제공처가 바뀌어도 유지 |
| `SourceRecord` | 특정 제공처의 안정적인 콘텐츠 레코드 | 제공처의 ID와 구조를 따름 |
| `SourceSnapshot` | 수집 시점의 원본 payload | 관측마다 append-only로 추가 |
| `ExternalIdentifier` | EIDR 같은 외부 식별자와 네임스페이스 | 발급 주체의 규칙을 따름 |
| `AvailabilityObservation` | 특정 시각과 국가에서 확인한 시청 가능 상태 | 관측할 때마다 갱신 |

`SourceSnapshot`에는 원본 payload, checksum, parser version과 `observedAt`을 보존한다. 작품 정체성과 OTT 제공 상태를 같은 행에 덮어쓰면 수집 실패가 작품 삭제로 번지므로 제공 상태는 `provider`, `market`, `observedAt`을 가진 관측값으로 별도 갱신한다.

## 콘텐츠 계층

영상 콘텐츠는 한 단계의 작품 테이블만으로 표현하기 어렵다. EIDR은 시리즈에서 기술적 표현과 인코딩까지 다음과 같은 계층과 관계를 사용한다.

```text
Series
  └─ Season
      └─ Episode
          └─ Edit
              └─ Manifestation
```

- `Series`, `Season`, `Episode`는 서사와 편성의 계층이다.
- `Edit`는 방송용 단축본, 감독판처럼 동일 추상 작품에 창작적 변경이 적용된 버전이다.
- `Manifestation`은 해상도, 코덱, 언어 트랙처럼 기술적 표현이 달라진 자산이다.
- 모든 서비스가 Edit와 Manifestation까지 모델링할 필요는 없다. 서로 다른 버전을 같은 작품으로 잘못 병합하는 실제 문제가 있을 때만 확장한다.

OTT 검색 서비스의 최소 모델은 `MOVIE`, `SERIES`, `SEASON`, `EPISODE`와 부모 관계다. 예고편과 클립은 본편과 같은 작품으로 병합하지 않고 관계로 연결한다.

## 정본 ID와 제공처 ID

내부 ID와 제공처 ID는 역할이 다르다.

```text
CanonicalContent.id               내부에서 안정적인 ID
SourceRecord(provider, sourceId)  제공처 안에서만 유일한 복합 키
ExternalIdentifier(namespace, id) 외부 레지스트리의 식별자
```

지켜야 할 불변식은 다음과 같다.

- `(provider, sourceId)`는 하나의 `SourceRecord`만 가리킨다.
- 한 `SourceRecord`는 한 시점에 하나의 정본만 가리킨다.
- 정본을 병합해도 과거 내부 ID는 alias 또는 redirect로 보존한다.
- 원본 payload와 매칭 근거를 남겨 잘못된 병합을 되돌릴 수 있게 한다.
- 검색 인덱스 ID는 임의 생성값이 아니라 안정적인 정본 ID를 사용한다.

## 매칭 파이프라인

매칭은 강한 근거부터 약한 근거로 내려가는 waterfall로 구성한다.

### 1. 입력 검증과 정규화

- 제공처별 adapter가 외부 스키마를 내부 후보 모델로 변환한다.
- 제목은 원문과 정규화 값을 함께 저장하고 언어, 문자 체계, 지역, 제목 유형과 정규화 버전을 남긴다.
- 국가, 언어, 날짜, 상영시간 단위를 표준화한다.
- 작품 유형과 부모 관계가 맞지 않는 레코드는 매칭 전에 격리한다.

정규화는 비교를 돕는 단계이지 원본을 대체하는 단계가 아니다. 영문 제목과 한국어 제목, 리메이크 작품처럼 구분에 필요한 정보까지 제거하면 오탐이 늘어난다.

### 2. 결정적 매칭

다음처럼 충돌 가능성이 낮은 키를 우선한다.

1. 같은 namespace와 같은 작품 수준에서 검증된 외부 식별자가 정확히 일치한다.
2. 같은 제공처의 `sourceId`가 이미 연결돼 있다.
3. 같은 부모와 명시된 `sequenceDomain` 아래에서 회차 번호, 원방영일과 제목이 함께 일치한다.
4. 운영자가 승인한 alias가 존재한다.

강한 키가 서로 다른 정본을 가리키면 자동으로 하나를 선택하지 않고 충돌 큐로 보낸다.
시즌과 에피소드 번호만으로는 확정하지 않는다. 방송, 제작, 지역에 따라 번호 체계가 다르며 특별편, 파일럿과 합본 회차는 검토가 필요하다.

### 3. 후보 생성

전체 정본을 매번 비교하지 않고 다음 조건으로 후보군을 줄인다.

- 작품 유형
- 정규화 제목 또는 대체 제목
- 출시 연도 범위
- 부모 시리즈
- 제작 국가와 언어

후보 생성 단계에서 정답을 확정하지 않는다. 찾지 못한 오탐과 너무 넓은 후보군의 비용을 조절하는 단계다.

### 4. 점수화와 거부 조건

| 신호 | 의미 |
|---|---|
| 제목과 대체 제목 유사도 | 표기 차이와 번역 제목 보완 |
| 출시일 또는 연도 | 동명 작품 분리 |
| 상영시간 | 영화와 다른 편집본 구분 보조 |
| 감독, 주요 출연진 | 동명 리메이크 구분 보조 |
| 부모, 번호 체계와 회차 정보 | 시즌과 에피소드의 구조 신호 |

점수만 높다고 자동 병합하지 않는다. 작품 유형 불일치, 부모 불일치, 출시 연도 차이가 큰 경우처럼 명백한 거부 조건을 먼저 적용한다. 자동 병합, 검토 대기, 신규 정본 생성의 임계값은 별도로 둔다.
중복이 잠시 남는 비용보다 다른 작품을 합치는 비용이 보통 더 크므로 자동 병합은 precision을 우선한다.

### 5. 결정과 감사 기록

매칭 결과에는 최소한 다음을 남긴다.

```text
sourceRecordId
canonicalContentId
decision: AUTO_MATCH | REVIEW_MATCH | NEW_ENTITY | REJECT
ruleId
score
evidence
modelOrRuleVersion
decidedAt
```

AWS Entity Resolution의 rule-based workflow도 Match ID와 적용된 규칙을 함께 남긴다. 이 Match ID를 장기 정본 ID로 쓰지는 않더라도 결정 결과와 근거를 분리하는 설계는 재현성과 디버깅에 유용하다.

## 병합과 분할

잘못된 매칭은 데이터 운영에서 정상적으로 발생하므로 되돌리기 경로가 필요하다.

### 병합

1. 승자 정본 ID를 선택한다.
2. 패자 ID를 alias로 보존한다.
3. `SourceRecord`, 외부 ID와 관계를 승자에게 이동한다.
4. 검색과 캐시 projection을 새 revision으로 재생성한다.
5. 병합 사유와 작업자를 감사 로그에 남긴다.

### 분할

1. 새 정본을 만든다.
2. 잘못 연결된 제공처 자산과 관계만 이동한다.
3. 부모, 자식 관계와 외부 ID 충돌을 재검증한다.
4. 영향받은 검색 문서를 재색인한다.

원본 레코드를 삭제하거나 과거 ID를 재사용하면 캐시, 북마크, 이벤트 이력과 검색 인덱스가 서로 다른 작품을 가리킬 수 있다.

## 수집부터 검색까지

```text
Provider response
  → source adapter와 runtime validation
  → raw snapshot 저장
  → normalized candidate 생성
  → exact match와 candidate scoring
  → canonical link 결정
  → availability observation 기록
  → outbox
  → cache와 OpenSearch projection
```

- 수집과 매칭은 멱등하게 만들어 같은 payload를 재처리해도 연결이 늘어나지 않게 한다.
- 정본 변경과 outbox는 같은 트랜잭션에 기록한다.
- 검색 문서는 정본에서 다시 만들 수 있는 read model로 취급한다.
- 수집 실패 시 마지막 정상 관측을 유지하고 실패를 제공 종료로 변환하지 않는다.

## 운영 지표

- 작품 유형과 언어별 labeled pair, non-pair 평가셋에서 자동 병합 precision과 후보 탐색 recall
- 제공처별 신규 정본 생성률, 자동 병합률과 수동 검토율
- false merge, false split과 병합 후 되돌림 비율
- 외부 ID 충돌 건수
- 부모 없는 시즌과 에피소드 수
- 원본 대비 검색 projection 누락과 중복 수
- 수집 시각부터 검색 반영까지의 freshness p95와 p99

신규 정본 생성률이 갑자기 오르면 새 콘텐츠가 많아진 것이 아니라 parser 변경이나 매칭 규칙 회귀일 수 있다. 전체 평균과 함께 제공처별 추이를 본다.

## 관련 문서

- [[DDD-Hexagonal-In-Production-Pragmatics|외부 스키마를 격리하는 ACL]]
- [[Runtime-Validation-Libraries|TypeScript 런타임 검증]]
- [[Content-Availability-System-Design|콘텐츠 가용성과 최신성]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[OpenSearch-Indexing-Pipeline-Reliability|검색 projection 신뢰성]]

## 출처

- [How We Work - EIDR](https://www.eidr.org/how-we-work)
- [Introduction to the EIDR Data Model - EIDR](https://www.eidr.org/documents/Introduction%20to%20the%20EIDR%20Data%20Model.pdf)
- [EIDR Data Fields Reference - EIDR](https://www.eidr.org/documents/EIDR%202.6%20Data%20Fields%20Reference.pdf)
- [Creating a schema mapping - AWS Entity Resolution](https://docs.aws.amazon.com/entityresolution/latest/userguide/create-schema-mapping.html)
- [Creating a rule-based matching workflow - AWS Entity Resolution](https://docs.aws.amazon.com/entityresolution/latest/userguide/creating-matching-workflow-rule-based.html)
