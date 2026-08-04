---
tags: [java, syntax, primitive-type, array, control-flow, jvm]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Syntax and Types", "Java 문법과 타입"]
---

# Java 문법과 타입

Java는 소스를 바이트코드로 컴파일하고 JVM에서 실행하는 정적 타입 언어다. 입문 단계에서는 문법을 외우기보다 값의 타입, 평가 순서, 메모리 모델의 보장 범위를 구분하는 것이 중요하다.

## 역사와 실행 환경

- Java는 1990년대 Sun Microsystems의 James Gosling 팀이 Oak에서 발전시켰고 1995년에 공개됐다.
- 객체 지향 모델, GC, JVM을 통한 platform portability가 핵심 특성이다. 실제 이식성은 대상 환경에 맞는 JVM과 사용 API의 호환성까지 갖춰야 성립한다.
- JRE는 Java application 실행 환경을 가리키는 전통적 용어다. 현대 배포에서는 별도 JRE 설치만을 전제하지 않고 JDK를 사용하거나 `jlink`로 필요한 module만 담은 runtime image를 만들 수 있다.

## 소스에서 실행까지

```text
Main.java → javac → Main.class → JVM의 로딩, 검증, 실행
```

- JDK는 컴파일러 `javac`, 실행기 `java`, 표준 라이브러리와 개발 도구를 포함한다.
- `.class`에는 특정 CPU의 기계어가 아니라 JVM 바이트코드가 들어간다. JVM은 이를 해석하고 필요하면 JIT 컴파일한다.
- 2026-08-04 기준 최신 GA 기능 릴리스는 JDK 26이다. Java 8과 Eclipse는 강의 제작 당시의 예시일 뿐, 언어의 필수 전제는 아니다. 프로젝트가 요구하는 JDK와 원하는 IDE를 선택한다.
- `PATH`는 셸이 실행 파일을 찾는 경로이고, `JAVA_HOME`은 일부 빌드 도구가 JDK 위치를 찾을 때 사용한다.

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java");
    }
}
```

상세 실행 구조는 [[JVM-Architecture|JVM 아키텍처]], 메모리 회수는 [[JVM-GC|JVM GC]]에서 다룬다.

## 변수와 초기화

변수 선언은 이름에 타입을 부여하고, 대입은 값을 연결한다.

```java
int count = 3;
count = count + 1;
final int maxCount = 10;
```

- 지역 변수는 사용 전에 반드시 초기화되어야 한다. 컴파일러가 모든 경로에서 초기화를 증명하지 못하면 오류다.
- 필드와 배열 원소에는 타입별 기본값이 들어가지만, 기본값에 의존해 의도를 숨기지 않는다.
- `final` 변수는 한 번만 대입할 수 있다. 참조가 `final`이어도 참조 대상 객체까지 자동으로 불변이 되지는 않는다.
- 식별자는 의미가 드러나게 짓고, 동일 이름의 지역 변수와 필드가 겹칠 때는 `this.field`로 현재 객체의 필드를 명시한다.
- 정수 literal은 10진수 외에도 `0b1010`, `012`, `0xA`처럼 2진수, 8진수, 16진수로 쓸 수 있고 `_`로 자릿수를 구분할 수 있다.

## 기본 타입과 참조 타입

Java 언어 명세가 보장하는 기본 타입은 다음과 같다.

| 분류 | 타입 | 의미 |
|---|---|---|
| 정수 | `byte`, `short`, `int`, `long` | 각각 8, 16, 32, 64비트 부호 있는 2의 보수 정수 |
| 문자 | `char` | 16비트 부호 없는 UTF-16 코드 단위 |
| 실수 | `float`, `double` | 각각 IEEE 754 binary32, binary64 부동소수점 |
| 논리 | `boolean` | `true` 또는 `false` |

- 언어 명세는 `boolean`의 저장 크기를 1바이트로 규정하지 않는다.
- 클래스, 인터페이스, 배열 타입은 참조 타입이다. `String`도 클래스이므로 참조 타입이다.
- 참조 값은 객체 그 자체가 아니라 객체를 가리키는 값이다. 이를 반드시 원시 메모리 주소나 4바이트 값이라고 가정하면 안 된다. 표현 크기는 JVM 구현과 실행 설정의 영역이다.
- `null`은 어떤 객체도 가리키지 않는 참조 값이며 기본 타입에는 대입할 수 없다.
- `char` 하나가 항상 사용자가 보는 문자 하나를 뜻하지 않는다. 보조 문자는 surrogate pair가 필요하므로 Unicode 코드 포인트 API를 고려한다.
- `float`와 `double`은 이진 부동소수점이므로 `0.1` 같은 일부 10진 소수를 정확히 표현하지 못한다. 금액처럼 정확한 10진 계산은 `BigDecimal` 등 별도 표현을 검토한다.

## 타입 변환

- 확대 기본 변환은 보통 더 넓은 범위로 이동하며 암시적으로 허용되지만, `int`에서 `float`처럼 정밀도가 일부 손실될 수도 있다.
- 축소 기본 변환은 명시적 캐스트가 필요하며 값이 잘리거나 반올림될 수 있다.
- 형변환 가능 여부는 메모리 크기 비교가 아니라 Java 언어의 변환 규칙으로 판단한다.

```java
long widened = 42;       // int → long
int narrowed = (int) 3L; // long → int
```

## 리터럴, 특수 문자, 출력 형식

- 문자열과 문자 리터럴에서는 `\n`, `\t`, `\\`, `\"`, `\'` 같은 escape sequence를 사용한다.
- `//`는 한 줄 주석, `/* ... */`는 블록 주석, `/** ... */`는 문서화 주석이다.
- `System.out.printf`는 `%d`, `%f`, `%s`, `%c`, `%b`, `%n` 등의 변환을 사용한다. 외부 입력을 그대로 format 문자열로 사용하지 않는다.

