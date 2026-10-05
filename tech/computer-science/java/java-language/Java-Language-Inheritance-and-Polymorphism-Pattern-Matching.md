---
tags: [java, instanceof, pattern-matching, downcast, casting, scope]
status: done
verified_at: 2026-10-05
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java instanceof Pattern Matching", "Java downcast와 instanceof 패턴 매칭"]
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

## 면접 체크포인트

- downcast에 runtime check가 필요한 이유와 패턴 매칭이 줄이는 중복
- type pattern과 pattern variable의 용어, 정식 도입 버전
- `&&`와 `||`에서 pattern variable 사용 가능 여부가 갈리는 이유
- negated `instanceof`와 early throw 뒤에서 pattern variable을 쓸 수 있는 이유
- pattern variable이 field를 가릴 때 생기는 버그

## 출처

- [Java SE 26 Language Specification, Scope of a Declaration](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.3)
- [Java SE 26 Language Specification, Shadowing](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.4.1)
- [Java SE 26 Language Specification, The instanceof Operator](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.20.2)
- [OpenJDK JEP 394, Pattern Matching for instanceof](https://openjdk.org/jeps/394)
- [OpenJDK JEP 441, Pattern Matching for switch](https://openjdk.org/jeps/441)
- [OpenJDK JEP 440, Record Patterns](https://openjdk.org/jeps/440)
- 김영한 강사, [instanceof](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194718)
- 쉬운코드, [instanceof 패턴 매칭과 패턴 변수의 scope](https://www.youtube.com/watch?v=HYW3uCDk5Gw)

## 관련 문서

- [[Java-Language-Inheritance-and-Polymorphism|Java 상속과 다형성]]
- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Standard-Library-Object-and-Equality|Java Object와 동등성]]
- [[TS-Type-Narrowing|TypeScript 타입 좁히기]]
