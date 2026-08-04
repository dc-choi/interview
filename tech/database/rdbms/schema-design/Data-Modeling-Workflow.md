---
tags: [database, modeling, conceptual-model, logical-model, physical-model, erd]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Data Modeling Workflow", "데이터 모델링 절차", "개념 논리 물리 모델링"]
---

# 데이터 모델링 절차

데이터 모델링은 화면의 명사를 table로 옮기는 작업이 아니다. 비즈니스가 보존해야 할 사실과 규칙을 찾아 **개념 모델, 논리 모델, 물리 모델**로 구체화하고, 실제 query와 변경 요구로 다시 검증하는 반복 과정이다.

## 세 단계의 목적

| 단계 | 중심 질문 | 주요 산출물 |
|---|---|---|
| 개념 | 어떤 사실과 관계를 관리하는가? | 핵심 entity, 관계, cardinality, 용어 사전 |
| 논리 | 관계형 모델로 무결성을 어떻게 표현하는가? | attribute, candidate key, PK/FK, 정규화된 ERD |
| 물리 | 대상 DBMS와 workload에서 어떻게 저장/조회하는가? | data type, index, constraint, DDL, 운영 규칙 |

세 단계는 일방향 waterfall이 아니다. 물리 query에서 필요한 이력의 의미가 불명확하면 개념 요구사항으로 돌아가고, 논리 모델의 무결성을 물리 최적화 때문에 약화한다면 보완 장치를 다시 설계한다.

## 1. 요구사항에서 사실과 규칙을 찾는다

명사는 entity 후보, 동사는 관계/행위 후보가 될 수 있지만 자동 변환 규칙은 아니다. 다음을 함께 묻는다.

- 시스템이 직접 보존할 사실과 외부 시스템에서 조회할 사실은 무엇인가?
- 한 instance를 다른 것과 구분하는 안정적인 기준은 무엇인가?
- 생성, 변경, 종료 주기와 소유자는 누구인가?
- 수량, 필수/선택 참여와 시간에 따른 관계 변화는 무엇인가?
- 감사, 복원과 과거 시점 재현이 필요한가?
- 대표 command/query와 실패 시 지켜야 할 불변식은 무엇인가?

회원, 상품, 주문 같은 명칭이 같아도 서비스별 의미는 다르다. MVP 범위를 정하되 미래를 추측해 모든 확장을 선반영하지 않고, 알려진 변경 축을 막지 않는 구조를 선택한다.

## 2. 개념 모델을 만든다

Entity는 독립적으로 식별하고 여러 속성을 보존할 가치가 있는 같은 종류의 instance 집합이다. 유형/사건, 핵심/행위, 강함/약함 같은 분류는 질문을 돕는 heuristic이지 table 생성이나 성능 최적화를 자동 결정하지 않는다.

### Attribute와 식별자

- 하나의 attribute는 업무상 한 의미와 domain을 가진다.
- 표시 이름과 안정적인 식별자를 구분한다.
- 파생 가능한 값은 저장 이유와 갱신 책임을 명시한다.
- 자연 식별자가 바뀔 수 있다면 대리 키와 `UNIQUE` natural key를 함께 검토한다.

### 관계

Cardinality는 한 instance가 다른 쪽 몇 개와 관계하는지, participation은 관계가 필수인지 선택인지 나타낸다. 개념 단계에서는 FK column보다 업무 문장으로 검증한다.

```text
한 Order는 한 명의 Buyer가 생성한다.
한 Order는 하나 이상의 OrderLine을 가진다.
한 Product는 주문되지 않아도 존재할 수 있다.
```

M:N 관계에 수량, 시점, 역할 같은 속성이 있으면 관계 자체를 `OrderLine`, `Membership` 같은 연관 entity로 승격한다. 속성이 없어 보여도 논리 모델에서는 연결 table이 필요하다.

## 3. ERD와 용어 사전으로 합의한다

ERD는 비즈니스와 schema를 소통하는 지도다. 모든 column, framework class와 화면 흐름을 한 diagram에 넣기보다 목적별 view를 나눈다.

- 개념 ERD는 핵심 entity와 업무 관계에 집중한다.
- 논리 ERD는 key, attribute, optionality와 정규화를 표현한다.
- 물리 ERD는 실제 table/column, type, index와 constraint를 반영한다.

까마귀발 표기법은 널리 쓰이지만 도구별 기호 차이가 있으므로 legend를 둔다. 자동 reverse engineering 결과도 FK가 없는 논리 관계, 업무 규칙과 query 의도를 복원하지 못하므로 사람이 검토한다.

