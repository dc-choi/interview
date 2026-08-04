---
tags: [database, rdbms, mysql, foreign-key, referential-integrity]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["외래 키 설계", "Foreign Key Integrity", "참조 무결성"]
---

# 외래 키와 참조 무결성

외래 키는 child의 참조 값이 parent의 candidate key에 존재하도록 강제한다. 여러 쓰기 경로가 같은 DB를 사용할 때 애플리케이션을 우회한 고아 행도 막을 수 있지만, 업무 의미 전체나 올바른 JOIN 조건까지 보장하지는 않는다.

## 무엇을 보장하고 무엇을 보장하지 않는가

외래 키가 보장하는 것은 구조적 참조다.

- 존재하지 않는 parent key를 child에 삽입하거나 갱신하는 작업을 거부한다.
- parent key 삭제와 갱신 시 선언한 referential action을 적용한다.
- InnoDB는 deferred FK를 제공하지 않으므로 관련 DML을 검사하는 시점마다 제약을 강제한다.

다음은 별도 설계가 필요하다.

- `order.customer_id = payment.customer_id`처럼 문법상 가능하지만 업무상 틀린 JOIN
- 같은 조직의 자원만 연결해야 한다는 tenant 경계
- 시작일이 종료일보다 앞서야 한다는 행 내부 규칙
- 주문 상태 전이, 잔액 보존 같은 여러 행의 비즈니스 불변식

FK가 있다는 이유로 JOIN의 컬럼과 결과 grain 검증을 생략하면 안 된다.

## MySQL InnoDB 정의 조건

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) ENGINE = InnoDB;
```

- parent와 child는 같은 storage engine을 사용해야 한다.
- 정수와 고정 소수점 참조 컬럼은 크기와 sign이 같아야 한다. 문자형은 charset과 collation이 같아야 한다.
- child FK 컬럼은 같은 순서의 인덱스 선두 컬럼이어야 한다. 없으면 MySQL이 사용할 수 있는 인덱스를 자동 생성한다.
- referenced key는 PK 또는 UNIQUE candidate key로 설계한다. InnoDB의 non-unique key 참조 확장은 MySQL 8.4에서 deprecated이고 별도 설정이 필요하다.
- InnoDB user-partitioned table은 parent와 child 모두 FK를 지원하지 않는다.

자동 생성된 child 인덱스가 실제 조회의 복합 조건까지 만족한다는 뜻은 아니다. 예를 들어 `WHERE customer_id = ? AND created_at >= ?`가 핵심이면 `(customer_id, created_at)`을 별도로 검토한다.

## Referential action 선택

| action | parent 변경 시 의미 | 적합한 예 | 주의점 |
|---|---|---|---|
| `RESTRICT` 또는 InnoDB `NO ACTION` | 관련 child가 있으면 즉시 거부 | 보존해야 하는 주문의 고객 삭제 | 삭제 절차를 명시적으로 만들 필요 |
| `CASCADE` | child key를 갱신하거나 child를 삭제 | 부모 없이 의미 없는 내부 구성 요소 | 예상보다 큰 lock과 삭제 파급 범위 |
| `SET NULL` | 참조를 끊고 child를 남김 | 담당자 해제처럼 독립 생존 가능 | child 컬럼이 nullable이어야 함 |

InnoDB의 `NO ACTION`은 deferred constraint가 아니라 `RESTRICT`와 같은 즉시 검사다. cascade는 편리하지만 데이터 보존 요구, 감사 로그와 최대 fan-out을 먼저 확인한다.

## FK를 애플리케이션에서만 관리한다면

샤딩으로 parent와 child가 다른 노드에 있거나, 대규모 적재와 스키마 전환에서 제약 비용을 통제해야 하는 경우 DB FK를 사용하지 않을 수 있다. 이 선택은 무결성이 필요 없다는 뜻이 아니라 보장 주체를 옮기는 것이다.

최소한 다음 보완 장치를 둔다.

- 모든 쓰기 경로가 공유하는 service boundary와 transaction 규칙
- child 참조 컬럼의 조회 인덱스
- 고아 행을 주기적으로 탐지하는 reconciliation query와 지표
- parent 삭제 전 참조 검사, tombstone 또는 outbox 기반 정리 절차
- backfill과 장애 재시도가 멱등한지 확인하는 UNIQUE 제약
- 데이터 이관 전후 고아 행 수 검증

단일 DB 안에서 여러 서비스, 배치와 운영 SQL이 직접 쓰는 구조라면 FK가 제공하는 공통 방어선의 가치가 커진다. 반대로 분산 경계를 넘는 관계에는 DB FK를 걸 수 없으므로 보상 통제가 필수다.

## 운영 주의점

- 큰 cascade는 하나의 작은 DML처럼 보여도 많은 child row를 잠그고 변경할 수 있다. 영향 행 수와 실행 시간을 사전 측정한다.
- FK 관련 DDL은 연결된 테이블까지 metadata lock에 영향을 줄 수 있다.
- `foreign_key_checks = 0`은 제한된 import 절차에서만 사용한다. 다시 켜도 비활성 기간에 들어온 기존 행을 자동으로 재검사하지 않으므로 별도 검증이 필요하다.
- multi-table UPDATE 또는 DELETE의 optimizer 순서가 parent-child 순서와 충돌할 수 있다. 가능한 한 한 테이블을 바꾸고 선언한 cascade를 사용한다.
- 제약 이름, 삭제 정책과 소유 팀을 schema migration에 명시한다.

## 출처

- [MySQL 8.4 Reference Manual, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [인프런, Hong, 참조 무결성과 외래 키](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367636)
- [인프런, Hong, 외래 키 동작](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367637)
- [인프런, Hong, 외래 키가 막지 못하는 잘못된 JOIN](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367639)
- [인프런, Hong, 외래 키의 운영 트레이드오프](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367638)

## 관련 문서

- [[Normalization|정규화]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
- [[SQL-Joins|SQL 조인]]
- [[MySQL-Partitioning|MySQL 파티셔닝]]
