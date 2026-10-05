---
tags: [cs, c, type, operator, control-flow, function, overflow, floating-point]
status: done
verified_at: 2026-10-05
category: "CS - C"
aliases: ["C Types, Control Flow and Functions", "C 자료형과 연산자", "C 제어 흐름", "C 함수 프로토타입", "C 정수 overflow와 부동소수점 오차"]
---

# C 자료형, 제어 흐름과 함수

C는 변수마다 타입을 선언하고, 타입이 크기, 표현 범위, 연산 규칙과 `printf` 형식 지정자를 결정한다. 표준은 최소 범위만 보장하고 실제 크기는 구현과 플랫폼 데이터 모델이 정하므로 크기는 외우지 말고 확인한다.

## 기본 자료형

| 타입 | 표준이 보장하는 것 | LP64의 흔한 크기(바이트) | `printf` |
|---|---|---|---|
| `char` | `sizeof(char) == 1`, 8비트 이상, 부호 여부는 구현 정의 | 1 | `%c` |
| `int` | 16비트 이상 | 4 | `%d`, `%i` |
| `long` | 32비트 이상 | 8 | `%ld`, `%li` |
| `long long` | 64비트 이상 | 8 | `%lld` |
| `float` | 지원하면 IEEE 754 binary32 | 4 | `%f` |
| `double` | 지원하면 IEEE 754 binary64 | 8 | `%f`, `%lf` |
| `bool` | C99 `_Bool`과 `<stdbool.h>`, C23부터 키워드 | 1 | `%d` |
| `size_t` | `sizeof`와 `strlen`의 결과 타입 | 8 | `%zu` |

- LP64는 64비트 Linux와 macOS의 데이터 모델이다. 64비트 Windows(LLP64)는 `long`이 4바이트라 같은 코드의 범위가 달라진다. 크기는 `sizeof`로, 범위는 `<limits.h>`의 `INT_MAX` 같은 상수로 확인한다.
- 문자열은 기본 타입이 아니라 `char` 배열이다. `string`은 교육용 라이브러리가 `char *`에 붙인 별칭일 뿐이다([[C-Arrays-and-Strings|C 배열과 문자열]]).
- 32비트 `int`는 2^32가지 값을 표현하고 signed 범위는 -2,147,483,648부터 2,147,483,647이다. 더 큰 합, 곱과 경우의 수는 `long long`으로 계산한다.
- C23부터 signed 정수 표현은 2의 보수만 허용된다. 이전 표준은 1의 보수와 부호와 크기 방식도 허용했다. 표현이 정해졌어도 signed overflow는 정의되지 않은 동작(UB)이다.
- 가변 인자 함수인 `printf`에 넘긴 `char`는 `int`로, `float`는 `double`로 승격되므로 `%c`와 `%f`가 그대로 동작한다. 지정자와 인자 타입이 맞지 않으면 UB다. 소수점 아래 기본 자릿수는 6이고 `%.2f`는 둘째 자리까지 반올림해 출력할 뿐 저장된 값을 바꾸지 않는다.
- 포인터의 `%p`와 `scanf` 쪽 지정자 차이는 [[C-Standard-IO-and-Files|C 표준 입출력과 파일]]에서 다룬다.

## 연산자