용어 사전은 한국어/영어 이름, 정의, 동의어, 금지어, data owner와 예시를 연결한다. 약어는 짧다는 이유가 아니라 팀 전체에서 유일하고 이해 가능한 경우에만 쓴다. 살아 있는 문서가 되려면 migration/DDL과 함께 review하고 변경 주체를 둔다.

## 4. 논리 모델로 변환한다

일반적인 출발점은 다음과 같다.

- entity는 relation/table 후보, attribute는 column 후보가 된다.
- candidate key 가운데 PK를 선택하고 나머지는 `UNIQUE`로 보존한다.
- 1:N은 N쪽 FK, M:N은 연결 table로 표현한다.
- optionality를 `NULL`/`NOT NULL`과 생성 순서로 구체화한다.
- 함수 종속성을 분석해 정규화하고 이력 snapshot은 현재 사실과 구분한다.

각 규칙에는 예외가 있다. 값 객체를 여러 column으로 펼칠 수 있고, 같은 aggregate의 논리 entity 여러 개가 한 table을 공유할 수도 있다. 중요한 것은 변환 규칙보다 의미와 무결성이 보존되는지다.

## 5. 물리 모델을 결정한다

### 이름과 type

- `snake_case`, 단수/복수 같은 관행 중 하나를 정해 일관되게 적용한다.
- data type은 현재 sample이 아니라 허용 범위, 정밀도, 정렬/비교와 client 직렬화를 기준으로 정한다.
- PK를 무조건 `BIGINT`로 고정하지 않는다. 성장 상한과 secondary index 비용을 비교한다.
- 금액은 통화/최소 단위를 명시한 integer 또는 정확한 `DECIMAL`을 쓰고 부동소수점은 피한다.
- business event 시각(`ordered_at`)과 저장/수정 시각(`created_at`, `updated_at`)을 분리한다.
- MySQL `TIMESTAMP`와 `DATETIME`은 범위, timezone 변환과 default 동작을 대상 version에서 확인한다.

### Constraint와 index

PK/FK/UNIQUE/CHECK/NOT NULL로 가능한 불변식을 DB에 둔다. Index는 관계가 있다는 이유만이 아니라 실제 equality/range/order/join query와 selectivity로 설계한다. MySQL이 FK용 index를 만들더라도 복합 query를 만족하는지는 별도 문제다.

역정규화는 정규화 뒤 측정된 읽기 병목을 해결하는 수단이다. 중복 column, 파생 값, table 통합을 적용할 때 원본, 갱신 transaction, 재계산과 불일치 탐지 방법을 함께 남긴다.

## 검증과 전달

1. 대표 command가 constraint를 지키며 원자적으로 처리되는지 확인한다.
2. 대표 query의 결과 grain과 join fan-out을 sample/edge data로 검증한다.
3. `EXPLAIN ANALYZE`와 운영 규모에 가까운 data로 index를 확인한다.
4. migration의 expand/backfill/contract 순서와 rollback/forward fix를 rehearsal한다.
5. table 정의서에는 column 의미, 단위, 민감도, default, owner와 보존 정책을 기록한다.
6. ERD, DDL과 application mapping의 drift를 CI 또는 정기 점검으로 찾는다.

## 출처

- [MySQL 8.4, Data Types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html)
- [MySQL 8.4, Date and Time Types](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-types.html)
- [인프런, Hong, 데이터 모델링](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338547)
- 강의 소개/자료: [소개](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347595), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347692)
- 설계의 중요성: [첫걸음](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347603), [잘못된 설계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347604), [3단계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347605), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347606)
- 개념 모델: [요구사항](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347608), [Entity](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347609), [분류 1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347610), [분류 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347611), [속성/식별자](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347612)
- 개념 관계/문서: [Cardinality/참여](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347613), [ERD](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347614), [연관 Entity](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347615), [용어 사전](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347616), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347617)
- 개념 모델 실습: [요구사항](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347619), [시작](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347620), [ERD](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347621), [용어 사전](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347622), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347623)
- 물리 모델: [개요](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347672), [명명 1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347673), [명명 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347674), [Type 1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347675), [Type 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347676), [역정규화](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347677), [Table 정의서](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347678), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347679)
- 물리 모델 실습: [시작](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347681), [Index](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347682), [역정규화](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347683), [정의서](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347684), [DDL](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347685), [ERD 자동 생성](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347686), [기능 확인 1](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347687), [기능 확인 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347688), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347689)
- [강의 마무리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347691)

## 관련 문서

- [[Relational-Relationship-Modeling|관계형 관계 모델링]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Normalization|정규화]]
- [[Schema-Design|Schema design]]
- [[Index|Index 설계]]
