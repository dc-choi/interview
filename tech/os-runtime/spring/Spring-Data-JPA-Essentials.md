---
tags: [jpa, hibernate, spring-data-jpa, id-generation, ddl-auto]
status: done
category: "OS & Runtime"
aliases: ["Spring Data JPA", "JPA vs Hibernate", "ID Generation", "ddl-auto"]
---

# Spring Data JPA Essentials — 계층 관계·ID 생성·ddl-auto·isNew

JPA 면접의 빈출 영역 중 **용어·설정·엔티티 생명주기** 쪽을 한 곳에 정리. 영속성 컨텍스트·N+1·OSIV 같은 핵심 동작은 [[JPA-Persistence-Context]] 참고.

## JPA · Hibernate · Spring Data JPA 관계

세 이름이 자주 혼용되지만 **계층이 다르다**.

| 층 | 이름 | 성격 |
|---|---|---|
| 최상위 | **JPA** (Java Persistence API / Jakarta Persistence) | **명세(인터페이스)**. `EntityManager`·`Query`·애노테이션 정의만 |
| 중간 | **Hibernate** | JPA **구현체** (기본). JPA 외에 Hibernate 전용 기능도 포함 |
| 최상위 (편의) | **Spring Data JPA** | **JPA + Hibernate를 감싼 추상화**. Repository 인터페이스 자동 구현 |

### 의존 방향

```
Application → Spring Data JPA → JPA (명세) ← Hibernate (구현)
```

- Hibernate 없이 EclipseLink·OpenJPA 등 다른 JPA 구현을 쓸 수 있음
- Spring Data JPA 없이 `EntityManager`를 직접 주입해도 됨 (JPA만 쓰기)
- 실무 표준 조합: **Spring Data JPA + Hibernate**

## JPA를 쓰는 이유

### 반복 SQL 제거
엔티티 그래프 CRUD를 애노테이션과 객체 그래프로 처리. `OrderRepository.save(order)` 한 줄이면 Order·OrderItem 여러 row를 저장.

### 객체지향 모델링
DB 스키마 구조가 코드에 번지지 않고, **도메인 객체 중심 설계** 가능. 참조·값 객체·상속을 SQL 없이 표현.

### 벤더 독립성
방언(dialect) 설정 하나로 MySQL·PostgreSQL·Oracle 간 전환. 네이티브 쿼리 최소화하면 이식성 높음.

### 영속성 컨텍스트가 주는 이점
1차 캐시·Dirty Checking·쓰기 지연·Lazy Loading — 성능과 코드 단순성 동시 확보 (→ [[JPA-Persistence-Context]]).

### 한계
- **복잡 쿼리**는 JPQL·QueryDSL로도 벅찬 경우 발생 → 네이티브 SQL 허용
- N+1·OSIV·영속성 컨텍스트 동작을 **이해하지 못하면** 오히려 성능 악화
- Aggregate 경계가 넓으면 Dirty Checking이 의도치 않은 UPDATE 발생

## Entity Manager

JPA의 핵심 객체. **영속성 컨텍스트를 관리**하고 엔티티 CRUD·쿼리 실행을 담당.

| 메서드 | 역할 |
|---|---|
| `persist(entity)` | 신규 엔티티를 영속 상태로 |
| `find(Class, id)` | ID로 조회, 1차 캐시 활용 |
| `merge(entity)` | 준영속→영속 전환 (주의: 새 엔티티 반환) |
| `remove(entity)` | 삭제 예약 |
| `flush()` | 변경을 DB로 즉시 전송 |
| `clear()` | 영속성 컨텍스트 초기화 |

Spring 환경에서는 `@PersistenceContext`로 주입받거나, Spring Data JPA가 내부적으로 사용.

## `ddl-auto` 옵션

엔티티 매핑을 DB 스키마에 자동으로 반영하는 옵션.

| 값 | 동작 | 적합 환경 |
|---|---|---|
| **`none`** | 아무것도 안 함 | **프로덕션 기본** |
| **`validate`** | 엔티티 ↔ 스키마 **불일치만 체크**, 변경 X | 프로덕션 권장 |
| **`update`** | 엔티티 기준으로 스키마 **추가/변경** (삭제는 X) | 개발 초기·변경 잦을 때 (주의) |
| **`create`** | 기존 스키마 **삭제 후 생성** | 초기 실험·빠른 리셋 |
| **`create-drop`** | create + 앱 종료 시 drop | **테스트 전용** |

### 프로덕션 원칙
**`validate` 또는 `none`** 외는 금지. 스키마 변경은 **Flyway·Liquibase** 같은 마이그레이션 도구로 버전 관리하고 점검된 SQL로 적용. `update`는 운영 중 인덱스·컬럼 제거 누락을 만들어 조용한 일관성 붕괴를 일으킴.

## ID 생성 전략

`@GeneratedValue(strategy = ...)` 값 4종.

