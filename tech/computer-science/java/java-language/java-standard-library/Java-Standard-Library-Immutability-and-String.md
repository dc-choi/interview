---
tags: [java, immutability, string, stringbuilder, value-object, method-chaining]
status: done
verified_at: 2026-10-05
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

- 클래스의 상속을 막거나 하위 타입이 불변성을 깨지 못하게 설계한다. 상속을 열어 두면 하위 class가 getter를 override해 자기 가변 field를 반환할 수 있고, 불변 타입으로 선언된 참조를 통해서도 값이 바뀌는 것처럼 보인다.
- 필드를 `private final`로 두고 생성 시 유효성을 검사한다.
- 상태를 바꾸는 setter 대신 새 객체를 반환하는 연산을 제공한다.
- 내부에 배열, 컬렉션, 날짜처럼 가변 객체가 있으면 입력과 출력 경계에서 방어적 복사를 한다. 생성자가 받은 참조를 그대로 저장하면 호출자가 원본을 바꿀 때 내부 상태도 바뀌고, getter가 내부 참조를 그대로 반환하면 받은 쪽이 상태를 바꿀 수 있다.
- 컬렉션 field는 `List.copyOf(source)`처럼 수정 불가 사본으로 받으면 getter가 그 list를 그대로 반환해도 된다. 단, `List.copyOf`는 null 원소가 있으면 `NullPointerException`을 던진다. `List.copyOf`와 `new ArrayList<>(source)`는 원소 참조를 공유하는 얕은 복사이므로 원소가 가변이면 원소도 새 object로 복사한다([[Defensive-Copy-Depth-Collections|복사 깊이]]).
- 생성 중인 `this`가 외부로 탈출하지 않게 한다.

`final`은 필드 재대입만 막는다. `final List<String>`의 원소는 여전히 바뀔 수 있으므로 `final`만으로 깊은 불변성이 생기지 않는다. record도 구성 요소 참조를 재대입할 수 없게 만들 뿐, 참조 대상까지 자동으로 불변으로 만들지는 않는다.

불변 연산의 반환값을 버리면 변경도 버린다.

```java
Money total = new Money(10_000);
total.add(5_000);          // total은 그대로다.
total = total.add(5_000);  // 새 값을 사용한다.
```

## 불변 객체가 주는 이점

- method에 넘긴 뒤에도 상태가 그대로라 호출 경로를 따라가며 변경 여부를 확인하거나 저장소에서 다시 읽을 필요가 없다. 실수로 상태를 바꾸려는 코드도 바꿀 수단이 없다.
- `HashSet` 원소, `HashMap` key와 cache key로 안전하다. 가변 object를 넣은 뒤 `hashCode`와 `equals`에 쓰는 field를 바꾸면 그 object로도, 원래 값으로 새로 만든 object로도 찾지 못할 수 있다([[Java-Generics-and-Collections-Hashing|해시 컬렉션의 가변 키]]). 값을 바꾸는 연산이 자기 field를 고치는 대신 새 object를 반환하면 이미 넣은 key는 그대로 유지된다.
- 생성 중 `this`가 탈출하지 않았다면 다른 thread는 동기화 없이도 `final` field의 초기화된 값을 본다(JLS 17.5). 이후 상태 변경이 없으므로 공유해도 경쟁 조건이 생기지 않는다.
- 불변 객체를 field로 쓰면 방어적 복사 없이 참조를 공유해도 된다.

외부에서 관찰되는 상태만 불변이고 지연 계산한 hash 같은 내부 cache는 가변인 객체도 불변이라고 부르곤 한다. 이때 thread safety는 자동으로 따라오지 않는다. OpenJDK의 `String.hashCode`는 계산이 불변 상태에서 나오는 멱등 연산이고 instance마다 두 cache field(`hash`, `hashIsZero`) 중 하나에만 쓰도록 제한해, 동기화 없는 경쟁이 결과를 해치지 않게 설계했다고 주석에 밝힌다. 이런 조건을 갖추지 못한 cache는 `volatile`이나 lock이 필요하고, `long`과 `double`의 non-volatile 쓰기는 원자성도 보장되지 않는다(JLS 17.7).

