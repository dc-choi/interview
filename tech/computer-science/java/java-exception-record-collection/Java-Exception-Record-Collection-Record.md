---
tags: [java, exception, record, first-class-collection, data-class]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Record", "Record vs DTO vs VO"]
---

# Java Record

**Java 16+의 불변 데이터 타입**. 선언 한 줄로 final 필드, 생성자, `equals`, `hashCode`, `toString`, 접근자를 자동 생성.

```java
record UserDto(Long id, String name, String email) {}
```

## 자동 생성되는 것

- **`private final` 필드**로 각 컴포넌트
- Canonical constructor (모든 필드를 받는 생성자)
- Accessor: `id()`, `name()`, `email()` (getter 규약 없음, 컴포넌트명 그대로)
- `equals`, `hashCode`, `toString`: 값 비교, 문자열 표현

## 제약

- **상속 불가** — `final` 클래스로 만들어짐. interface는 구현 가능
- **인스턴스 필드 추가 불가** — 선언된 컴포넌트 외에는 추가 못 함 (static 필드는 가능)
- Mutable 필드, Setter 없음 (설계 의도)

## 커스터마이징

```java
record Money(BigDecimal amount, Currency currency) {
    // Compact Constructor로 유효성 검증
    Money {
        if (amount.signum() < 0) throw new IllegalArgumentException();
    }
    // 파생 메서드 추가 가능
    Money plus(Money other) { ... }
}
```

## Record vs DTO vs VO

| 축 | Record | 전통적 DTO | VO |
|---|---|---|---|
| 변경 가능성 | 불변 | Mutable 흔함 | 불변 |
| 비즈니스 로직 | 간단한 파생만 | 보통 없음 | 도메인 규칙 가질 수 있음 |
| 상속 | 불가 | 가능 | 가능 |
| 자동 생성 | equals, hashCode, toString | Lombok 필요 | 수동 혹은 Lombok |

**DTO로 쓰는 건 자연스럽지만, VO로도 쓸 수 있다.** 중요 결정: 상속이 필요하면 Record는 답이 아님.

## Lombok과의 관계

- `@Value` (Lombok)와 유사: 불변, equals, hashCode, toString 자동
- Record는 **언어 레벨 지원**이라 Lombok 설정, IDE 플러그인 없이 동작
- 새 코드는 Record 우선, Lombok은 Mutable이 필요하거나 상속 계층에서 사용

## 면접 체크포인트

- **Record**가 제공하는 자동 생성물과 상속 제약
- Record를 DTO, VO 어느 쪽으로도 쓸 수 있는지 판단 기준