- `=`는 오른쪽 값을 왼쪽에 대입하고 `==`는 같은지 비교한다. `if (x = 5)`는 대입한 값 5가 참이라 언제나 실행된다.
- `counter = counter + 1`, `counter += 1`, `counter++`는 단독 문장에서 같은 효과다.
- 정수 나눗셈은 C99부터 0 쪽으로 버린다. `7 / 2`는 3, `-7 / 2`는 -3이다. 나머지는 `(a/b)*b + a%b == a`를 만족하도록 부호가 정해져 `-7 % 2`는 -1이다. 홀수를 `n % 2 == 1`로 판별하면 음수 홀수를 놓치므로 `n % 2 != 0`이나 짝수 검사 뒤 `else`를 쓴다.
- 0으로 나누기와 `INT_MIN / -1`은 UB다.
- `int`끼리의 연산 결과는 `int`다. 평균처럼 소수점이 필요하면 나누기 전에 바꾼다. 캐스트는 `/`보다 먼저 적용되므로 `(float) sum / length`는 실수 나눗셈이 되지만 `(float) (sum / length)`는 이미 버린 몫을 바꿀 뿐이다. 결과를 넓은 타입에 담아도 곱셈이 먼저 넘치는 문제는 [[Cpp-Coding-Test-Workflow#정수와 실수 계산|정수와 실수 계산]]과 같다.
- `&&`와 `||`는 단락 평가한다. 왼쪽만으로 결과가 정해지면 오른쪽을 평가하지 않고, 결과는 `int` 0 또는 1이다. `if (p != NULL && *p > 0)`처럼 앞 조건이 뒤 식의 안전을 보장하게 쓴다.
- 우선순위는 캐스트, 곱셈류, 덧셈류, 관계, 동등, `&&`, `||`, 대입 순으로 낮아진다. 헷갈리면 괄호를 쓴다.

## 제어 흐름

| 형태 | 조건 검사 시점 | 쓰임 |
|---|---|---|
| `if`, `else if`, `else` | 위에서부터 처음 참인 분기 하나 | 갈래 나누기 |
| `while (cond) { }` | 본문 전 | 횟수를 모르는 반복, `while (true)` 무한 루프 |
| `do { } while (cond);` | 본문 후, 최소 1번 실행 | 입력을 받은 뒤 검사하고 다시 묻기 |
| `for (init; cond; step) { }` | 본문 전 | 초기화, 조건, 갱신을 한 줄에 둔 횟수 반복 |

- 마지막 분기가 남은 모든 경우를 뜻하면 조건을 다시 묻지 않고 `else`로 둔다. 정수의 `x < y`, `x > y` 다음의 `x == y`가 그렇다. 비교를 한 번 줄이고, 조건을 잘못 적어 어떤 분기도 타지 않는 구멍을 막는다.
- `if (...)`, `while (...)`, `for (...)` 뒤에 `;`를 붙이면 빈 문장이 본문이 된다. `if (x < y);` 다음 블록은 조건과 무관하게 실행된다.
- C23 이전에는 `true`, `false`, `bool`을 쓰려면 `<stdbool.h>`가 필요하다.
- 반복 변수를 갱신하지 않으면 끝나지 않는다. 조건식은 매 반복 전에 다시 평가된다.
- 중첩 루프는 바깥이 행, 안쪽이 열을 만든다. n x n 격자를 그리면 안쪽 본문이 n²번 실행된다.

```c
int n;
do
{
    printf("Size: ");
    if (scanf("%d", &n) != 1)
    {
        return 1;  // 숫자가 아닌 입력이나 EOF
    }
}
while (n < 1);

for (int i = 0; i < n; i++)
{
    for (int j = 0; j < n; j++)
    {
        printf("#");
    }
    printf("\n");
}
```

## 함수

```c
#include <stdio.h>

void cough(int n);  // 프로토타입: 반환 타입, 이름, 매개변수

int main(void)
{
    cough(3);
}

void cough(int n)  // 정의
{
    for (int i = 0; i < n; i++)
    {
        printf("cough\n");
    }
}
```

- 이름 앞은 반환 타입, 괄호 안은 매개변수다. 돌려줄 값이 없으면 `void`, 받을 값이 없으면 `(void)`를 쓰고, 값을 돌려주는 함수는 `return 값;`으로 끝낸다.
- 식별자의 유효 범위는 선언자(declarator)가 끝난 직후, 초기화식보다 앞에서 시작한다. 함수 이름은 매개변수 목록이 끝나는 지점부터 보이므로 자기 본문에서 재귀 호출할 수 있지만 그보다 앞에 있는 `main`에서는 보이지 않는다. 그래서 `main` 뒤에 정의한 함수를 `main`에서 부르려면 앞에 프로토타입이 있어야 한다. 컴파일러가 위에서부터 읽는다는 설명보다 이 규칙이 정확하다. 프로토타입이 있으면 컴파일러가 인자 개수를 검사하고 인자를 매개변수 타입으로 변환한다. 헤더 파일은 이런 선언의 모음이다([[C-Build-and-Debugging#헤더와 라이브러리|헤더와 라이브러리]]).
- C23 이전에는 선언의 빈 괄호 `int g();`가 매개변수 정보를 주지 않는 비프로토타입 선언이다. `g(2)`처럼 개수가 틀린 호출도 컴파일되고 UB가 된다(Apple clang 21의 `-std=c17`은 경고만 낸다). C23부터 `()`는 `(void)`와 같아 같은 호출이 컴파일 오류가 된다. 매개변수가 없으면 `(void)`를 쓰는 편이 모든 판에서 안전하다.
- 인자는 값으로 복사돼 전달된다. 함수 안에서 매개변수를 바꿔도 호출자의 변수는 그대로이고, 원본을 바꾸려면 주소를 넘긴다([[C-Pointers-and-Dynamic-Memory#값 전달과 swap|값 전달과 swap]]). 배열 매개변수는 포인터로 조정되므로 길이를 함께 넘긴다.
- 함수로 묶으면 반복을 없애고 이름으로 의도를 드러낸다. 호출하는 쪽은 구현 대신 입력과 출력의 계약만 알면 된다.

## 변수의 범위, 수명과 상수

- 블록 안의 지역 변수는 자동 저장 기간이다. 초기화하지 않은 `int n;`은 값이 정해지지 않은(indeterminate) 상태라 쓰레기 값으로 보이며, 읽으면 UB가 될 수 있다. 읽기 전에 반드시 대입한다.
- 함수 밖(파일 범위) 변수는 정적 저장 기간이다. 프로그램 전체 동안 살아 있고 초기화하지 않으면 0이 된다. `static`을 붙이지 않으면 외부 링크라 다른 파일에서도 `extern` 선언으로 같은 객체를 쓴다. 숨은 공유 상태가 되므로 상수가 아니면 매개변수로 넘기는 편이 추적하기 쉽다.
- `const`는 값 변경을 막는 한정자이고 전역 여부와는 별개다. C에서 `const int N = 3;`은 정수 상수식이 아니어서 표준상 블록 안의 `int scores[N];`은 고정 배열이 아니라 VLA이고, 파일 범위의 `int a[N];`은 허용되지 않는다. Apple clang 21과 GCC 16은 이런 배열을 확장으로 상수 배열로 접기도 하지만(Clang은 경고, GCC는 `-pedantic`에서 경고, 둘 다 `-pedantic-errors`면 오류) 이식 가능한 코드는 이 동작에 기대지 않는다. 컴파일 시간 상수는 `#define N 3`, `enum { N = 3 };` 또는 C23의 `constexpr int N = 3;`로 만든다. C++의 `const int`와 다르다.
- 상수 이름은 관례상 대문자로 쓴다.

## 값의 범위와 정밀도

담을 수 있는 비트 수가 유한하므로 정수는 범위를 넘고 실수는 가장 가까운 근삿값으로 저장된다.

- 정수 overflow: unsigned 연산은 2^N으로 나눈 나머지로 감기도록 정의돼 있지만 signed overflow는 UB다. 1에서 시작해 2를 곱해 가는 `int` 루프는 `1073741824 * 2`에서 범위를 넘는다. 출력이 -2147483648로 감겨 보이는 것은 흔한 구현 결과일 뿐 보장이 아니고, 최적화가 overflow가 없다고 가정한 코드로 바꿀 수 있다. `-fsanitize=signed-integer-overflow`(UBSan)로 빌드하면 `runtime error: signed integer overflow: 1073741824 * 2 cannot be represented in type 'int'`처럼 실행 중에 알려 준다. 이 메시지는 언어가 아니라 계측 도구가 낸다. 비트 수준의 carry와 overflow 구분은 [[Digital-Fundamentals#캐리와 오버플로|캐리와 오버플로]]를 본다.
- 부동소수점 오차: `float`와 `double`은 2진 부동소수점이라 0.1처럼 2진수로 끝없이 이어지는 값을 정확히 담지 못한다. `float` 1을 10으로 나눈 값을 `%.50f`로 출력하면 `0.10000000149011611938476562500000000000000000000000`이 나온다. `double`은 비트를 더 써서 오차를 줄일 뿐 없애지 못한다(`0.1`은 `0.10000000000000000555...`). IEEE 754 환경에서 10진 텍스트로 왕복해도 보존되는 자릿수는 `FLT_DIG` 6, `DBL_DIG` 15다. 같음 비교와 금액 계산은 [[Cpp-Coding-Test-Workflow#정수와 실수 계산|허용 오차와 정수 단위]]로 다룬다.

### 범위를 넘은 사례

- Y2K: 연도를 끝 두 자리로 저장하면 99 다음의 00이 1900년인지 2000년인지 구분할 수 없다.
- 2038년 문제: 1970-01-01 UTC부터 센 초를 32비트 signed `time_t`로 담으면 2^31 - 1초인 2038-01-19 03:14:07 UTC가 마지막이다. Linux `time(2)`은 32비트 `time_t`로 빌드한 실행 파일을 64비트 커널에서 2038-01-19 03:14:08 UTC 이후에 실행하면 `EOVERFLOW`가 날 수 있다고 적는다. 타임스탬프 기준과 폭은 [[System-Time-and-Clock-Sync#타임스탬프의 기준은 시스템마다 다르다|시스템 시간]]에서 다룬다.
- Boeing 787: FAA AD 2015-09-07은 248일 동안 전원이 계속 켜져 있으면 발전기 제어 장치(GCU) 내부 소프트웨어 카운터가 overflow해 GCU가 동시에 failsafe 모드로 들어가고 모든 교류 전력을 잃을 수 있다며 주기적인 전원 차단 정비를 요구했다. 카운터가 100분의 1초 단위 signed 32비트라면 2^31 / 100초는 약 248.55일이라 수치가 맞지만, AD가 카운터의 단위와 폭을 밝힌 것은 아니다.
- 공통 교훈: 누적 시간, 개수, 날짜처럼 커지는 값의 상한을 설계할 때 계산해 타입 폭과 비교하고, 오래 켜 두는 시스템의 카운터와 시간 표현을 의심한다.

## 점검 질문

- `int`와 `long`의 크기를 데이터 모델(LP64, LLP64)로 설명할 수 있는가?
- `-7 / 2`, `-7 % 2`의 결과와 음수에서도 안전한 홀수 판별은?
- signed overflow와 unsigned wrap의 차이, UBSan 메시지는 누가 내는가?
- 프로토타입이 필요한 이유를 유효 범위와 인자 검사로 설명할 수 있는가?
- C에서 `const int`가 배열 크기 상수가 아닌 이유와 대안은?

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), C 기초](https://www.boostcourse.org/cs112/lecture/119004)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열](https://www.boostcourse.org/cs112/lecture/119005)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 조건문과 루프](https://www.boostcourse.org/cs112/lecture/119007)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 자료형, 형식 지정자, 연산자](https://www.boostcourse.org/cs112/lecture/119008)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 사용자 정의 함수, 중첩 루프](https://www.boostcourse.org/cs112/lecture/119009)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 하드웨어의 한계](https://www.boostcourse.org/cs112/lecture/119010)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 배열(1)](https://www.boostcourse.org/cs112/lecture/119014)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 배열(2)](https://www.boostcourse.org/cs112/lecture/119015)
- [cppreference, Arithmetic types](https://en.cppreference.com/w/c/language/arithmetic_types)
- [cppreference, printf, fprintf, sprintf, snprintf](https://en.cppreference.com/w/c/io/fprintf)
- [cppreference, Arithmetic operators](https://en.cppreference.com/w/c/language/operator_arithmetic)
- [cppreference, Logical operators](https://en.cppreference.com/w/c/language/operator_logical)
- [cppreference, C Operator Precedence](https://en.cppreference.com/w/c/language/operator_precedence)
- [cppreference, do-while loop](https://en.cppreference.com/w/c/language/do)
- [cppreference, Function declarations](https://en.cppreference.com/w/c/language/function_declaration)
- [cppreference, Scope](https://en.cppreference.com/w/c/language/scope)
- [cppreference, Initialization](https://en.cppreference.com/w/c/language/initialization)
- [cppreference, Storage-class specifiers](https://en.cppreference.com/w/c/language/storage_class_specifiers)
- [cppreference, Constant expressions](https://en.cppreference.com/w/c/language/constant_expression)
- [cppreference, Numeric limits](https://en.cppreference.com/w/c/types/limits)
- [Clang, UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Linux, time(2)](https://man7.org/linux/man-pages/man2/time.2.html)
- [Airworthiness Directives; The Boeing Company Airplanes (AD 2015-09-07) — Federal Register](https://www.govinfo.gov/content/pkg/FR-2015-05-01/html/2015-10066.htm)

## 관련 문서

- [[C언어(C)|C 인덱스]]
- [[C-Build-and-Debugging|C 빌드와 디버깅]]
- [[C-Arrays-and-Strings|C 배열과 문자열]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]
- [[Digital-Fundamentals|디지털 기초 (정수 표현)]]
- [[Cpp-Coding-Test-Workflow|C++ 코딩 테스트 워크플로 (정수와 실수 계산)]]
