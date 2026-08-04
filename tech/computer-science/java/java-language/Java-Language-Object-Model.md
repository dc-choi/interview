---
tags: [java, class, object, inheritance, interface, lambda, encapsulation]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Object Model", "Java 객체 모델"]
---

# Java 객체 모델

Java의 객체 모델은 상태와 행동을 클래스에 묶고, 접근 제어와 타입 관계로 변경 범위를 제한한다. 객체 지향의 목적은 클래스를 많이 만드는 것이 아니라 책임과 불변식을 지키는 경계를 만드는 데 있다.

## 클래스, 객체, 메서드

```java
final class Account {
    private long balance;

    Account(long initialBalance) {
        if (initialBalance < 0) throw new IllegalArgumentException();
        this.balance = initialBalance;
    }

    void deposit(long amount) {
        if (amount <= 0) throw new IllegalArgumentException();
        balance += amount;
    }
}
```

- 클래스는 필드, 메서드, 생성자와 타입 규칙을 선언한다. `new`는 객체를 만들고 생성자를 호출해 유효한 초기 상태를 구성한다.
- 생성자는 반환 타입이 없고 클래스 이름과 같으며 overload할 수 있다. 생성자를 선언하지 않으면 조건에 따라 기본 생성자가 제공된다.
- method 선언은 접근 modifier, 반환 타입, 이름, parameter 목록과 body로 구성된다. 반환 타입이 `void`가 아니면 정상 종료 경로에서 호환되는 값을 반환해야 한다.
- 인스턴스 메서드의 `this`는 현재 객체를 가리킨다. 생성자 위임에는 `this(...)`, 상위 클래스 생성자 호출에는 `super(...)`를 쓴다.
- Java의 인자는 항상 값으로 전달된다. 객체 인자는 참조 값의 복사본이므로 같은 객체를 변경할 수는 있지만 호출자의 변수를 재대입할 수는 없다.
- 더는 도달할 수 없는 객체는 GC 대상이 될 수 있지만, 회수 시점은 프로그램이 결정하지 않는다.
- `null` 참조를 통해 instance member에 접근하면 `NullPointerException`이 발생한다. null을 임의의 유효 상태처럼 퍼뜨리기보다 경계에서 contract를 정한다.

## 패키지, 접근 제어, static

- `package`는 이름 공간과 접근 경계를 만들고 `import`는 다른 패키지 타입의 이름을 짧게 쓰게 한다.
- 접근 범위는 `private`, package-private, `protected`, `public` 순으로 넓어진다. 필요한 최소 범위만 공개한다.
- `static` 멤버는 특정 인스턴스가 아니라 클래스에 속한다. 상수, 순수 utility, 생성 factory에는 유용하지만 공유 mutable state는 동시성 안전성을 자동으로 얻지 못한다.
- 전역 static 상태는 테스트 격리와 의존성 교체를 어렵게 한다. NestJS의 provider처럼 생명주기와 의존성을 container가 관리하게 할지 검토한다.

## 캡슐화

필드를 `private`로 만들고 getter와 setter를 모두 여는 것만으로 캡슐화가 완성되지는 않는다. 객체가 스스로 규칙을 검증하는 행동을 공개해야 한다.

```java
// 상태를 아무 값으로 바꾸는 setBalance보다 의도를 드러낸다.
account.deposit(10_000);
```

- 공개 API는 객체가 보장할 수 있는 동작만 노출한다.
- 생성 시점과 상태 전이마다 불변식을 지킨다.
- mutable collection을 그대로 반환하면 내부 상태가 우회 변경될 수 있으므로 불변 view나 방어적 복사를 고려한다.

## 상속, override, 다형성

- 클래스는 하나의 직접 상위 클래스만 `extends`할 수 있고 여러 interface를 `implements`할 수 있다.
- 하위 객체에는 상위 클래스의 상태가 포함되지만 `private` 멤버를 하위 클래스 코드가 직접 접근할 수는 없다. 상위 클래스가 공개한 행동을 통한다.
- instance method override는 런타임 객체 타입에 따라 호출 대상을 결정한다. `@Override`로 의도를 검증한다.
- overload는 같은 이름에 다른 parameter 목록을 두는 compile-time 선택이다. static method의 같은 signature 선언은 override가 아니라 hiding이다.
- `Object`를 제외한 모든 클래스는 직접 또는 간접적으로 `Object`를 상속한다. `equals`, `hashCode`, `toString` 계약을 함께 이해한다.
- 상속은 진짜 대체 가능한 is-a 관계와 안정적인 공통 계약에 사용한다. 코드 재사용만 목적이면 조합과 위임이 변경에 더 강한 경우가 많다.

## 중첩 클래스와 익명 클래스

- static nested class는 바깥 인스턴스 없이 존재한다.
- non-static inner class는 바깥 인스턴스와 연결되며 그 멤버에 접근할 수 있다.
- local class는 block 안에서 선언하고, anonymous class는 선언과 인스턴스 생성을 한 식으로 표현한다.
- 익명 클래스는 자체 identity와 `this`를 가지며 field와 여러 method를 가질 수 있다. lambda와 의미가 같지 않다.

## interface와 abstract class

| 축 | interface | abstract class |
|---|---|---|
| 목적 | 역할과 계약 조합 | 관련 타입의 공통 상태와 구현 공유 |
| 다중 관계 | 여러 interface 구현 가능 | 클래스 상속은 하나만 가능 |
| 상태 | instance field와 constructor 없음, field는 상수 | instance field와 constructor 가능 |
| method | abstract, `default`, `static`, `private` method 가능 | abstract와 concrete method 모두 가능 |
| 생성 | 직접 instance화 불가 | 직접 instance화 불가 |

