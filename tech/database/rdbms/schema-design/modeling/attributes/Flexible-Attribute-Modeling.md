---
tags: [database, rdbms, schema, eav, json, mysql]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["가변 속성 모델링", "EAV 패턴", "Flexible Attributes"]
---

# 가변 속성 모델링

속성이 계속 늘어난다는 이유만으로 wide table, 보조 테이블, EAV, JSON 중 하나를 일괄 적용하면 다른 비용이 커진다. 속성의 안정성, 희소성, 타입, 검색 방식과 변경 주체를 기준으로 저장 모델을 나눈다.

## 선택지 비교

| 모델 | 적합한 경우 | 강점 | 주요 비용 |
|---|---|---|---|
| 일반 컬럼 | 핵심 속성, 타입과 제약이 안정적 | 강한 타입, 단순한 쿼리와 인덱스 | 스키마 변경 필요 |
| 보조 테이블 | 특정 하위 유형이나 기능에만 속성 묶음이 존재 | 핵심 행을 좁게 유지, 관계와 제약 표현 가능 | 조인, 1:1 생명주기 관리 |
| EAV | 사용자가 필드를 정의하고 대부분 비어 있음 | 런타임 속성 추가 | 타입, 제약, 집계, 인덱스와 쿼리 복잡도 |
| JSON hybrid | 구조가 가변이지만 한 aggregate 안에서 함께 읽고 씀 | 문서 단위 저장, 경로 연산 | 필드별 무결성과 범용 검색이 어려움 |

가장 자주 필터링, 정렬, 조인하거나 도메인 불변식에 참여하는 속성은 일반 컬럼을 우선한다. 가변성은 변경 가능성이 실제로 높은 경계에만 둔다.

## 보조 테이블은 희소한 속성 묶음에 쓴다

모든 상품에 공통인 `name`, `price`는 본 테이블에 두고, 배송 상품에만 필요한 크기와 무게는 `shipping_profile`처럼 1:0..1 보조 테이블로 분리할 수 있다.

- 하위 기능의 속성이 함께 생성, 변경, 삭제되는지 확인한다.
- 보조 테이블 PK를 부모 FK와 같게 두면 1:1을 강제할 수 있다.
- 자주 함께 읽는 값까지 과도하게 나누면 조인과 쓰기 단계만 늘어난다.
- 컬럼 수 자체보다 row 폭, NULL 비율, 접근 패턴과 마이그레이션 비용을 측정한다.

## EAV를 선택할 때 감수할 것

EAV는 보통 `entity_id`, `attribute_id`, `value` 행으로 속성을 표현한다. 속성 추가가 DDL 없이 가능하지만, 단일 값 컬럼에 여러 타입을 넣으면 다음 문제가 생긴다.

- 숫자 범위, 날짜, 참조 무결성을 일반 제약으로 표현하기 어렵다.
- 한 entity를 읽을 때 여러 행을 모아 pivot해야 한다.
- 속성별 필터와 정렬에 범용 인덱스 하나로 대응하기 어렵다.
- 필수 속성, 속성 간 조건과 중복 규칙을 별도 메타데이터와 검증 코드가 맡는다.
- 통계가 섞여 옵티마이저의 카디널리티 추정이 어려워질 수 있다.

EAV가 필요하면 attribute definition에 타입, 단위, 필수 여부와 validation rule을 두고, 타입별 value 컬럼 또는 별도 테이블을 고려한다. `(entity_id, attribute_id)` UNIQUE와 주요 조회 방향의 보조 인덱스를 명시한다.

## JSON hybrid

핵심 속성은 정규 컬럼에, 드물고 가변적인 확장 속성은 JSON에 둔다. MySQL JSON은 저장 시 문서를 검증하고 binary 내부 형식으로 경로 접근을 지원하지만 JSON 컬럼 전체를 일반 인덱스처럼 직접 인덱싱하지는 않는다.

```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  attributes JSON NOT NULL,
  INDEX idx_brand ((CAST(attributes->>'$.brand' AS CHAR(80))))
);
```

자주 검색하는 scalar path는 generated column 또는 functional index로 승격한다. query의 표현식, 반환 타입과 collation이 인덱스 표현식과 호환되는지 실행 계획으로 확인한다. JSON array 검색은 multi-valued index 후보지만 지원 연산과 제약을 대상 버전 문서로 검토한다.

다음 신호가 보이면 JSON key를 일반 컬럼이나 관계 테이블로 옮긴다.

- 거의 모든 쿼리에서 같은 key를 필터링하거나 정렬한다.
- key가 FK, UNIQUE, 금액 범위 같은 강한 제약에 참여한다.
- 부분 갱신 경합, 문서 크기 또는 JSON 인덱스 유지 비용이 병목이다.
- 여러 aggregate가 같은 하위 객체를 참조한다.

## DDL 비용을 과장하지 않는다

컬럼 추가가 항상 전체 테이블 복사와 서비스 중단을 뜻하지는 않는다. MySQL 8.4 InnoDB는 조건을 만족하는 컬럼 추가와 삭제에 `ALGORITHM=INSTANT`를 사용할 수 있다. 반대로 row format, FULLTEXT, 행 크기, instant row version 한도, 다른 ALTER 동작과의 조합에 따라 사용할 수 없고, DDL 시작과 종료에는 metadata lock 영향도 남는다.

모델을 왜곡해 DDL을 영구히 피하기보다 대상 버전과 변경 종류를 확인하고 `ALGORITHM=INSTANT` 또는 필요한 `LOCK` 수준을 명시해 예상보다 무거운 fallback을 막는다.

## 결정 질문

1. 이 속성은 핵심 도메인 규칙인가, 사용자 정의 메타데이터인가?
2. NULL이 많은가, 특정 하위 유형이 함께 소유하는가?
3. 타입, FK, UNIQUE, 범위를 DB가 강제해야 하는가?
4. 어떤 key를 조건, 정렬, 집계에 사용하는가?
5. 속성 변경은 배포 주기인가, 런타임 사용자 동작인가?
6. 현재 모델에서 일반 컬럼으로 승격하고 되돌리는 경로가 있는가?

## 출처

- [MySQL 8.4 Reference Manual, JSON Data Type](https://dev.mysql.com/doc/refman/8.4/en/json.html)
- [MySQL 8.4 Reference Manual, Functional Key Parts](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts)
- [MySQL 8.4 Reference Manual, Online DDL Operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
- [인프런, EAV 설계의 배경](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402010)
- [인프런, EAV 패턴 소개](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402011)
- [인프런, 쇼핑몰 상품 속성 EAV 실습](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402012)
- [인프런, 속성 정의 테이블](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402013)
- [인프런, EAV 장단점과 주의사항](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402014)
- [인프런, EAV 실무 활용 사례](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402015)
- [인프런, EAV 설계 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=402016)
- [인프런, Hong, boolean 컬럼 확장 문제](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367644)
- [인프런, Hong, 단일 테이블 속성 모델](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367647)
- [인프런, Hong, 보조 테이블 속성 모델](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367648)
- [인프런, Hong, EAV 모델](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367649)
- [인프런, Hong, Online DDL](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367645)
- [인프런, Hong, JSON 속성 모델](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367646)

## 관련 문서

- [[JSON-vs-Text-Column|JSON vs TEXT 컬럼]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
- [[Normalization|정규화]]
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]
