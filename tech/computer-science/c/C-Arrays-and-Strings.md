---
tags: [cs, c, array, string, null-terminator, command-line]
status: done
verified_at: 2026-10-05
category: "CS - C"
aliases: ["C Arrays and Strings", "C 배열과 문자열", "널 종단 문자열", "Null-terminated String", "argc argv", "명령행 인자"]
---

# C 배열과 문자열

배열은 같은 타입의 값을 메모리에 연속으로 놓고 index로 접근하는 구조다. C 문자열은 별도 타입이 아니라 NUL 문자(`'\0'`)로 끝나는 `char` 배열이며, 문자열 함수는 모두 이 약속에 기대어 동작한다.

## 배열

```c
int scores[3];
scores[0] = 72;
scores[1] = 73;
scores[2] = 33;
```

- `int` 3개가 연속으로 놓이고 index는 0부터 2까지다. `scores[i]`는 정의상 `*(scores + i)`와 같다.
- 실행 중 범위 검사가 없다. `scores[3]`처럼 범위 밖에 접근하면 UB이고, 오류 없이 이웃 데이터를 읽거나 덮어쓸 수 있다.
- 배열은 `a = b`로 대입해 복사할 수 없다. 원소별로 복사하거나 `memcpy`를 쓴다.
- `sizeof scores`는 배열 전체 바이트 수이고 `sizeof scores / sizeof scores[0]`이 원소 개수다. 배열이 포인터로 바뀐 뒤에는 이 계산이 성립하지 않는다.
- 값이 여러 개라는 이유로 `score1`, `score2`, `score3` 변수를 따로 두면 개수가 바뀔 때마다 코드를 고쳐야 한다. 배열과 반복문을 쓰면 개수는 값 하나로 바뀐다.

### 크기 정하기와 VLA

