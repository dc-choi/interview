---
tags: [architecture, code-quality, enum, lookup-table, type-safety, design]
status: done
verified_at: 2026-08-04
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Common Code Management", "공통 코드 관리", "Enum 관리"]
---

# 공통 코드 관리

상태, 유형, 표시 이름처럼 제한된 값 집합을 DB, 서버와 클라이언트에서 일관되게 사용하는 방법이다. 모든 값을 하나의 공통 코드 테이블에 모으는 것이 목적은 아니다. 값이 비즈니스 동작을 제어하는지, 운영 중 바뀌어야 하는 표시 메타데이터인지부터 구분한다.

## 먼저 값의 성격을 나눈다

| 성격 | 예 | 기본 선택 |
|---|---|---|
| 닫힌 행동 집합 | 결제 상태, 명령 유형 | 애플리케이션 enum 또는 union과 DB `CHECK` |
| 운영 메타데이터 | 문의 유형 이름, 정렬 순서, 활성 기간 | lookup table과 관리 기능 |
| 사용자 정의 값 | 판매자가 만드는 상품 속성 | 도메인 테이블, JSON 또는 제한적인 EAV |
| 번역 가능한 표시 문자열 | 상태별 한국어, 영어 이름 | i18n 리소스 또는 locale별 자식 테이블 |
| 기능 출시 제어 | feature flag, 실험 변형 | 전용 설정 또는 flag 시스템 |

표시 이름이 바뀐다는 이유로 안정적인 코드까지 바꾸지 않는다. `PAID` 같은 식별자는 계약으로 유지하고, `결제 완료` 같은 표현만 별도로 관리한다.

## lookup table 설계

그룹과 상세 코드를 분리하면 서로 다른 집합에서 같은 코드 값을 사용할 수 있다.

```sql
CREATE TABLE code_item (
  code_group VARCHAR(50) NOT NULL,
  code       VARCHAR(50) NOT NULL,
  label      VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATETIME NULL,
  valid_to   DATETIME NULL,
  PRIMARY KEY (code_group, code)
);
```

- `(code_group, code)`는 그룹 안의 유일성을 보장한다. 별도 대리 키를 써도 이 조합의 `UNIQUE`는 남긴다.
- 코드는 로그, API와 저장 데이터에 남으므로 짧고 안정적으로 정한다. 이름이나 설명을 코드에 넣지 않는다.
- 범용 `attr1`, `attr2` 컬럼은 의미, 타입과 제약을 숨긴다. 반복적으로 쓰이는 속성은 이름 있는 컬럼이나 별도 도메인 테이블로 승격한다.
- `enabled`는 신규 선택 가능 여부다. 기존 주문의 상태 의미까지 삭제하지 않는다. 유효 기간이 필요하면 시간 경계와 중복 허용 규칙을 명시한다.
- 모든 그룹을 한 테이블에 합치면 한 그룹에만 필요한 제약과 관계를 표현하기 어렵다. 독립된 생명주기나 비즈니스 규칙이 생기면 전용 테이블로 분리한다.

## enum, 테이블, 하이브리드

### 애플리케이션 타입이 원본인 경우

값이 분기 로직과 상태 전이에 직접 참여하면 enum 또는 문자열 union이 안전하다. TypeScript에서는 외부 입력을 런타임 스키마로 검증하고, DB에는 `CHECK`, 전용 참조 테이블 또는 애플리케이션 검증 중 필요한 방어선을 둔다.

```ts
export const ORDER_STATUS = ["RECEIVED", "PAID", "CANCELED"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];
```

배포 없이 새 값을 추가해야 한다면 이 방식만으로는 부족하다. 반대로 새 DB 행 하나가 처리 코드까지 자동으로 만들어 주지는 않으므로, 행동을 동적으로 확장할 수 있다고 착각하면 안 된다.

### DB가 원본인 경우

운영자가 이름, 정렬, 노출 여부를 바꿔야 하고 애플리케이션 분기가 없는 목록은 lookup table이 자연스럽다. 서버는 코드 목록 API를 제공하고 클라이언트는 응답을 런타임 검증한다.

