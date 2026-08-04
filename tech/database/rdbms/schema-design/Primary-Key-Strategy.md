---
tags: [database, rdbms, primary-key, natural-key, surrogate-key, uuid]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["PK Strategy", "Primary Key Strategy", "PK 생성 전략"]
---

# Primary Key 전략

Primary key는 row의 장기 identity다. 생성 편의만 보지 않고 **불변성, key 폭, 관계 참조, 생성 위치, 병합 가능성, 외부 노출과 DB storage 구조**를 함께 판단한다.

## Key 용어

- Superkey: row를 유일하게 식별하는 attribute 집합이다.
- Candidate key: 불필요한 attribute를 뺄 수 없는 최소 superkey다.
- Primary key: candidate key 중 table의 대표 identity로 선택한 key다.
- Alternate key: 선택되지 않은 candidate key이며 보통 `UNIQUE`로 보존한다.
- Natural key: 업무 의미에서 나온 key다.
- Surrogate key: 업무 의미와 분리해 시스템이 만든 identity다.

PK를 surrogate로 바꿨다고 email, 사업자 번호나 `(order_id, product_id)`의 중복 규칙이 사라지는 것은 아니다. 자연 key의 업무 유일성은 별도 `UNIQUE`로 남긴다.

## Natural key와 surrogate key

### Natural key가 맞을 수 있는 경우

- ISO 국가 코드처럼 변경 주체와 변경 가능성이 명확히 제한된다.
- key가 짧고 모든 참조자가 같은 의미를 공유한다.
- parent 범위 안의 line number처럼 composite identity가 domain 의미 자체다.

이름, email, 전화번호와 외부 공급자 ID는 보통 변경/재사용/병합 가능성이 있어 PK로 위험하다. 그래도 surrogate PK만 추가하고 natural `UNIQUE`를 빼면 중복 row를 허용하게 된다.

### Surrogate key가 좋은 기본값인 경우

- business identifier가 바뀌거나 여러 개 존재한다.
- row를 다른 parent로 이동하거나 관계 규칙이 변할 수 있다.
- 여러 외부 system의 identifier를 한 entity에 연결한다.
- ORM/API에서 짧고 안정적인 단일 identity가 필요하다.

Surrogate key가 변경 비용을 줄이는 좋은 기본값인 것은 맞지만 모든 table의 유일한 현대적 정답은 아니다. 참조되지 않는 작은 lookup, 순수 junction과 aggregate 내부 row는 natural/composite PK가 더 단순할 수 있다.

## Composite key

Composite PK는 여러 column 전체로 identity를 표현한다.

```sql
CREATE TABLE enrollment (
  student_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  enrolled_at DATETIME NOT NULL,
  PRIMARY KEY (student_id, course_id)
);
```

관계가 두 key 조합으로 완전히 식별되고 다른 table이 이 row를 거의 참조하지 않으면 명확하다. 반대로 PK가 여러 단계로 전파되거나 구성 column이 바뀌면 모든 FK/index/API가 함께 복잡해진다. 이 경우 `id` surrogate PK를 추가하고 `(student_id, course_id)`는 `UNIQUE`로 유지할 수 있다.

## 생성 전략 비교

| 전략 | 크기/정렬 | 강점 | 비용/주의 |
|---|---|---|---|
| Auto increment `BIGINT` | 8 byte, 대체로 증가 | 단순, compact, InnoDB locality | DB 의존, merge/shard 조정, 값 유추 가능 |
| UUIDv4 | 16 byte, random | 분산 생성, 불투명 ID | random insert locality, 넓은 secondary index |
| UUIDv7 | 16 byte, 시간 순서 성질 | 분산 생성과 locality 절충 | 생성 시각 노출, 같은 ms 내 monotonicity는 구현 확인 |
| ULID | 128 bit, Base32 표현 | 정렬 가능한 문자열 표현 | UUID 표준과 다름, monotonic generator/encoding 확인 |
| Snowflake 계열 | 보통 64 bit, 시간 기반 | compact 분산 생성 | node ID, clock rollback, epoch/bit 배분 운영 |

### Auto increment

단일 write DB에서는 운영이 가장 단순한 후보다. sequence에는 rollback/삭제로 gap이 생길 수 있으므로 연속 업무 번호로 사용하지 않는다. 여러 shard 값을 합칠 가능성이 있으면 shard별 범위/offset, central allocator 또는 다른 ID를 비교한다.

### UUIDv4와 UUIDv7

UUID는 `CHAR(36)`보다 native UUID type 또는 `BINARY(16)` 저장을 우선 검토한다. MySQL InnoDB에서는 PK가 모든 secondary index record에 포함되므로 넓은 PK가 table 전체 index 비용을 키운다.