| 전략 | DB | 특징 |
|---|---|---|
| **IDENTITY** | MySQL·PostgreSQL·MSSQL auto_increment | DB가 INSERT 시점에 ID 발급. **쓰기 지연 불가** — `persist()` 즉시 INSERT |
| **SEQUENCE** | PostgreSQL·Oracle 시퀀스 | `persist()` 시 시퀀스에서 미리 ID 받고, 쓰기 지연 가능 |
| **TABLE** | 시퀀스 테이블 시뮬레이션 | 모든 DB 호환. 성능 낮음 (SELECT + UPDATE) |
| **AUTO** | DB dialect 기반 자동 선택 | 기본값 |

### IDENTITY와 배치 INSERT
IDENTITY는 **JPA 쓰기 지연·배치 INSERT와 충돌**한다. persist 시점에 DB에 INSERT해야 ID가 나오므로, 여러 엔티티를 모아 한 번에 INSERT할 수 없음. 대량 쓰기에서는 SEQUENCE가 유리.

### 수동 ID 할당 + `Persistable` 구현
`@Id`만 붙이고 `@GeneratedValue` 없이 직접 ID를 주는 경우, Spring Data JPA의 `save()`가 **매번 merge로 동작**해 불필요한 SELECT가 발생한다 (→ 다음 섹션).

## Spring Data JPA가 "새 엔티티"를 판단하는 방법

`SimpleJpaRepository.save()` 는 `isNew()` 판단에 따라 분기.

```java
save(entity) {
    if (isNew(entity)) em.persist(entity);
    else return em.merge(entity);
}
```

### `isNew()` 기본 판단 순서

1. **`@Version` 필드가 있고 Wrapper 타입**: 값이 `null`이면 신규
2. **`@Id` 필드가 non-primitive**: 값이 `null`이면 신규
3. **`@Id` 필드가 Number**: 값이 `0`이면 신규

### 수동 ID 할당 시 문제

DB 시퀀스가 아닌 **UUID·도메인 식별자**를 직접 만들어 `@Id`에 세팅하면:
- 저장 시점에 이미 ID가 null이 아님
- `isNew()` → false → `merge()` 호출 → **불필요한 SELECT 1회**
- 실제로는 신규 엔티티인데 UPDATE 쿼리 발생할 수 있음

### 해결: `Persistable<T>` 구현

```java
public class Order implements Persistable<String> {
    @Id
    private String id;

    @Transient
    private boolean isNew = true;

    @Override public String getId() { return id; }
    @Override public boolean isNew() { return isNew; }

    @PostPersist @PostLoad
    void markNotNew() { this.isNew = false; }
}
```

- `isNew()`를 직접 구현해 Spring Data JPA가 이 값을 신뢰
- `@PostPersist`·`@PostLoad`로 영속화 후 false 전환
- 불필요한 SELECT 제거

## 흔한 실수

- **`ddl-auto: update`로 프로덕션 운영** — 컬럼·인덱스 누락·예상치 못한 스키마 drift
- **IDENTITY로 대량 INSERT 시도** — persist마다 DB 왕복, 성능 최악
- **수동 ID 할당 + Persistable 미구현** — save마다 SELECT 발생
- **Spring Data JPA와 JPA 혼용 이해 부족** — Repository 메서드명 규칙이 내부적으로 JPQL 생성함을 모름
- **Hibernate 전용 기능 남발** — 나중에 다른 구현체로 못 바꾸는 종속성

## 면접 체크포인트

- **JPA vs Hibernate vs Spring Data JPA** 계층을 명확히 설명
- `ddl-auto`의 5가지 값과 **프로덕션에서 `validate`/`none` 외 금지** 이유
- **IDENTITY 전략이 쓰기 지연·배치 INSERT와 충돌**하는 이유
- Spring Data JPA의 **`isNew()` 판단 순서**와 수동 ID 할당 시 `Persistable` 구현 필요성
- JPA의 장점을 **영속성 컨텍스트 관점**에서 설명
- Hibernate 전용 기능 사용 시 **벤더 독립성 상실** 주의

## 출처
- [매일메일 — JPA OSIV](https://www.maeil-mail.kr/question/1)
- [매일메일 — JPA 사용 이유](https://www.maeil-mail.kr/question/25)
- [매일메일 — JPA/Hibernate/Spring Data JPA](https://www.maeil-mail.kr/question/26)
- [매일메일 — Spring Data JPA의 새 엔티티 판단](https://www.maeil-mail.kr/question/27)
- [매일메일 — ddl-auto](https://www.maeil-mail.kr/question/28)
- [매일메일 — 엔티티 매니저](https://www.maeil-mail.kr/question/29)
- [매일메일 — N+1](https://www.maeil-mail.kr/question/49)
- [매일메일 — JPA ID Generation](https://www.maeil-mail.kr/question/69)

## 관련 문서
- [[JPA-Persistence-Context|영속성 컨텍스트·N+1·OSIV]]
- [[Spring-Transactional|@Transactional]]
- [[Schema-Migration-Large-Table|스키마 마이그레이션]]
- [[Primary-Key-Strategy|PK 전략]]