### 하이브리드인 경우

코드 집합과 행동은 애플리케이션 타입이, 이름과 정렬은 DB가 담당할 수 있다. 중복 원본을 만든 대가로 다음 검증이 필요하다.

- 시작 시 또는 CI에서 enum 값과 DB seed의 차이를 검출한다.
- 추가, 폐기, 이름 변경의 담당자와 배포 순서를 정한다.
- 알 수 없는 값을 받은 구버전 클라이언트의 fallback을 정의한다.
- 생성 코드를 사용한다면 생성 명령, 변경 diff와 호환성 검사를 CI에 포함한다.

## 조회와 캐시

이름을 얻으려고 모든 비즈니스 쿼리에 공통 코드 조인을 퍼뜨릴 필요는 없다. 데이터량과 변경 빈도가 작으면 서버가 목록을 한 번 읽어 map으로 보관할 수 있다. 다만 로컬 캐시는 각 인스턴스가 서로 다른 값을 볼 수 있다.

- TTL은 허용 가능한 stale 시간이지 정합성 보장이 아니다.
- 즉시 반영이 필요하면 version, invalidation event 또는 중앙 캐시를 검토한다.
- cache miss 때 요청마다 DB를 읽는 구조는 stampede와 N+1을 만들 수 있다.
- API 응답과 감사 기록에는 시점의 label snapshot이 필요한지 판단한다.

## 외래 키는 비용과 보장을 함께 본다

공통 코드가 복합 키라는 이유만으로 외래 키를 일괄 생략하지 않는다. FK는 존재하지 않는 코드를 막고 변경 순서를 드러내지만, 참조 컬럼과 쓰기 검증 비용이 생긴다. 선택지는 다음과 같다.

1. `(code_group, code)`를 함께 저장하고 복합 FK로 엄격히 보장한다.
2. 상세 코드에 대리 키를 두되 `(code_group, code)`도 `UNIQUE`로 유지한다.
3. FK를 생략하고 애플리케이션 검증, 배치 점검과 배포 규칙으로 보완한다.

세 번째 선택은 무결성 보장을 없애는 결정이다. 성능 우려가 있다면 먼저 쓰기 부하와 락 영향을 측정하고, 불일치 탐지와 복구 절차까지 설계한다.

## 결정 체크리스트

1. 이 값은 화면 표시인가, 비즈니스 분기와 상태 전이인가?
2. 추가와 변경은 코드 배포로 해야 하는가, 운영 중 허용해야 하는가?
3. 안정적인 식별자와 변경 가능한 label을 분리했는가?
4. DB, 서버, 클라이언트 중 원본은 하나인가?
5. 캐시가 낡았을 때 허용되는 동작과 갱신 방식은 무엇인가?
6. FK를 생략했다면 불일치를 누가 언제 탐지하고 복구하는가?

## 출처

- [MySQL 8.4, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [TypeScript, Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [쏘카, 백오피스 팀 내 공통 코드 관리 변천사](https://tech.socarcorp.kr/dev/2021/08/17/common-code-management.html)
- [인프런, 공통 코드가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401941)
- [인프런, 공통 코드 테이블 설계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401942)
- [인프런, 그룹화 설계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401943)
- [인프런, 공통 코드와 추가 속성](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401944)
- [인프런, 공통 코드의 단점](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401945)
- [인프런, 단점 해결 방안 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401946)
- [인프런, 단점 해결 방안 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401947)
- [인프런, 공통 코드 vs 애플리케이션 ENUM 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401948)
- [인프런, 공통 코드 vs 애플리케이션 ENUM 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401949)
- [인프런, 공통 코드 vs 애플리케이션 ENUM 3](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401950)
- [인프런, 공통 코드 설계와 비즈니스 설계의 차이](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401951)
- [인프런, 공통 코드 설계 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401952)

## 관련 문서

- [[Schema-Design|스키마 설계]]
- [[Flexible-Attribute-Modeling|가변 속성 모델링]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[TS-Enum-Antipattern|TypeScript Enum 안티패턴]]