불변의 뜻은 언어마다 다르다. Python은 가변 list를 담은 tuple의 list 내용이 바뀌어도 tuple이 담은 object 묶음은 바뀌지 않으므로 tuple을 불변으로 본다. 참조 대상까지 바뀌지 않는 깊은 불변성보다 느슨한 정의다.

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
- 상태 변경 method 제거, `private final` field, 상속 차단, 가변 참조의 방어적 복사가 각각 막는 우회 경로
- 불변 객체가 hash key와 thread 공유에 안전한 이유, 내부 cache가 가변일 때의 예외
- String 비교에 `equals`를 써야 하는 이유
- `length()`와 사용자가 보는 문자 수의 차이
- `StringBuilder`를 선택할 조건과 thread-safe하지 않다는 의미

## 값 교체와 문자열의 입력 계약

가변 entity 안에 불변 Address를 담으면 다른 entity와 공유해도 한쪽 값 변경은 새 Address로 참조를 교체한다. `withCity` 같은 이름은 기존 instance를 바꾸지 않고 새 값을 만든다는 의도를 표현하며 반환값을 받아야 한다. 공유 값과 계산 결과는 불변으로, 식별자를 가진 entity의 상태 전이는 의미 있는 method로 다루는 선택을 구분한다. 잦은 조립은 builder와 allocation 비용을 함께 본다.

같은 문자열 리터럴과 상수식 문자열은 intern된 instance를 공유한다(JLS 계약). method 인자가 리터럴인지 동적 결과인지 알 수 없으므로 내용 비교에는 equals를 쓴다. 불변성은 이 공유를 안전하게 하지만 풀의 위치, lookup 구현과 해석 시점은 JDK 세부사항이다.

`replace(CharSequence,CharSequence)`는 literal 일치를 모두 바꾸고 replaceAll/replaceFirst/split/matches는 정규식을 받는다. `a.b`의 점이나 protocol 구분자 `|`를 그대로 pattern에 넣으면 뜻이 달라진다. literal pattern은 Pattern.quote, replacement의 dollar/backslash는 Matcher.quoteReplacement로 별도 escape한다. matches는 문자열 전체의 일치를 검사한다. 반복 indexOf는 -1에서 끝내고 다음 시작 위치를 전진시키며 빈 target의 정책도 정한다. malformed command는 입력 오류 응답으로 처리하고 곧바로 connection 장애로 취급하지 않는다.

## 출처

- 인프런 보충 강의: [채팅 프로그램 - 서버2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244478)

- [String, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/String.html)
- [StringBuilder, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/StringBuilder.html)
- [StringBuffer, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/StringBuffer.html)
- [JLS 3.10.5, String Literals](https://docs.oracle.com/javase/specs/jls/se26/html/jls-3.html#jls-3.10.5)
- [JLS 15.18.1, String Concatenation Operator](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.18.1)
- [JLS 17.5, final Field Semantics](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.5)
- [JLS 17.7, Non-Atomic Treatment of double and long](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.7)
- [List, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/List.html)
- [Objects, values and types, Python 3 Language Reference](https://docs.python.org/3/reference/datamodel.html#objects-values-and-types)
- [String.java hashCode — OpenJDK jdk-26-ga](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.base/share/classes/java/lang/String.java)
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
- 쉬운코드, [불변 객체의 개념, 장점, 구현 방법](https://www.youtube.com/watch?v=EOGOJdBy2Rg)

## 관련 문서

- [[Java-Standard-Library-Object-and-Equality|Java Object와 동등성]]
- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Language-Library-and-IO|Java 표준 라이브러리와 I/O]]
- [[Java-Exception-Record-Collection-Record|Java Record]]