RFC 9562의 UUIDv7은 앞 48 bit에 Unix epoch millisecond timestamp를 두고 version/variant를 제외한 나머지 74 bit를 random 또는 monotonicity 보강에 사용한다. 시간 순서 성질은 random UUID보다 insert locality를 개선할 수 있지만, generator 구현과 실제 workload를 benchmark해야 한다.

RFC 9562는 UUIDv6과 UUIDv7을 표준화했다. v6는 v1의 timestamp field를 database locality에 맞게 재배치한 형식이므로 v1 호환 요구가 없는 새 시스템에서는 v7과 함께 요구사항을 비교한다.

MySQL 8.4의 `UUID()`는 UUIDv1 값을 만든다. `UUID_TO_BIN(uuid, 1)`의 swap flag는 v1의 time-low와 time-high 부분을 바꿔 binary key의 locality를 개선하기 위한 옵션이다. 임의의 v4나 v7을 정렬해 주는 범용 옵션이 아니므로 다른 UUID version에 기계적으로 적용하지 않는다. v7은 generator의 canonical byte layout을 확인한 뒤 v1 swap 없이 저장한다.

### 내부 PK와 public ID 분리

내부 PK는 compact auto increment, 외부 API에는 별도 UUID/public key를 노출할 수 있다. index와 mapping 비용이 늘지만 storage identity와 public contract를 독립적으로 바꿀 수 있다.

불투명 ID는 object enumeration을 어렵게 할 뿐 authorization이 아니다. 모든 요청에서 tenant/owner/role을 검사해야 하며 순차 PK 노출 자체를 IDOR 취약점과 동일시하지 않는다.

## InnoDB 관점

InnoDB는 PK를 clustered index로 사용하고 secondary index record에 PK column을 포함한다.

- 짧은 PK는 secondary index 공간과 cache 효율에 유리하다.
- 증가 key는 random key보다 leaf page locality가 좋은 경향이 있지만 동시 insert hot spot도 측정한다.
- random PK는 page split과 낮은 fill locality를 만들 수 있으나 성능 배수는 row 크기, memory와 write pattern에 따라 달라진다.
- PK가 없으면 InnoDB가 적합한 non-null unique index 또는 hidden clustered key를 선택하므로 명시적으로 설계한다.

PK 선택만으로 query 성능을 결론 내리지 않는다. 대표 secondary index, join, insert concurrency와 storage 크기를 실제 data로 비교한다.

## TypeORM 적용

- `@PrimaryGeneratedColumn("increment", { type: "bigint" })` 값은 JavaScript safe integer 범위를 넘을 수 있으므로 string mapping/serialization을 정한다.
- UUID 생성 위치를 DB/application 중 하나로 일관되게 정하고 migration default와 test fixture를 맞춘다.
- `@PrimaryColumn` 여러 개로 composite PK를 만들 수 있지만 relation FK와 repository API의 복잡도를 확인한다.
- public ID에는 별도 `@Column({ unique: true })`을 두고 authorization query에 owner/tenant 조건을 함께 넣는다.

## 결정 체크리스트

1. 이 row를 5년 뒤에도 같은 것으로 식별하는 기준은 무엇인가?
2. natural key가 변경, 재사용, 병합될 수 있는가?
3. composite identity가 domain 의미인가, 우연한 현재 규칙인가?
4. key가 몇 개의 secondary index/FK에 복제되는가?
5. ID를 어느 node에서 만들며 offline merge/shard가 필요한가?
6. public contract와 storage PK를 분리할 이유가 있는가?

## 출처

- [RFC 9562, Universally Unique IDentifiers](https://www.rfc-editor.org/rfc/rfc9562.html)
- [MySQL 8.4, Clustered and Secondary Indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
- [MySQL 8.4, Primary Key Optimization](https://dev.mysql.com/doc/refman/8.4/en/primary-key-optimization.html)
- [MySQL 8.4, Miscellaneous Functions, UUID and UUID_TO_BIN](https://dev.mysql.com/doc/refman/8.4/en/miscellaneous-functions.html)
- Key 종류/자연 key: [Key 종류](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347625), [자연 key](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347626)
- Surrogate key: [개념](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347627), [성능 tradeoff](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347628), [현대 설계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347629)
- Composite key: [설계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347630), [M:N 관계](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347631), [정리](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347632)
- [인프런, Real MySQL 시즌 1 - Part 2, UUID 사용 주의사항](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226707)

## 관련 문서

- [[Data-Modeling-Workflow|데이터 모델링 절차]]
- [[Relational-Relationship-Modeling|관계형 관계 모델링]]
- [[Index|Index와 clustered key]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Schema-Design|Schema design]]
