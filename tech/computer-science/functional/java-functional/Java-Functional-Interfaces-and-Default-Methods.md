---
tags: [java, functional-interface, java-util-function, default-method, generics]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Java Functional Interfaces", "Java 함수형 인터페이스"]
---

# Java 함수형 interface와 default method

Functional interface는 lambda와 method reference가 구현할 하나의 function contract를 제공한다. 같은 parameter와 result 모양의 interface를 임의로 계속 만들기보다 `java.util.function`의 표준 계약을 우선하고 domain 의미가 별도 type을 요구할 때만 사용자 interface를 둔다.

## 정확한 정의

JLS 26에서 functional interface는 `sealed`가 아니며 `Object`의 public instance method와 같은 signature를 제외하고 하나의 abstract method 계약을 가지는 interface다. 상속된 여러 abstract method가 override-equivalent하고 return-type-substitutable하면 논리적으로 한 계약이 될 수 있다. 단순히 source에 `abstract` keyword가 한 번 보이는지를 세는 규칙이 아니다.

`@FunctionalInterface`는 의도를 문서화하고 compiler가 계약 위반을 검사하게 한다. Annotation이 없어도 정의를 만족하면 functional interface이고, annotation을 붙였는데 만족하지 않으면 compile-time error다. Default, static, private method는 single abstract method 개수에 추가되지 않는다.

## 표준 interface 선택

| 의도 | Interface | 핵심 method |
|---|---|---|
| 변환 | `Function<T, R>` | `R apply(T value)` |
| 조건 | `Predicate<T>` | `boolean test(T value)` |
| 소비와 side effect | `Consumer<T>` | `void accept(T value)` |
| 지연 공급 | `Supplier<T>` | `T get()` |
| 같은 type 변환 | `UnaryOperator<T>` | `T apply(T value)` |
| 같은 type 결합 | `BinaryOperator<T>` | `T apply(T left, T right)` |
| 실행 command | `Runnable` | `void run()` |

두 입력은 `BiFunction`, `BiPredicate`, `BiConsumer`를 사용한다. 세 개 이상의 인자가 자주 보이면 새 interface부터 만들기보다 command object나 domain value로 함께 묶을 수 있는지 검토한다.

Generic parameter에는 호출자의 subtype을 받고 결과의 subtype을 허용하도록 `? super T`, `? extends R` 같은 variance를 API 경계에서 활용할 수 있다. Library method의 실제 signature를 참고하고 raw type과 불필요한 cast를 피한다.

## Primitive specialization

`IntPredicate`, `IntFunction<R>`, `ToIntFunction<T>`, `IntUnaryOperator` 같은 specialization은 boxing을 피하고 숫자 pipeline과 맞춘다. 모든 code를 specialization으로 바꾸지는 않는다. Profiling에서 allocation과 boxing이 실제 병목이거나 primitive stream과 자연스럽게 연결될 때 선택한다.

## 합성

```java
Predicate<String> nonBlank = text -> !text.isBlank();
Predicate<String> shortText = text -> text.length() <= 20;
Predicate<String> valid = nonBlank.and(shortText);

Function<String, String> trim = String::trim;
Function<String, Integer> length = String::length;
Function<String, Integer> normalizedLength = trim.andThen(length);
```

`Function.compose`는 인자로 받은 함수를 먼저 실행하고 `andThen`은 현재 함수를 먼저 실행한다. `Predicate.and`, `or`는 short-circuit한다. 합성 순서와 side effect가 섞이면 결과가 달라지므로 가능한 stateless function을 사용한다.

## Default method

Default method는 기존 구현 class에 abstract method 구현을 강제하지 않고 interface API를 진화시키는 수단이다. 모든 구현에 정말 타당한 기본 동작을 제공할 때 적합하며 상태를 보관하지 않는다.

- Class의 instance method가 interface default보다 우선한다.
- 더 구체적인 subinterface의 default가 우선한다.
- 관련 없는 두 interface의 default가 충돌하면 구현 class가 override해 명시적으로 해결한다.
- Binary compatibility가 개선돼도 semantic compatibility가 자동 보장되지는 않는다. 새 default 동작이 기존 구현의 불변식과 맞는지 검토한다.
- 복잡한 workflow와 mutable state는 interface default에 숨기지 않는다.

## 출처

- [JLS 26, Functional Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html#jls-9.8)
- [JLS 26, Interface Method Body and default methods](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html#jls-9.4.3)
- [Java SE 26, `java.util.function`](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/function/package-summary.html)
- [Java SE 26, `Function`](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/function/Function.html), [`Predicate`](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/function/Predicate.html)
- 김영한 강사, [함수형 인터페이스와 제네릭1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275338), [함수형 인터페이스와 제네릭2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275339), [람다와 타겟 타입](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275340), [기본 함수형 인터페이스](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275341), [특화 함수형 인터페이스](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275343), [기타 함수형 인터페이스](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275344), [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275345), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275346)
- 김영한 강사, [디폴트 메서드가 등장한 이유](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275404), [디폴트 메서드 소개](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275405), [디폴트 메서드의 올바른 사용법](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275406), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275407)

## 관련 문서

- [[Java-Lambda-and-Method-Reference|Lambda와 method reference]]
- [[Java-Stream-Pipelines-and-Operations|Stream pipeline]]
- [[Java-Functional-Programming-Principles|함수형 원칙]]
