---
tags: [java, functional-programming, pure-function, immutability, declarative-programming]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Functional Programming in Java", "Java 함수형 원칙"]
---

# Java에서 함수형 원칙 적용

Java는 object-oriented와 imperative feature를 함께 가진 multiparadigm language다. Lambda와 Stream을 쓴다는 사실만으로 code가 함수형이 되지는 않는다. Function을 조합하고 state change와 side effect를 통제하는 설계가 핵심이다.

## 명령형과 선언형

명령형 code는 iteration, branch와 mutation 순서를 직접 기술한다. 선언형 code는 원하는 transformation과 constraint를 표현하고 실행 전략 일부를 library에 맡긴다.

```java
List<String> activeNames = users.stream()
    .filter(User::active)
    .map(User::name)
    .toList();
```

선언형이 항상 더 짧거나 빠르다는 뜻은 아니다. Step별 state transition, complex control flow와 recovery가 중요하면 명령형 code가 더 분명할 수 있다.

## 순수 함수

같은 입력과 같은 관찰 가능한 환경에서 같은 결과를 내고 외부에서 관찰 가능한 state를 변경하지 않는 function은 추론, test와 parallelization이 쉽다.

- Parameter 대신 global mutable state를 읽지 않는다.
- Clock, random, file, network와 database dependency를 boundary에서 주입한다.
- Input object와 collection을 몰래 변경하지 않는다.
- Logging, metric과 event 발행도 observable side effect임을 인식한다.

현실의 application은 side effect가 필요하다. Core rule을 pure function으로 두고 adapter와 use case shell에서 IO와 transaction을 조율하면 effect 위치가 보인다.

## 불변성 지향

불변 object는 생성 뒤 observable state가 바뀌지 않는다. 공유 상태의 interleaving을 줄이고 cache와 concurrent read를 단순화한다. 하지만 매번 큰 graph를 복사하면 allocation 비용이 커질 수 있어 persistent data structure, copy-on-write 범위와 aggregate boundary를 함께 본다.

`final` reference는 재대입만 막고 가리키는 object를 immutable하게 만들지 않는다. Unmodifiable view와 immutable copy도 구분한다.

## Java의 first-class function model

Java는 function을 별도 structural function type으로 두기보다 functional interface instance로 표현한다. Lambda를 variable에 저장하고 parameter, return value로 전달할 수 있어 practical first-class behavior를 제공하지만 target nominal type이 필요하다.

`Function.andThen`, `compose`, `Predicate.and`처럼 작은 transformation을 합성할 수 있다. 합성이 domain 언어를 명확하게 만들 때 유용하며, point-free style과 깊은 chain이 의도를 숨기면 이름 있는 method로 되돌린다.

## Side effect 경계

| Core에 두기 좋은 것 | Shell에 두기 좋은 것 |
|---|---|
| Validation, 계산, 분류, 상태 전이 결정 | DB write, HTTP call, file IO |
| Immutable input에서 output 생성 | Transaction, retry, timeout |
| Deterministic policy | Clock, random, message publish |

Exception도 control effect다. Recoverable business failure는 result type이나 explicit state로 표현할 수 있고 예상하지 못한 infrastructure failure는 boundary의 exception policy로 처리한다.

## 적용 질문

- Callback이 외부 mutable state를 capture하는가?
- Function 이름 없이 chain만 읽어도 business 의미가 보이는가?
- Parallel execution이나 retry 때 결과가 유지되는가?
- 새로운 object 반환과 in-place mutation 중 어느 것이 aggregate invariant를 더 명확히 하는가?
- IO와 policy가 분리되어 core logic을 빠르게 test할 수 있는가?

## 출처

- [JLS 26, Lambda Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.27)
- [Java SE 26, `java.util.function`](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/function/package-summary.html)
- [Java SE 26, Stream side effects](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/package-summary.html#SideEffects)
- 김영한 강사, [프로그래밍 패러다임](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275422), [함수형 프로그래밍이란?](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275423), [자바와 함수형 프로그래밍1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275424), [자바와 함수형 프로그래밍2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275425), [자바와 함수형 프로그래밍3](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275426), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275427)

## 관련 문서

- [[Declarative-Programming|선언형 프로그래밍]]
- [[Lambda-Functional-Interface|언어별 함수형 개요]]
- [[Railway-Oriented-Programming|Result와 effect composition]]