- interface는 선언부만 가진다는 설명은 현대 Java에는 맞지 않는다. `default`와 private method로 공통 구현을 제공할 수 있다.
- abstract class는 abstract method가 하나도 없어도 선언할 수 있다. 직접 생성은 막되 공통 구현과 상태를 제공하려는 설계가 가능하다.

## lambda와 함수형 interface

lambda는 target type이 되는 functional interface의 단일 abstract method 구현을 간결하게 표현한다.

```java
Predicate<String> nonEmpty = value -> !value.isEmpty();
```

- `@FunctionalInterface`는 단일 abstract method 규칙을 컴파일러가 검사하게 한다. `Object`의 public method와 default/static/private method는 이 개수에 포함되지 않는다.
- lambda의 type은 주변 context로 결정되므로 같은 표현식이 서로 다른 호환 functional interface를 구현할 수 있다.
- parameter type은 target type에서 추론할 수 있고 parameter 하나는 괄호를 생략할 수 있다. expression body는 결과를 암시적으로 반환하지만 block body에서 값을 반환하려면 `return`이 필요하다.
- lambda의 `this`는 둘러싼 context의 `this`를 가리킨다. 별도 `this`를 가진 익명 클래스와 다르다.
- lambda 도입이 Java를 순수 함수형 언어로 바꾸지는 않는다. 객체 모델 안에서 동작을 값처럼 전달하는 수단이다.

## 소멸자는 없고 자원 수명은 명시한다

Java에는 C++식 결정적 destructor가 없다. `Object.finalize()`는 Java 9부터 deprecated이며 제거 대상으로 지정됐다. 실행이 지연되거나 영원히 실행되지 않을 수 있고 보안, 성능, 신뢰성 문제가 있으므로 자원 정리에 사용하면 안 된다.

```java
try (var input = Files.newInputStream(path)) {
    return input.readAllBytes();
}
```

- 파일, socket, database connection처럼 즉시 반환해야 하는 자원은 `AutoCloseable`과 try-with-resources로 닫는다.
- `System.gc()`는 GC 수행을 보장하는 lifecycle API가 아니다.
- `Cleaner`와 `PhantomReference`는 특수한 native resource safety net에 제한적으로 검토하며 prompt cleanup의 대체가 아니다.

## TypeScript와 NestJS에 대응하기

| Java | TypeScript와 NestJS |
|---|---|
| class와 interface 관계가 명목 타입 중심 | interface는 structural type이며 runtime에는 사라짐 |
| annotation과 reflection으로 runtime metadata 활용 | decorator metadata와 runtime class/token을 DI에 활용 |
| interface 자체를 runtime token으로 사용할 수 있음 | interface는 지워지므로 string/symbol/class token이 필요 |
| try-with-resources로 `AutoCloseable` 관리 | `finally`, framework lifecycle hook, explicit close로 관리 |

두 생태계 모두 constructor injection으로 필수 의존성을 드러낼 수 있다. 다만 TypeScript interface는 runtime value가 아니므로 NestJS에서 provider token을 별도로 설계해야 한다.

## 면접 체크포인트

- 객체 생성과 생성자, `this`, `super`의 역할
- 캡슐화와 단순 getter/setter의 차이
- overload, override, static hiding의 차이
- 상속보다 조합이 나은 조건
- 현대 interface가 가질 수 있는 method 종류
- abstract class가 abstract method 없이도 가능한 이유
- lambda와 익명 클래스의 `this` 차이
- finalize 대신 try-with-resources를 쓰는 이유

## 출처

- [JLS 8, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [JLS 9, Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html)
- [Object.finalize, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Object.html)
- [AutoCloseable, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/AutoCloseable.html)
- [JEP 421, Deprecate Finalization for Removal](https://openjdk.org/jeps/421)
- [TypeScript, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript, Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [NestJS, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS, Lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- 인프런, [객체 지향 프로그래밍이란](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13688)
- 인프런, [클래스 제작과 객체 생성](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13689)
- 인프런, [메서드](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13690)
- 인프런, [객체와 메모리](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13691)
- 인프런, [생성자와 소멸자 그리고 this 키워드](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13692)
- 인프런, [패키지와 static](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13693)
- 인프런, [데이터 은닉](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13694)
- 인프런, [상속](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13696)
- 인프런, [상속 특징](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13697)
- 인프런, [내부 클래스와 익명 클래스](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13698)
- 인프런, [인터페이스](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13699)
- 인프런, [추상클래스](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13700)
- 인프런, [람다식](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13701)

## 관련 문서

- [[Java-Standard-Library-Object-and-Equality|Java Object와 동등성]]
- [[Java-Standard-Library-Nested-and-Local-Classes|Java 중첩 클래스와 지역 클래스]]
- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Language-Construction-and-Encapsulation|Java 생성과 캡슐화]]
- [[Java-Language-Class-Members-and-Memory|Java 클래스 멤버와 메모리 모델]]
- [[Java-Language-Inheritance-and-Polymorphism|Java 상속과 다형성]]
- [[Java-Language-OOP-Design-and-OCP|Java 객체 협력과 OCP]]
- [[OOP|객체 지향 프로그래밍]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Java-Backend-Fundamentals|Java 백엔드 면접 기초]]