- 컴파일 시간에 고정할 크기는 `#define N 3`이나 `enum` 상수로 둔다. C에서 `const int` 변수는 상수식이 아니다([[C-Types-Control-Flow-and-Functions#변수의 범위, 수명과 상수|변수의 범위, 수명과 상수]]).
- 실행 중 값으로 `int scores[n];`을 선언하면 가변 길이 배열(VLA)이다. C99에서 필수였고 C11부터 선택 기능(`__STDC_NO_VLA__`)이 됐으며 C23도 자동 저장 기간의 VLA는 선택으로 둔다. VLA에는 `{0}` 같은 초기화 목록을 붙일 수 없고, C23부터 빈 초기화 `= {}`만 허용된다.
- VLA는 선언이 실행될 때 자동 저장 기간으로 잡히므로 보통 스택에 놓인다. 입력이 크면 스택 한도를 넘을 수 있으니 크기가 외부 입력에 달려 있으면 `malloc`으로 할당하고 실패를 검사한다([[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]).
- C++ 표준에는 VLA가 없다. C++ 코드에서는 `std::vector`를 쓴다([[Cpp-Coding-Test-Workflow#로컬 환경과 채점 환경의 차이|C++의 VLA 확장]]).

## 배열을 함수에 넘기기

함수 매개변수 `int array[]`는 `int *array`로 조정된다. 함수는 첫 원소의 주소만 받으므로 함수 안에서 `sizeof array`는 포인터 크기이고 길이를 알 수 없다. 길이를 별도 인자로 받는다.

```c
float average(int length, const int array[])
{
    int sum = 0;
    for (int i = 0; i < length; i++)
    {
        sum += array[i];
    }
    return (float) sum / length;  // length가 0이면 호출 전에 막는다
}
```

- 원본 배열의 주소가 넘어가므로 함수가 원소를 바꾸면 호출자 배열이 바뀐다. 읽기만 하면 `const`로 의도를 드러낸다.
- 정수 합을 그대로 나누면 소수점이 버려진다(178 / 3은 59). 나누기 전에 실수로 바꾼다.

## 문자열은 NUL로 끝나는 char 배열

`"HI!"`는 메모리에 `H`, `I`, `!`, `\0` 4바이트로 놓인다. 문자열 길이는 첫 NUL 앞까지의 문자 수(3)이고 저장에는 NUL 몫 1바이트가 더 든다.

- 배열은 자기 길이를 들고 다니지 않으므로 끝을 표시할 약속이 필요하다. `printf`의 `%s`, `strlen`, `strcmp`는 모두 NUL을 만날 때까지 진행한다. NUL이 없는 배열을 넘기면 배열 밖까지 읽는 UB다.
- `char *s = "EMMA";`의 `s`는 프로그램 내내 존재하는 문자열 리터럴 배열의 첫 문자를 가리킨다. 리터럴을 수정하면 UB이고 읽기 전용 메모리에 놓일 수 있으므로 `const char *s = "EMMA";`로 선언해 수정 시도를 컴파일러가 막게 한다.
- `char s[] = "EMMA";`는 리터럴 내용을 복사한 수정 가능한 5바이트 배열이다.
- 같은 내용의 리터럴이 같은 주소를 공유할지는 정해져 있지 않다.
- 교육용 라이브러리의 `string`은 `typedef char *string;`이다. 문자열 자체가 아니라 첫 문자의 주소를 담는 포인터이고, 이 사실이 비교와 복사의 함정을 만든다([[C-Pointers-and-Dynamic-Memory#문자열 비교와 복사|문자열 비교와 복사]]).

### 문자열 배열과 2차원 배열

```c
const char *names[] = {"EMMA", "RODRIGO"};
printf("%c\n", names[0][1]);  // M
```

- `names`는 포인터 배열이다. `names[0][1]`은 첫 포인터가 가리키는 문자열의 두 번째 문자다. 각 문자열의 위치는 서로 독립이며 연속 배치가 보장되지 않는다. `sizeof names`는 포인터 개수에 포인터 크기를 곱한 값이다(LP64에서 2 x 8 = 16).
- `char grid[4][8]`은 진짜 2차원 배열이다. 32바이트가 행 순서로 연속하고 행 폭은 8로 고정된다.
- 두 형태 모두 `x[i][j]`로 접근하지만 메모리 구조, 크기와 수정 가능 여부가 다르다.

## 순회와 길이

```c
for (int i = 0; s[i] != '\0'; i++)           // NUL을 만날 때까지
for (size_t i = 0, n = strlen(s); i < n; i++)  // 길이를 한 번만 센다
for (size_t i = 0; i < strlen(s); i++)       // 피한다: 반복마다 다시 센다
```

- `strlen`은 첫 NUL 앞까지의 문자 수를 `size_t`로 돌려준다. 앞에서부터 세므로 길이에 비례하는 비용이 든다. NUL 검사 루프보다 본질적으로 빠른 것은 아니다.
- `for` 조건식은 매 반복 전에 평가되므로 조건에 `strlen(s)`를 두면, 최적화가 꺼내 주지 않는 한 길이 n 문자열에서 O(n²)이 된다.
- `size_t`는 unsigned다. 빈 문자열에서 `strlen(s) - 1`은 -1이 아니라 매우 큰 값으로 감긴다.

## 문자 분류와 변환

- 문자 상수는 정수 값이고 문자 비교는 문자 코드 비교다. ASCII에서 `'a'`는 97, `'A'`는 65라 대소문자 차이는 32(`0x20`)다([[Digital-Fundamentals#문자 인코딩|문자 인코딩]]).
- C 표준이 값의 연속성을 보장하는 문자는 `'0'`부터 `'9'`까지의 숫자뿐이다. `c - '0'`은 어느 구현에서나 숫자 값을 주지만 `c >= 'a' && c <= 'z'`와 `c - 32`는 ASCII 계열 문자 집합을 가정한다.
- `<ctype.h>`의 `islower`, `isupper`, `isdigit`, `toupper`, `tolower`를 쓴다. `toupper`는 현재 locale 규칙으로 바꾸고, 바꿀 대문자가 없으면 인자를 그대로 돌려준다.
- 이 함수들은 인자가 `unsigned char`로 표현할 수 없고 `EOF`도 아니면 UB다. `char`가 signed인 구현에서 128 이상의 바이트는 음수가 되므로 `(unsigned char)`로 바꿔 넘긴다.

```c
for (size_t i = 0, n = strlen(s); i < n; i++)
{
    printf("%c", toupper((unsigned char) s[i]));
}
```

## 명령행 인자

```c
int main(int argc, char *argv[])
{
    if (argc != 2)
    {
        fprintf(stderr, "Usage: ./hello name\n");
        return 1;
    }
    printf("hello, %s\n", argv[1]);
}
```

- `argc`는 0 이상의 인자 개수, `argv`는 문자열 포인터 배열이다. 크기는 최소 `argc + 1`이고 `argv[argc]`는 NULL이다.
- `argc`가 0보다 크면 `argv[0]`은 프로그램 이름이고, 환경이 이름을 주지 못하면 빈 문자열이다. `argc`가 0이면 `argv[0]`은 NULL이라 확인 없이 `%s`로 출력하면 안 된다. 사용자 인자는 `argv[1]`부터다.
- 인자는 언제나 문자열로 들어온다. 숫자가 필요하면 `strtol` 같은 변환 함수로 바꾸고 실패를 검사한다.
- `argv`의 문자열은 프로그램이 수정할 수 있고, 수정은 호스트 환경으로 돌아가지 않는다.
- 명령행 인자를 받으면 대화형 입력 없이 스크립트와 파이프라인에서 같은 프로그램을 자동으로 실행할 수 있다. 파일 이름을 받아 내용을 검사하는 예는 [[C-Standard-IO-and-Files#파일 읽기와 매직 넘버|파일 읽기와 매직 넘버]]에 있다.

## 점검 질문

- `int a[3]`에서 `a[3]` 접근이 오류 없이 지나갈 수 있는 이유는?
- 배열 매개변수에서 `sizeof`가 길이를 주지 않는 이유와 대안은?
- `char *s = "EMMA"`와 `char s[] = "EMMA"`의 차이는?
- `const char *names[]`와 `char grid[4][8]`의 메모리 구조 차이는?
- `i < strlen(s)` 조건이 느린 이유와 `toupper`에 `unsigned char`를 넘기는 이유는?

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 배열(1)](https://www.boostcourse.org/cs112/lecture/119014)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 배열(2)](https://www.boostcourse.org/cs112/lecture/119015)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열과 배열](https://www.boostcourse.org/cs112/lecture/119016)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열의 활용](https://www.boostcourse.org/cs112/lecture/119017)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 명령행 인자](https://www.boostcourse.org/cs112/lecture/119018)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열](https://www.boostcourse.org/cs112/lecture/119029)
- [cppreference, Array declaration](https://en.cppreference.com/w/c/language/array)
- [cppreference, Array initialization](https://en.cppreference.com/w/c/language/array_initialization)
- [cppreference, Member access operators (subscript)](https://en.cppreference.com/w/c/language/operator_member_access)
- [cppreference, String literals](https://en.cppreference.com/w/c/language/string_literal)
- [cppreference, strlen](https://en.cppreference.com/w/c/string/byte/strlen)
- [cppreference, toupper](https://en.cppreference.com/w/c/string/byte/toupper)
- [cppreference, Character sets and encodings](https://en.cppreference.com/w/c/language/charset)
- [cppreference, Main function](https://en.cppreference.com/w/c/language/main_function)
- [cs50.h — libcs50](https://github.com/cs50/libcs50/blob/main/src/cs50.h)

## 관련 문서

- [[C언어(C)|C 인덱스]]
- [[C-Types-Control-Flow-and-Functions|C 자료형, 제어 흐름과 함수]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]
- [[C-Standard-IO-and-Files|C 표준 입출력과 파일]]
- [[Cpp-Language-Memory-and-STL|C++ 값과 메모리 (array-to-pointer conversion)]]
- [[Linear-Data-Structures|선형 자료구조]]
