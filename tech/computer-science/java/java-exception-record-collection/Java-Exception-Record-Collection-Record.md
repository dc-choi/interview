---
tags: [java, exception, record, first-class-collection, data-class]
status: done
verified_at: 2026-11-09
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

## 생성 순서와 검증 시점

Compact constructor 본문에서는 컴포넌트 필드에 대입할 수 없다. 본문이 정상 종료된 뒤에 매개변수 값이 필드에 암묵적으로 들어간다. 매개변수 자체는 본문에서 다시 대입해 정규화할 수 있다.

그래서 현재 GA 릴리스(preview를 켜지 않은 상태)에서 본문이 `this`를 다른 메서드에 넘기거나 접근자, `toString()`을 부르면 필드가 아직 기본값인 객체가 보인다. 참조형 컴포넌트는 `null`, 기본형은 `0`이나 `false`로 찍힌다. 본문에서 `this.start`처럼 필드를 직접 읽는 코드는 blank final 필드 접근이라 컴파일 오류다. 검증과 오류 메시지는 `this`가 아니라 매개변수 값으로 만든다.

JEP 401(값 객체, preview)을 켜면 값 레코드뿐 아니라 일반 레코드의 생성자도 항상 초기 생성 단계에서 실행되어, compact constructor에서 `this`를 쓰는 코드가 컴파일 오류가 된다. 기존 레코드 생성자와 소스 호환되지 않는 변경이다.

```java
record Range(int start, int end) {
    Range {
        if (start > end) {
            // this를 넘기거나 this.start()를 부르면 start=0, end=0으로 보인다
            throw new IllegalArgumentException("start > end: " + start + " > " + end);
        }
    }
}
```

일반 클래스에서는 JDK 25에서 확정된 유연한 생성자 본문(Flexible Constructor Bodies)으로 `super(...)`나 `this(...)` 호출 앞에 문장을 둘 수 있다. 이 앞부분(prologue)에서는 초기화식이 없는 자기 클래스 필드에 대입할 수 있지만 `this`를 쓰는 코드(메서드 호출, `this` 전달, `super.m()`)와 `return`은 쓸 수 없다.

```java
class Employee extends Person {
    private final String middleName;

    Employee(String first, String middle, String last) {
        this.middleName = Objects.requireNonNull(middle); // super 전에 대입
        super(first, last);
    }
}
```

상위 생성자가 `this`를 캐시나 로그에 넘기거나 오버라이드된 메서드를 부르면, 예전 방식에서는 하위 클래스 필드가 아직 `null`인 객체가 밖으로 보였다. 해시 키로 등록된 뒤 필드가 채워지면 `hashCode`가 달라지는 문제도 생긴다. 하위 필드를 `super` 호출 전에 대입하면 그 시점에도 필드가 이미 설정되어 있다.

## 분해와 파생 생성

- 레코드 패턴(JDK 21): `instanceof`와 `switch`에서 레코드를 컴포넌트로 분해하고 패턴을 중첩할 수 있다. 접근자 호출과 조건문을 겹겹이 쓰지 않고 원하는 모양의 데이터만 꺼낸다.

```java
if (customer instanceof Customer(var name, Address(var city, var zip))) {
    send(zip);
}
```

- 파생 레코드 생성(Derived Record Creation, JEP 468): `oldLoc with { x = 0; }`처럼 기존 레코드를 컴포넌트 이름의 지역 변수로 분해하고, 블록에서 그 변수를 바꾼 뒤 canonical 생성자를 호출해 새 인스턴스를 만든다. 생성자를 거치므로 compact constructor의 검증도 다시 실행된다. 2026-11-09 기준 상태는 Candidate인 preview 제안이고 대상 릴리스가 없다. 지금은 `withX` 메서드나 생성자 직접 호출로 대신한다.

한 필드씩 바꾸는 setter는 여러 필드에 걸친 불변조건을 중간 상태에서 깨뜨릴 수 있다. 예를 들어 x와 y의 부호가 같아야 하는 점에서 x만 바꾸는 순간 규칙이 깨진다. 분해, 수정, 생성자 호출 순서는 바꿀 값을 모두 정한 뒤 한 번에 검증한다.

## 불변 보장의 범위

- 레코드의 필드는 JDK 16부터 deep reflection(`Field.setAccessible(true)` 뒤 `Field.set`)으로도 바꿀 수 없고 `IllegalAccessException`이 난다. 숨겨진 클래스의 final 필드와 static final 필드도 같다.
- 일반 클래스의 인스턴스 final 필드는 아직 deep reflection으로 바뀔 수 있다. JDK 26의 JEP 500(Prepare to Make Final Mean Final)은 이런 변경에 실행 시 경고를 내고, 향후 릴리스에서 기본으로 예외를 던질 예정이다. 꼭 필요한 코드는 `--enable-final-field-mutation`으로 허용 대상을 명시한다.
- 값 객체(JEP 401, preview)는 객체 식별성을 포기한다. `==`는 필드 값으로 비교하고 동기화는 지원하지 않는다. 필드는 암묵적으로 final이고, 값 클래스도 기본으로 final이다(abstract로 선언한 값 클래스는 상속할 수 있다). 생성자 코드는 항상 초기 생성 단계에서 실행되어 `super(...)` 전에 모든 필드를 대입한다. 2026-11-09 기준 JEP 상태는 Integrated, 릴리스는 28(preview)이라 아직 GA 기능이 아니다.
- 필드 기본값이 `null`인 가변 객체를 만들고 나중에 setter나 필드 주입으로 채우는 방식은 null이 들어온 지점을 찾기 어렵게 만든다. 생성자에서 필드를 모두 채우고 검증하면 잘못된 값이 생성 지점에서 바로 드러난다.
- 처음 쓸 때 한 번만 계산하는 상수는 반대로 늦게 초기화한다. 이 용도의 preview API `LazyConstant`는 [[JVM-JIT-and-AOT-Cache|JVM JIT와 AOT 캐시]]에 정리했다.

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
- Compact constructor에서 필드가 대입되는 시점과 `this`를 넘기면 생기는 문제
- 여러 필드에 걸친 불변조건을 setter와 파생 생성 중 어느 쪽이 지키기 쉬운지

## 출처

- [Immutable Data Beyond Value Classes — Inside Java Podcast, Nicolai Parlog, Dan Smith](https://www.youtube.com/watch?v=LEBdgYS0Lc4)
- [Oracle, The Java Language Specification SE 25, 8.10.4 Record Constructor Declarations](https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.10.4)
- [Oracle, Java SE 25 API, java.lang.reflect.Field](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/reflect/Field.html)
- [OpenJDK, JEP 440: Record Patterns](https://openjdk.org/jeps/440)
- [OpenJDK, JEP 513: Flexible Constructor Bodies](https://openjdk.org/jeps/513)
- [OpenJDK, JEP 468: Derived Record Creation (Preview)](https://openjdk.org/jeps/468)
- [OpenJDK, JEP 500: Prepare to Make Final Mean Final](https://openjdk.org/jeps/500)
- [OpenJDK, JEP 401: Value Objects (Preview)](https://openjdk.org/jeps/401)

## 관련 문서

- [[JVM-JIT-and-AOT-Cache|JVM JIT와 AOT 캐시]]
- [[Technical-Terminology-Precision|기술 용어의 정확성]]
