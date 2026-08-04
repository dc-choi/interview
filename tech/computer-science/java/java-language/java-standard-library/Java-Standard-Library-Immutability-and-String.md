---
tags: [java, immutability, string, stringbuilder, value-object, method-chaining]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Immutability and String", "Java 불변 객체와 String"]
---

# Java 불변 객체와 String

공유된 가변 객체는 한 경로의 변경이 다른 경로에서 관찰되는 부작용을 만든다. 불변 객체는 생성 후 관찰 가능한 상태를 바꾸지 않고, 변경 연산이 새 값을 반환하게 해 공유 비용을 낮춘다. `String`은 이 원리를 적용한 대표적인 표준 값 타입이다.

## 참조 공유와 부작용

```java
Address first = new Address("Seoul");
Address second = first;
second.changeCity("Busan");
```

참조 대입은 객체를 복사하지 않는다. `first`와 `second`가 같은 가변 객체를 가리키면 어느 별칭으로 바꾸어도 모두에게 보인다. 공유 자체가 문제라기보다 공유된 상태를 예측하지 못한 곳에서 바꿀 수 있다는 점이 문제다.

## 불변 객체 설계

```java
public final class Money {
    private final long amount;

    public Money(long amount) {
        if (amount < 0) throw new IllegalArgumentException();
        this.amount = amount;
    }

    public Money add(long delta) {
        return new Money(Math.addExact(amount, delta));
    }
}
```

- 클래스의 상속을 막거나 하위 타입이 불변성을 깨지 못하게 설계한다.
- 필드를 `private final`로 두고 생성 시 유효성을 검사한다.
- 상태를 바꾸는 setter 대신 새 객체를 반환하는 연산을 제공한다.
- 내부에 배열, 컬렉션, 날짜처럼 가변 객체가 있으면 입력과 출력 경계에서 방어적 복사를 한다.
- 생성 중인 `this`가 외부로 탈출하지 않게 한다.

`final`은 필드 재대입만 막는다. `final List<String>`의 원소는 여전히 바뀔 수 있으므로 `final`만으로 깊은 불변성이 생기지 않는다. record도 구성 요소 참조를 재대입할 수 없게 만들 뿐, 참조 대상까지 자동으로 불변으로 만들지는 않는다.

불변 연산의 반환값을 버리면 변경도 버린다.

```java
Money total = new Money(10_000);
total.add(5_000);          // total은 그대로다.
total = total.add(5_000);  // 새 값을 사용한다.
```

## String 생성과 비교

`String`은 `final` 클래스이자 불변 값 타입이다. 문자열 리터럴은 `String` 인스턴스로 표현되며 동일한 리터럴이 intern되어 참조를 공유할 수 있다. `new String("java")`는 별도 객체를 만들 수 있으므로 풀 동작이나 참조 동일성에 기대지 않고 내용은 `equals`로 비교한다.

```java
String a = "java";
String b = new String("java");

boolean sameReference = a == b; // false일 수 있고 여기서는 false
boolean sameValue = a.equals(b); // true
```

`String`의 내부 저장 형식을 `char[]`나 `byte[]`로 단정하지 않는다. 이는 JDK 구현 세부사항이다. 공개 API 관점에서 `String`은 UTF-16 code unit의 시퀀스이며 `length()`는 code unit 수다. Unicode code point 수나 사용자가 보는 글자 수와 다를 수 있다.

## 자주 쓰는 String 연산

| 목적 | 대표 API | 주의점 |
|---|---|---|
| 상태 확인 | `length`, `isEmpty`, `isBlank` | null 여부는 별도로 정한다 |
| 비교 | `equals`, `equalsIgnoreCase`, `compareTo` | 지역화된 자연어 비교에는 별도 규칙이 필요하다 |
| 검색 | `contains`, `indexOf`, `startsWith`, `endsWith` | 없을 때 `indexOf`는 `-1`이다 |
| 추출 | `substring` | 끝 인덱스는 포함하지 않는다 |
| 변환 | `replace`, `toUpperCase`, `strip` | 새 문자열을 반환한다 |
| 분리와 결합 | `split`, `join` | `split` 인자는 정규 표현식이다 |
| 변환 생성 | `String.valueOf`, `format`, `formatted` | 로케일 의존 형식은 `Locale`을 명시한다 |

