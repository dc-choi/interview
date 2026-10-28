---
tags: [java, instanceof, pattern-matching, downcast, casting, scope, sealed, compatibility]
status: done
verified_at: 2026-10-27
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java instanceof Pattern Matching", "Java downcast와 instanceof 패턴 매칭", "Java sealed switch 호환성"]
---

# Java downcast와 instanceof 패턴 매칭

downcast는 reference의 static type을 좁히며 runtime check가 필요하다. 실제 object가 target type의 instance가 아니면 `ClassCastException`이 발생하므로 type test 뒤에 cast한다. `instanceof` 패턴 매칭은 test, cast와 변수 선언을 한 식으로 묶고, 그 변수를 쓸 수 있는 범위를 compiler가 흐름으로 계산하게 한다.

## test와 cast를 한 식으로

~~~java
// 패턴 매칭 이전
if (obj instanceof String) {
    String text = (String) obj;
    System.out.println(text.length());
}

// JDK 16부터
if (obj instanceof String text) {
    System.out.println(text.length());
}
~~~

- `String text`처럼 타입과 변수를 묶은 부분을 type pattern, 그 변수를 pattern variable이라고 부른다. match가 성공하면 cast된 값이 pattern variable에 들어간다(JLS 15.20.2).
- JDK 14(JEP 305)와 JDK 15(JEP 375)의 preview를 거쳐 JDK 16(JEP 394)에서 정식 기능이 됐다.
- 검사할 값이 null이면 `obj instanceof String s`는 false이고 pattern variable도 초기화되지 않는다(JLS 15.20.2).
- type test가 필요한 boundary도 있지만 구현별 behavior를 호출하려는 목적이라면 virtual method로 옮길 수 있는지 먼저 본다([[Java-Language-Inheritance-and-Polymorphism|상속과 다형성]]).

## pattern variable의 scope는 흐름이 정한다

pattern variable의 scope는 block이 아니라 match 성공이 확실한 지점(definitely matched)으로 정해진다(JLS 6.3). 이를 flow scoping이라고 부른다.

| 코드 | 결과 | 이유 |
|---|---|---|
| `if (o instanceof String s && s.length() > 3)` | 허용 | `&&`의 오른쪽은 왼쪽이 true, 즉 match가 성공했을 때만 평가된다 |
| `if (o instanceof String s \|\| s.length() > 3)` | compile error | `\|\|`의 오른쪽은 왼쪽이 false, 즉 match가 실패했을 때 평가된다 |
| `if (o instanceof String s) {} else { s.length(); }` | compile error | else는 match가 실패한 경로다 |
| `if (o instanceof String s) {}` 다음 줄의 `s.length()` | compile error | if 문을 지나면 match 여부를 알 수 없다 |

match 실패 경로가 정상 종료하지 못하면 scope가 if 문 뒤로 이어진다.

~~~java
static int length(Object obj) {
    if (!(obj instanceof String s)) {
        throw new IllegalArgumentException("문자열이 필요합니다");
    }
    return s.length(); // 여기 도달했다면 match가 성공한 것이다
}
~~~

`if (e) S`에서 S가 정상 종료할 수 없으면 e가 false일 때 생기는 pattern variable이 if 문 다음에서도 match된 상태로 취급된다(JLS 6.3.2.2). `!`는 true와 false 조건을 뒤바꾸므로 negated test와 early throw 또는 return을 함께 쓰면 입력 검증 뒤의 정상 흐름을 평평하게 둘 수 있다. 반대로 scope가 if 안에서 끝나면 뒤따르는 다른 if에서 같은 이름을 다시 선언할 수 있다.

## scope만 다른 지역 변수다

- JDK 16부터 pattern variable은 암시적으로 `final`이 아니다. 지역 변수처럼 다시 대입할 수 있지만 cast 결과를 덮어쓰면 읽는 사람이 혼동하므로 다른 값은 새 변수에 담는다.
- 같은 scope의 다른 지역 변수나 pattern variable과 이름이 겹치면 compile error다.
- 지역 변수처럼 같은 이름의 field를 가린다(JLS 6.4.1). scope 안에서는 pattern variable을, scope 밖에서는 field를 가리키므로 같은 이름이 경로마다 다른 대상을 읽는다.

~~~java
static String text = "field";

static String describe(Object o) {
    if (o instanceof String text && text.length() > 3) {
        return text; // pattern variable
    }
    return text;     // static field
}
~~~

`describe("hello")`는 `hello`를 반환하지만 `describe("wow")`는 길이 조건에서 떨어져 `field`를 반환한다. 컴파일 오류 없이 의도와 다른 값을 쓰므로 pattern variable 이름을 field와 겹치지 않게 짓는다.

## TypeScript 좁히기와 비교

TypeScript는 `typeof value === "string"` 같은 조건 뒤에서 같은 변수의 타입을 control flow analysis로 좁힌다([[TS-Type-Narrowing|TypeScript 타입 좁히기]]). Java는 원래 변수의 static type을 그대로 두고 match가 성공한 흐름에만 새 pattern variable을 선언한다. 두 언어 모두 compiler가 흐름을 따라 사용 가능 지점을 계산하지만, Java에서 `obj.length()`는 여전히 compile error다.

JDK 21은 type pattern을 `switch`의 case label에서 쓰는 pattern matching for switch(JEP 441)와 record 값을 구성 요소로 분해하는 record pattern(JEP 440)을 정식 기능으로 넣었다.

## sealed 계층과 switch 완전성의 호환성

