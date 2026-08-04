---
tags: [java, optional, null, lazy-evaluation, value-based-class]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Java Optional", "자바 Optional"]
---

# Java Optional과 지연 대안 계산

`Optional<T>`은 결과가 존재하거나 비어 있음을 return type에 표현하는 value-based class다. Null의 모든 사용을 대체하는 container가 아니라 caller가 부재를 처리해야 하는 API 결과에 적합하다.

## 생성 contract

| Method | 입력 contract |
|---|---|
| `Optional.of(value)` | `value`가 null이면 `NullPointerException` |
| `Optional.ofNullable(value)` | null이면 empty, 아니면 present |
| `Optional.empty()` | 값 없음 |

Optional variable 자체에 null을 넣지 않는다. API caller가 empty와 null Optional reference를 모두 처리하게 만들면 부재 표현이 다시 두 개가 된다.

Optional은 value-based class다. Equal instance를 교환 가능한 값으로 취급하고 reference equality, identity hash와 synchronization lock에 사용하지 않는다.

## 값 획득보다 흐름을 변환한다

```java
String city = orderRepository.findById(orderId)
    .map(Order::delivery)
    .filter(Delivery::active)
    .map(Delivery::city)
    .orElse("미정");
```

- `map`은 present value를 변환하며 mapper 결과가 null이면 empty가 된다.
- `flatMap`은 mapper가 이미 Optional을 반환할 때 중첩을 제거한다.
- `filter`는 present value가 조건을 통과하지 못하면 empty로 만든다.
- `ifPresent`와 `ifPresentOrElse`는 결과 대신 side effect가 필요한 boundary에 사용한다.
- `stream`은 zero 또는 one element stream으로 바꿔 collection pipeline에 합친다.

`get()`은 empty에서 `NoSuchElementException`을 던진다. 존재 확인 뒤 꺼내는 `isPresent`와 `get` 조합이 반복되면 `map`, `flatMap`, `filter`, `orElseThrow`로 의도를 표현할 수 있는지 본다.

## `orElse`와 `orElseGet`

Java method argument는 호출 전에 평가된다. 따라서 present Optional에서도 `orElse(expensiveFallback())`의 fallback은 먼저 실행된다. Supplier를 받는 `orElseGet(this::expensiveFallback)`은 empty일 때만 계산한다.

```java
Config config = cached.orElseGet(this::loadConfig);
```

Fallback이 literal, 이미 계산된 값처럼 값싸고 side effect가 없으면 `orElse`가 더 간단하다. Database call, object 생성과 logging 같은 작업은 eager evaluation의 비용과 side effect를 검토한다.

## API 경계

Optional을 return type으로 쓰면 caller가 부재를 보게 할 수 있다. 하지만 다음을 기계적인 금지 규칙으로 만들 필요는 없다.

- Empty collection이 자연스러운 결과라면 `Optional<List<T>>`보다 empty list가 단순하다.
- Entity field, request DTO와 method parameter는 serialization, framework binding과 null 계약을 더 복잡하게 만들 수 있어 별도 absence model이 나을 수 있다.
- Primitive 결과에는 `OptionalInt`, `OptionalLong`, `OptionalDouble`이 boxing을 줄인다.
- Null과 empty, blank가 서로 다른 domain 의미라면 Optional 하나로 뭉개지 않는다.
- 실패 원인까지 보존해야 하면 exception, sealed result type이나 validation result가 더 적합하다.

JDK API가 Optional을 field나 parameter에 쓰는 것을 문법적으로 금지하지는 않는다. Design convention을 명세상의 금지처럼 설명하지 않고 framework와 domain contract로 판단한다.

## 출처

- [Java SE 26, Optional](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Optional.html)
- [Java SE 26, OptionalInt](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/OptionalInt.html)
- 김영한 강사, [옵셔널이 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275392), [Optional의 생성과 값 획득](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275393), [Optional 값 처리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275394), [즉시 평가와 지연 평가1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275395), [즉시 평가와 지연 평가2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275396), [즉시 평가와 지연 평가3](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275397), [orElse() vs orElseGet()](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275398), [실전 활용1 - 주소 찾기](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275399), [실전 활용2 - 배송](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275400), [옵셔널 - 베스트 프랙티스](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275401), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275402)

## 관련 문서

- [[Java-Stream-Pipelines-and-Operations|Stream pipeline]]
- [[Java-Functional-Interfaces-and-Default-Methods|Supplier와 함수형 interface]]
- [[Railway-Oriented-Programming|실패 원인을 보존하는 Result model]]