공백 처리에서 `trim()`은 주로 U+0020 이하 문자를 기준으로 하고, `strip()`은 Unicode 공백 판단을 사용한다. 요구사항에 맞는 메서드를 선택한다.

## StringBuilder와 문자열 연결

반복 연결은 중간 `String` 객체를 많이 만들 수 있다. 한 흐름에서 가변 버퍼를 누적한 뒤 마지막에 문자열로 만드는 경우 `StringBuilder`가 적합하다.

```java
StringBuilder builder = new StringBuilder();
for (String word : words) {
    builder.append(word).append('\n');
}
String result = builder.toString();
```

- `StringBuilder`는 thread-safe하지 않다. 보통 메서드 안의 지역 객체처럼 공유하지 않고 사용한다.
- `StringBuffer`는 동기화된 주요 연산을 제공하지만, 복합 연산 전체의 안전성과 공유 설계는 별도로 검토한다.
- 컴파일러가 리터럴 연결을 상수 접기로 최적화할 수 있고 런타임 연결 전략도 구현과 버전에 따라 달라질 수 있다. 모든 `+`가 정확히 `StringBuilder` 코드로 바뀐다고 단정하지 않는다.
- 간단한 몇 번의 연결은 가독성을 우선하고, 반복 누적의 병목은 측정한 뒤 builder나 `String.join`, stream collector를 선택한다.

## 메서드 체이닝

`StringBuilder.append`처럼 현재 객체 또는 다음 값을 반환하면 연속 호출을 한 식으로 표현할 수 있다. 체이닝은 중간 변수 소음을 줄이지만 실패 지점이나 의미 단계를 숨길 정도로 길게 만들지 않는다.

```java
String label = new StringBuilder()
    .append("order-")
    .append(orderId)
    .toString();
```

불변 객체의 체이닝은 각 단계가 새 값을 반환할 수 있고, builder의 체이닝은 같은 가변 객체를 반환할 수 있다. 문법이 같다고 상태 모델도 같은 것은 아니다.

## 면접 체크포인트

- 참조 공유가 가변 객체에서 부작용으로 이어지는 과정
- `final` 필드와 깊은 불변성의 차이
- 불변 연산의 반환값을 받아야 하는 이유
- String 비교에 `equals`를 써야 하는 이유
- `length()`와 사용자가 보는 문자 수의 차이
- `StringBuilder`를 선택할 조건과 thread-safe하지 않다는 의미

## 출처

- [String, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/String.html)
- [StringBuilder, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/StringBuilder.html)
- [StringBuffer, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/StringBuffer.html)
- [JLS 3.10.5, String Literals](https://docs.oracle.com/javase/specs/jls/se26/html/jls-3.html#jls-3.10.5)
- [JLS 15.18.1, String Concatenation Operator](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.18.1)
- 김영한 강사, [기본형과 참조형의 공유](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212200)
- 김영한 강사, [공유 참조와 사이드 이펙트](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212201)
- 김영한 강사, [불변 객체 - 도입](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212202)
- 김영한 강사, [불변 객체 - 예제](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212203)
- 김영한 강사, [불변 객체 - 값 변경](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212204)
- 김영한 강사, [불변 객체 문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212205)
- 김영한 강사, [불변 객체 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212206)
- 김영한 강사, [String 클래스 - 기본](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212208)
- 김영한 강사, [String 클래스 - 비교](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212209)
- 김영한 강사, [String 클래스 - 불변 객체](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212210)
- 김영한 강사, [String 클래스 - 주요 메서드1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212211)
- 김영한 강사, [String 클래스 - 주요 메서드2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212212)
- 김영한 강사, [StringBuilder - 가변 String](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212213)
- 김영한 강사, [String 최적화](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212214)
- 김영한 강사, [메서드 체인닝 - Method Chaining](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212215)
- 김영한 강사, [String 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212216)
- 김영한 강사, [String 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212217)
- 김영한 강사, [String 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212218)

## 관련 문서

- [[Java-Standard-Library-Object-and-Equality|Java Object와 동등성]]
- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Language-Library-and-IO|Java 표준 라이브러리와 I/O]]
- [[Java-Exception-Record-Collection-Record|Java Record]]