## 연산자와 평가

- 산술 연산자는 `+`, `-`, `*`, `/`, `%`다. 정수 나눗셈은 소수부를 버리고, 정수를 0으로 나누면 `ArithmeticException`이 발생한다.
- `+=`, `-=`, `*=`, `/=` 같은 복합 대입은 계산과 대입을 결합한다. `==`, `!=`, `<`, `<=`, `>`, `>=`는 비교 결과로 boolean을 만든다.
- `++x`는 증가한 값을, `x++`는 증가 전 값을 식의 결과로 낸다. 부수 효과가 섞인 복잡한 식보다 별도 문장이 읽기 쉽다.
- `&&`, `||`는 단락 평가를 하고 `&`, `|`, `^`는 정수의 비트 연산에도 쓰인다.
- 조건 연산자 `condition ? whenTrue : whenFalse`는 두 값 중 하나를 선택한다. 중첩하면 읽기 어려우므로 단순한 식에만 쓴다.
- `==`는 기본 타입 값 또는 참조 동일성을 비교한다. 객체의 논리적 동등성은 보통 `equals`로 비교한다.
- 정수 오버플로는 자동으로 예외를 내지 않고 정해진 비트 폭에서 wraparound한다. 검사가 필요하면 `Math.addExact` 같은 API를 쓴다.

## 배열

배열은 같은 선언 타입의 원소를 고정된 길이로 담는 객체다.

```java
int[] scores = {90, 80, 70};
int first = scores[0];
int length = scores.length;
```

- 인덱스는 0부터 `length - 1`까지다. 범위를 벗어나면 `ArrayIndexOutOfBoundsException`이 발생한다.
- 배열 변수도 참조를 저장하므로 대입하면 원소를 복사하는 것이 아니라 같은 배열을 가리킬 수 있다. 독립 복사는 `clone`, `Arrays.copyOf`, `System.arraycopy` 등을 사용한다.
- 다차원 배열은 배열의 배열이다. 각 내부 배열의 길이가 달라도 되는 jagged array이며 2차원보다 높은 차원도 표현할 수 있다.
- 길이를 바꿔야 하면 새 배열을 만들거나 `ArrayList` 같은 컬렉션을 고려한다.

## 조건문과 반복문

- `if`, `else if`, `else`는 boolean 조건으로 분기한다.
- `switch` statement는 case별 흐름과 `break`를 주의한다. 현대 Java의 switch expression은 `case ... ->`와 `yield`로 값을 만들 수 있다.
- `for`는 횟수나 인덱스가 분명할 때, enhanced `for`는 전체 순회에, `while`은 조건 중심 반복에 적합하다.
- `do-while`은 body를 먼저 실행하므로 조건이 처음부터 false여도 한 번은 수행한다.
- `break`는 반복을 종료하고 `continue`는 다음 반복으로 넘어간다. 종료 조건이 상태 변화와 연결되는지 확인해 무한 반복을 막는다.

## TypeScript와 연결하기

| Java | TypeScript와 JavaScript |
|---|---|
| 기본 타입과 참조 타입을 런타임 모델에서도 구분 | 타입 표시는 주로 컴파일 시 제거되고 숫자는 런타임에서 대체로 JavaScript `number` |
| 배열 길이가 생성 후 고정 | 일반 배열은 동적으로 늘고 줄어듦 |
| 명목 타입 중심의 클래스 관계 | 구조가 호환되면 대입 가능한 structural typing 중심 |
| JVM 바이트코드를 JVM이 실행 | TypeScript를 JavaScript로 변환한 뒤 V8 같은 엔진이 실행 |

두 언어의 표기가 비슷해도 타입 보장과 런타임 표현은 다르다. NestJS 코드를 Java로 옮길 때 `number`를 무조건 `int`로 대응하지 말고 범위, 소수, 식별자 표현을 먼저 결정한다.

## 면접 체크포인트

- JDK, JVM, 바이트코드의 역할 차이
- 기본 타입과 참조 타입, `String`과 배열의 분류
- `boolean`과 참조 크기를 고정값으로 말할 수 없는 이유
- 확대와 축소 변환에서 정보 손실 가능성
- 배열 대입과 배열 복사의 차이, 다차원 배열의 실제 구조
- `==`와 `equals`, 단락 평가, 정수 오버플로

## 출처

- [Java SE 26 Language Specification](https://docs.oracle.com/javase/specs/jls/se26/html/)
- [JLS 4, Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
- [JLS 10, Arrays](https://docs.oracle.com/javase/specs/jls/se26/html/jls-10.html)
- [Oracle, JDK 26 Release Notes](https://www.oracle.com/java/technologies/javase/26all-relnotes.html)
- [jlink, Java SE 26 Tool Specifications](https://docs.oracle.com/en/java/javase/26/docs/specs/man/jlink.html)
- [TypeScript, Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript, Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- 인프런, [Java 프로그래밍이란?](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13675)
- 인프런, [Java 프로그램의 실행 구조](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13678)
- 인프런, [변수](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13679)
- 인프런, [기본자료형](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13680)
- 인프런, [특수 문자와 서식 문자](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13681)
- 인프런, [연산자](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13682)
- 인프런, [배열](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13683)
- 인프런, [배열과 메모리](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13684)
- 인프런, [조건문](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13685)
- 인프런, [반복문](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13686)

## 관련 문서

- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Language-Object-Model|Java 객체 모델]]
- [[JVM-Architecture|JVM 아키텍처]]
- [[Compile-and-Runtime|컴파일과 런타임]]