`sealed` class나 interface는 `permits`로 직접 하위 타입을 제한한다(JEP 409, JDK 17 정식). switch 대상이 sealed 타입이면 compiler가 알려진 하위 타입이 모두 case로 다뤄졌는지 확인하므로 `default` 없이 완전한 switch를 쓸 수 있다. 이 완전성은 컴파일 시점에 알던 하위 타입에 대한 보장이라, 하위 타입이 늘어나는 진화에는 두 경로로 영향이 난다.

~~~java
// 라이브러리 v1 (한 파일에 두려고 public을 생략했다)
sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}

// 사용 코드: default 없는 완전한 switch
static double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.r() * c.r();
        case Square q -> q.side() * q.side();
    };
}

// 라이브러리 v2: permits Circle, Square, Triangle
~~~

| 상황 | 결과 |
|---|---|
| 사용 코드를 v2에 맞춰 다시 컴파일 | `Triangle` case가 없어 compile error |
| 사용 코드를 다시 컴파일하지 않고 v2와 함께 실행 | link는 성공하고, switch가 `Triangle`을 만나면 `MatchException` |

2026-10-27 JDK 21.0.3에서 v1 기준으로 컴파일한 사용 코드를 v2 라이브러리와 실행하자 `java.lang.MatchException`이 났고, 같은 코드를 v2 기준으로 다시 컴파일하자 `the switch expression does not cover all possible input values` 오류가 났다.

JLS SE 26은 permitted 하위 타입 추가를 기존 바이너리와 binary compatible한 변경으로 분류한다(13.4.2.1, interface는 13.5.2). JVM은 link 시점에 완전성을 검사하지 않기 때문이다. 대신 실행 중 실패는 binary 비호환이 아니라 migration incompatible한 변경의 결과라고 설명한다. enum에 상수를 추가할 때도 같은 실행 실패가 날 수 있다(13.4.26). 반대로 permits 목록에서 하위 타입을 빼면 빠진 하위 타입의 기존 바이너리를 load할 때 `IncompatibleClassChangeError`가 난다.

- **공개 API의 버전 정책**: sealed 타입을 공개 API로 내보냈다면 하위 타입 추가는 사용자의 재컴파일을 깨고, 재컴파일하지 않은 사용자에게는 실행 오류를 낼 수 있다. SemVer를 따르는 라이브러리라면 이를 major 변경으로 다뤄야 한다는 주장이 있다. JLS의 binary 호환 분류만 보고 minor 변경으로 판단하지 않는다.
- **진화 계획 문서화**: Oracle의 Inside Java 완전성 가이드는 sealed 타입을 내보내는 API가 하위 타입이 늘어날지 문서화해 사용자가 대응 방식을 고르게 하라고 권한다. 같은 가이드는 sealed 타입 switch에 `default`가 거의 필요 없고 대개 최선도 아니라고 본다. `default`를 두면 새 하위 타입이 조용히 그 분기로 흘러 재컴파일 때 받을 compile error도 사라진다.
- **경계 안에서 쓰기**: 함께 컴파일되는 한 모듈이나 애플리케이션 내부의 결과 타입과 상태 모델에서는 하위 타입 추가가 곧바로 compile error로 드러나 sealed의 장점이 크다. 다른 팀이나 외부 사용자가 따로 컴파일하는 경계에서 위 비용이 생긴다.

## 면접 체크포인트

- downcast에 runtime check가 필요한 이유와 패턴 매칭이 줄이는 중복
- type pattern과 pattern variable의 용어, 정식 도입 버전
- `&&`와 `||`에서 pattern variable 사용 가능 여부가 갈리는 이유
- negated `instanceof`와 early throw 뒤에서 pattern variable을 쓸 수 있는 이유
- pattern variable이 field를 가릴 때 생기는 버그
- sealed 타입에 하위 타입을 추가하는 변경이 binary compatible인데도 공개 API에서 major 변경으로 다뤄지는 이유

## 출처

- [Java SE 26 Language Specification, Scope of a Declaration](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.3)
- [Java SE 26 Language Specification, Shadowing](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.4.1)
- [Java SE 26 Language Specification, The instanceof Operator](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.20.2)
- [OpenJDK JEP 394, Pattern Matching for instanceof](https://openjdk.org/jeps/394)
- [OpenJDK JEP 441, Pattern Matching for switch](https://openjdk.org/jeps/441)
- [OpenJDK JEP 440, Record Patterns](https://openjdk.org/jeps/440)
- [OpenJDK JEP 409, Sealed Classes](https://openjdk.org/jeps/409)
- [Java SE 26 Language Specification, sealed Classes (Binary Compatibility)](https://docs.oracle.com/javase/specs/jls/se26/html/jls-13.html#jls-13.4.2.1)
- [Java SE 26 Language Specification, sealed and non-sealed Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-13.html#jls-13.5.2)
- [Java SE 26 Language Specification, Evolution of Enum Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-13.html#jls-13.4.26)
- [Java exhaustiveness guide — Inside Java](https://inside.java/2026/08/14/java-exhaustiveness-guide/)
- [Java sealed classes and exhaustive pattern matching — Neil Madden](https://neilmadden.blog/2026/04/24/java-sealed-classes-and-exhaustive-pattern-matching/)
- [Java sealed 타입의 함정 - 새 하위 타입이 기존 코드를 깨뜨릴 수 있다 — GeekNews](https://news.hada.io/topic?id=35598)
- 김영한 강사, [instanceof](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194718)
- 쉬운코드, [instanceof 패턴 매칭과 패턴 변수의 scope](https://www.youtube.com/watch?v=HYW3uCDk5Gw)

## 관련 문서

- [[Java-Language-Inheritance-and-Polymorphism|Java 상속과 다형성]]
- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Standard-Library-Object-and-Equality|Java Object와 동등성]]
- [[TS-Type-Narrowing|TypeScript 타입 좁히기]]
