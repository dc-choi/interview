---
tags: [java, syntax, primitive-type, array, control-flow, jvm, scope, format]
status: done
verified_at: 2026-09-30
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
- 2026-09-30 기준 최신 GA 기능 릴리스는 2026-09-15에 나온 JDK 27이다. 이 문서의 명세 링크는 Java SE 26 기준이다. Java 8과 Eclipse는 강의 제작 당시의 예시일 뿐, 언어의 필수 전제는 아니다. 프로젝트가 요구하는 JDK와 원하는 IDE를 선택한다.
- `PATH`는 셸이 실행 파일을 찾는 경로이고, `JAVA_HOME`은 일부 빌드 도구가 JDK 위치를 찾을 때 사용한다.

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java");
    }
}
```

상세 실행 구조는 [[JVM-Architecture|JVM 아키텍처]], 메모리 회수는 [[JVM-GC|JVM GC]]에서 다룬다. main 선언의 static 규칙과 JDK 25의 instance main은 [[Java-Language-Class-Members-and-Memory|클래스 멤버와 메모리 모델]]에서 다룬다.

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
- 지역 변수의 scope는 선언 지점부터 그 선언이 속한 block의 끝까지다. 그 안에서는 중첩 block, lambda parameter, catch parameter로도 같은 이름을 다시 선언할 수 없어, 바깥에 `int x`가 있으면 `{ int x = 3; }`과 `x -> x + 1`은 `variable x is already defined` 컴파일 오류다. lambda는 local class와 달리 바깥 block과 같은 이름 수준에서 동작해 바깥 지역 변수를 가릴 수 없다. scope가 끝난 뒤에는 연달아 쓴 두 `for (int k = 0; ...)`처럼 같은 이름을 다시 쓸 수 있다(JLS 6.3, 6.4).
- 재선언 금지는 지역 변수끼리에만 적용된다. 지역 변수가 필드를 가리는 것과 메서드 안의 local class나 anonymous class가 바깥 지역 변수 이름을 다시 선언하는 것은 허용된다. 필드까지 막으면 상위 클래스에 필드가 추가될 때마다 하위 클래스의 지역 변수 이름을 바꿔야 하기 때문이다. 가려진 바깥 이름에 접근하는 방법은 [[Java-Standard-Library-Nested-and-Local-Classes|중첩 클래스와 지역 클래스]]에서 다룬다.
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

## 타입 변환과 연산자

확대와 축소 변환, 이항 숫자 승격, 정수 나눗셈과 나머지의 부호, 복합 대입의 암시적 축소, 오버플로, 단락 평가와 `==`는 [[Java-Language-Syntax-and-Types-Operators|Java 연산자와 숫자 연산]]에서 다룬다. 출발점은 산술 결과의 타입을 피연산자 타입이 정하고, 결과를 담을 변수의 타입은 계산에 관여하지 않는다는 규칙이다.

## 리터럴, 특수 문자, 출력 형식

- 문자열과 문자 리터럴에서는 `\n`, `\t`, `\\`, `\"`, `\'` 같은 escape sequence를 사용한다.
- `//`는 한 줄 주석, `/* ... */`는 블록 주석, `/** ... */`는 문서화 주석이다.
- `System.out.printf`, `String.format`, `"...".formatted(...)`는 같은 `java.util.Formatter` 문법을 쓴다. printf는 개행을 붙이지 않으므로 줄바꿈은 platform line separator를 내는 `%n`으로 넣는다. 외부 입력을 그대로 format 문자열로 사용하지 않는다.

지정자는 `%[argument_index$][flags][width][.precision]conversion` 형태다.

| 지정자 | 의미 | 예 |
|---|---|---|
| `%d`, `%o`, `%x`, `%X` | 10진, 8진, 16진 정수. 음수는 2의 보수 비트를 부호 없는 값으로 보여 준다 | -1을 `%x`로 쓰면 `ffffffff`, 8을 `%o`로 쓰면 `10` |
| `%5d`, `%-5d`, `%05d` | 최소 폭 5. 기본은 오른쪽 정렬, `-`는 왼쪽 정렬, `0`은 0 채움 | 42가 `[   42]`, `[42   ]`, `00042` |
| `%,d` | locale의 자릿수 구분 기호 | ko_KR, en_US에서 `1,234,567` |
| `%f`, `%.2f` | 기본 정밀도 6. `.n`은 자르기가 아니라 HALF_UP 반올림 | 3.14가 `3.140000`, 0.125가 `0.13` |
| `%s`, `%-10s`, `%c`, `%b` | 문자열, 문자, boolean. 문자열도 폭으로 열을 맞춘다 | `[abc       ]` |

- `%f` 반올림은 `Double.toString`이 내는 10진 자릿수를 기준으로 한다. 그래서 이진 값이 1.00499...인 `1.005`도 `%.2f`에서는 `1.01`이지만 `new BigDecimal(1.005).setScale(2, RoundingMode.HALF_UP)`은 `1.00`이다. 금액처럼 반올림 규칙이 계약인 값은 `BigDecimal`로 먼저 확정한 뒤 표시한다.
- 자릿수 구분 기호와 소수점 문자는 기본 FORMAT locale을 따른다. `String.format(Locale.GERMANY, "%,.2f", 1234567.891)`은 `1.234.567,89`다. 로그, 파일, protocol처럼 기계가 읽는 출력은 `Locale.ROOT` 등으로 locale을 고정한다.
- 서식 검사는 컴파일이 아니라 실행 시점에 일어난다. `%d`에 `double`을 넘기면 `IllegalFormatConversionException`, 인자가 모자라면 `MissingFormatArgumentException`이다. `printf("%d %d%n", 1)`은 `1 `까지 출력한 뒤 예외를 던져 부분 출력이 남는다.

