---
tags: [java, lambda, target-typing, method-reference, higher-order-function]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Java Lambda and Method Reference", "Java 람다와 메서드 참조"]
---

# Java lambda와 method reference

Lambda는 독립적인 이름 있는 함수 선언이 아니라 target type의 함수 계약을 구현하는 expression이다. 동작을 값처럼 전달해 변하는 로직과 반복 제어를 분리하지만, Java의 nominal type system과 객체 모델 안에서 동작한다.

## 동작 매개변수화

값만 매개변수화하면 조건이나 변환이 늘 때 비슷한 method가 계속 생긴다. 함수형 interface를 매개변수로 받으면 반복 구조는 한 번 두고 바뀌는 동작만 전달할 수 있다.

```java
static <T> List<T> select(List<T> source, Predicate<? super T> rule) {
    List<T> result = new ArrayList<>();
    for (T value : source) {
        if (rule.test(value)) result.add(value);
    }
    return result;
}

List<Integer> evens = select(numbers, n -> n % 2 == 0);
```

함수를 인자로 받거나 함수형 interface 값을 반환하는 method는 고차 함수 역할을 한다. 함수 합성, strategy 주입과 callback이 같은 원리다.

## Target typing

Lambda expression은 target type이 필요한 poly expression이다. 같은 `x -> x.length()`도 놓이는 문맥에 따라 `Function<String, Integer>`나 호환되는 사용자 interface가 될 수 있다. Target은 반드시 접근 가능한 functional interface type이어야 하며 parameter, result와 checked exception 조건이 그 interface의 function type과 맞아야 한다.

Java method signature에는 method 이름과 type parameter를 반영한 parameter type들이 들어가며 return type은 포함되지 않는다. Lambda 호환성을 설명할 때 signature와 function type을 섞지 않는다. Function type은 parameter type, result, `throws`를 포함해 lambda body의 적합성을 판단한다.

```java
Function<String, Integer> length = text -> text.length();
Consumer<String> print = text -> System.out.println(text);
```

매개변수 type은 전부 명시하거나 전부 추론되게 작성한다. Expression body는 결과를 암시적으로 반환하며 block body는 `return`과 모든 경로의 결과 호환성을 직접 맞춘다.

## Runtime identity를 계약으로 삼지 않는다

Lambda 평가 결과는 target interface를 구현하는 object reference지만 anonymous class declaration과 동일하지 않다. Runtime은 새 instance를 만들 수도 기존 instance를 재사용할 수도 있다. 따라서 lambda 값의 `==`, identity hash, monitor lock과 직렬화 identity에 의존하지 않는다.

Lambda의 `this`와 unqualified member 접근은 둘러싼 lexical context를 따른다. Anonymous class는 별도 `this`와 member scope를 만든다. Local variable capture는 `final` 또는 effectively final 변수만 허용되며, mutable object의 reference를 capture했다고 그 object까지 불변이 되는 것은 아니다.

| Lambda | Anonymous class |
|---|---|
| Functional interface 한 계약을 표현 | class body와 여러 member를 선언 가능 |
| Enclosing `this`를 사용 | Anonymous instance 자신의 `this`를 사용 |
| Runtime identity 재사용 가능 | 명시적인 class instance 생성 semantics |
| 동작 전달에 적합 | 상태와 추가 method가 필요한 구현에 적합 |

## Method reference

Method reference도 target type이 필요한 poly expression이다. 호출을 감추는 새 동작이 아니라, 이미 존재하는 method나 constructor를 function contract에 맞춰 참조한다.

| 형태 | 예 | 대응 lambda |
|---|---|---|
| Static method | `Integer::parseInt` | `s -> Integer.parseInt(s)` |
| 특정 object의 instance method | `printer::print` | `x -> printer.print(x)` |
| 임의 object의 instance method | `String::length` | `s -> s.length()` |
| Constructor | `ArrayList::new` | `() -> new ArrayList<>()` |

`TypeName::instanceMethod`에서는 함수형 interface의 첫 인자가 receiver가 되고 나머지 인자가 method argument가 된다. Overload가 있으면 target type과 overload resolution을 함께 읽어야 한다. Method reference가 lambda보다 의도를 흐리거나 receiver와 argument 구분이 어려우면 lambda가 더 낫다.

## 설계 기준

- Parameter 이름과 method 이름으로 domain 의미가 드러나면 무조건 짧게 줄이지 않는다.
- Checked exception을 던지는 callback은 표준 interface와 맞지 않을 수 있다. Boundary에서 예외 contract를 명시하고 무분별한 runtime wrapping을 피한다.
- Lambda body가 여러 분기와 side effect를 가지면 이름 있는 method로 추출한다.
- 성능은 문법 모양으로 추정하지 않고 allocation, boxing과 hot path를 benchmark한다.

## 출처

- [JLS 26, Lambda Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.27)
- [JLS 26, Method Reference Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.13)
- [JLS 26, Method Signature](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4.2)
- 김영한 강사, [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275320), [람다가 필요한 이유1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275321), [람다가 필요한 이유2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275322), [람다가 필요한 이유3](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275323), [함수 vs 메서드](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275324), [람다 시작](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275325)
- 김영한 강사, [람다 정의](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275327), [함수형 인터페이스](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275328), [람다와 시그니처](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275329), [람다와 생략](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275330), [람다의 전달](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275331), [고차 함수](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275332), [문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275333), [문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275334), [문제와 풀이3](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275335), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275336)
- 김영한 강사, [람다 vs 익명 클래스1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275362), [람다 vs 익명 클래스2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275363), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275364)
- 김영한 강사, [메서드 참조가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275365), [메서드 참조1 - 시작](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275366), [메서드 참조2 - 매개변수1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275367), [메서드 참조3 - 임의 객체의 인스턴스 메서드 참조](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275368), [메서드 참조4 - 활용1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275369), [메서드 참조5 - 활용2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275370), [메서드 참조6 - 매개변수2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275371), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275372)

## 관련 문서

- [[Java-Functional-Interfaces-and-Default-Methods|함수형 interface와 default method]]
- [[Java-Stream-Pipelines-and-Operations|Stream pipeline]]
- [[Java-Standard-Library-Nested-and-Local-Classes|Nested, local, anonymous class]]