## 배열

배열은 같은 선언 타입의 원소를 고정된 길이로 담는 객체다.

```java
int[] scores = {90, 80, 70};
int first = scores[0];
int length = scores.length;
```

- 인덱스는 0부터 `length - 1`까지다. 범위를 벗어나면 `ArrayIndexOutOfBoundsException`이 발생한다.
- 배열 변수도 참조를 저장하므로 대입하면 원소를 복사하는 것이 아니라 같은 배열을 가리킬 수 있다. `clone`, `Arrays.copyOf`, `System.arraycopy`는 새 배열을 만들지만 배열 슬롯에 든 값만 복사한다. 기본 타입 배열은 원소 값까지 독립되지만, 참조 타입 배열은 같은 원소 객체를 공유하는 얕은 복사다.
- 다차원 배열은 배열의 배열이다. 각 내부 배열의 길이가 달라도 되는 jagged array이며 2차원보다 높은 차원도 표현할 수 있다. 바깥 배열의 슬롯은 행 배열의 참조라서 `grid.clone()`과 `Arrays.copyOf(grid, grid.length)`는 행을 공유한다. 사본에 `copy[0][0] = 99`를 쓰면 원본도 바뀌고 `grid[0] == copy[0]`은 `true`다(JLS 10.7). 행까지 독립시키려면 `Arrays.stream(grid).map(int[]::clone).toArray(int[][]::new)`처럼 행마다 복사하고, 원소가 가변 객체이면 그 객체의 복사 방식도 정한다([[Defensive-Copy-Depth-Collections|복사 깊이]]).
- 길이를 바꿔야 하면 새 배열을 만들거나 `ArrayList` 같은 컬렉션을 고려한다. `Arrays.copyOf(arr, newLength)`는 새 길이가 짧으면 뒤를 자르고 길면 기본값(0, false, null)으로 채운다. `Arrays.copyOf(new int[]{1, 2}, 4)`는 `[1, 2, 0, 0]`이다.
- `System.out.println(intArray)`는 원소 대신 `[I@543588e6`처럼 런타임 타입 이름과 identity hash를 출력한다([[Java-Standard-Library-Object-and-Equality|Object와 동등성]]의 toString 절). 1차원 배열은 `Arrays.toString`, 중첩 배열은 `Arrays.deepToString`으로 출력한다. `Arrays.toString(grid)`는 `[[I@..., [I@...]`처럼 행 참조만 보여 준다. 원소 비교도 `Arrays.equals`와 중첩 배열용 `Arrays.deepEquals`로 한다.

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
| 같은 메서드의 중첩 block에서도 바깥 지역 변수 이름을 다시 선언할 수 없음 | `let`, `const`는 같은 scope 재선언만 막고 안쪽 block의 같은 이름 선언(shadowing)은 허용 |

두 언어의 표기가 비슷해도 타입 보장과 런타임 표현은 다르다. NestJS 코드를 Java로 옮길 때 `number`를 무조건 `int`로 대응하지 말고 범위, 소수, 식별자 표현을 먼저 결정한다. 안쪽 block에서 바깥 이름을 다시 선언한 TypeScript 코드는 Java에서 이름을 바꿔야 컴파일된다.

## 면접 체크포인트

- JDK, JVM, 바이트코드의 역할 차이
- 기본 타입과 참조 타입, `String`과 배열의 분류
- `boolean`과 참조 크기를 고정값으로 말할 수 없는 이유
- 지역 변수 scope와 같은 이름 재선언이 막히는 범위
- 배열 대입과 배열 복사의 차이, 다차원 배열 복사가 행을 공유하는 이유
- `%.2f`의 반올림 기준과 locale이 출력에 주는 영향
- 숫자 승격, 복합 대입과 정수 오버플로([[Java-Language-Syntax-and-Types-Operators|연산자와 숫자 연산]])

## 출처

- [Java SE 26 Language Specification](https://docs.oracle.com/javase/specs/jls/se26/html/)
- [JLS 4, Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
- [JLS 5.2, Assignment Contexts](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html#jls-5.2)
- [JLS 6.3, Scope of a Declaration](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.3)
- [JLS 6.4, Shadowing and Obscuring](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.4)
- [JLS 10, Arrays](https://docs.oracle.com/javase/specs/jls/se26/html/jls-10.html)
- [Formatter, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Formatter.html)
- [Arrays, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Arrays.html)
- [Oracle, JDK 26 Release Notes](https://www.oracle.com/java/technologies/javase/26all-relnotes.html)
- [OpenJDK, JDK 27](https://openjdk.org/projects/jdk/27/)
- [jlink, Java SE 26 Tool Specifications](https://docs.oracle.com/en/java/javase/26/docs/specs/man/jlink.html)
- [TypeScript, Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript, Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [TypeScript, Variable Declarations](https://www.typescriptlang.org/docs/handbook/variable-declarations.html)
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

- [[Java-Language-Syntax-and-Types-Operators|Java 연산자와 숫자 연산]]
- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Language-Object-Model|Java 객체 모델]]
- [[JVM-Architecture|JVM 아키텍처]]
- [[Compile-and-Runtime|컴파일과 런타임]]
