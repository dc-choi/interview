---
tags: [cs, c, pointer, memory, malloc, free, valgrind, sanitizer]
status: done
verified_at: 2026-10-05
category: "CS - C"
aliases: ["C Pointers and Dynamic Memory", "C 포인터와 동적 메모리", "C 포인터", "malloc과 free", "메모리 누수", "Pass by Value in C"]
---

# C 포인터와 동적 메모리

변수는 메모리의 어떤 위치(주소)에 놓인 바이트다. 포인터는 그 주소를 값으로 담는 변수이고, C는 주소를 직접 다루게 해 주는 대신 객체의 수명과 범위 검사를 프로그래머에게 맡긴다.

## 주소와 역참조

```c
int n = 50;
int *p = &n;                 // p에 n의 주소를 담는다
printf("%p\n", (void *) p);  // 0x7ffe00b3adbc 같은 주소
printf("%i\n", *p);          // 50
*p = 51;                     // n이 51이 된다
```

- `&n`은 n의 주소, `*p`는 p가 가리키는 객체다. `*&n`은 n 자체다.
- 주소는 보통 16진수로 표기한다. 16진수 한 자리가 4비트, 두 자리가 1바이트라 바이트 경계가 보인다([[Digital-Fundamentals#진법과 변환|진법과 변환]]).
- `%p`는 `void *`를 기대하므로 다른 객체 포인터는 `(void *)`로 바꿔 넘긴다.
- `int *p`의 `*`는 타입이 아니라 선언자에 붙는다. `int *p, q;`의 q는 `int`다. 같은 기호가 선언에서는 포인터 타입을, 식에서는 역참조를 뜻한다.
- 포인터 크기는 구현이 정한다. 64비트 Linux, macOS(LP64)와 64비트 Windows(LLP64)에서는 8바이트다.
- 아무것도 가리키지 않는 포인터는 `NULL`이다. NULL 역참조는 UB이고 흔히 segmentation fault로 끝나지만 보장은 아니다. 초기화하지 않은 포인터는 정해지지 않은 주소를 담고 있어 더 위험하다.

## 포인터 산술

- `p + 1`은 1바이트가 아니라 `sizeof *p`바이트 뒤의 다음 원소를 가리킨다. `a[i]`는 정의상 `*(a + i)`다.
- `char *s = "EMMA";`이면 `*(s + 1)`은 `'M'`이고, `&s[0]`, `&s[1]`처럼 이웃 문자의 주소는 1씩 커진다.
- 산술 결과는 같은 배열 안이나 마지막 원소 바로 다음(one past the end)까지만 정의된다. 그 밖을 가리키는 계산은 역참조하지 않아도 UB다. 같은 배열을 가리키는 두 포인터의 차는 원소 수이고 타입은 `ptrdiff_t`다.

## 문자열 비교와 복사

문자열 변수(`char *`)에는 문자들이 아니라 첫 문자의 주소가 들어 있다.

- `s == t`는 주소 비교다. 내용이 같아도 다른 버퍼에 있으면 거짓이다. 내용 비교는 `strcmp(s, t) == 0`이다. `strcmp`는 처음 다른 문자 쌍을 `unsigned char`로 본 차이의 부호로, 사전순으로 앞이면 음수, 같으면 0, 뒤면 양수를 돌려준다.
- `char *t = s;`는 주소만 복사한다(얕은 복사). t와 s가 같은 버퍼를 가리키므로 `t[0]`을 바꾸면 s로 읽어도 바뀌어 있다. s가 리터럴을 가리키면 그 수정 자체가 UB다.
- 내용을 따로 가지려면 새 공간을 할당해 NUL까지 복사한다(깊은 복사).

```c
char *t = malloc(strlen(s) + 1);  // NUL 자리 1바이트 포함
if (t == NULL)
{
    return 1;
}
strcpy(t, s);                     // NUL까지 복사
t[0] = toupper((unsigned char) t[0]);
printf("%s %s\n", s, t);          // emma Emma
free(t);
```

- `+ 1`을 빠뜨리면 NUL이 할당 범위 밖에 쓰인다. 직접 루프로 복사하면 `i <= n`(또는 `i < n + 1`)까지 돌아 NUL을 포함한다.
- `strcpy`는 대상 크기를 검사하지 않는다. 대상이 작거나 두 문자열이 겹치면 UB다.
- `strdup(s)`는 `malloc`으로 할당한 사본을 돌려준다. POSIX에 있던 함수가 C23에 표준으로 들어왔고, 실패하면 NULL이며 결과는 `free`해야 한다.

## 값 전달과 swap

C의 인자 전달은 모두 값 전달이다. 호출할 때 인자 값이 매개변수로 복사된다.

```c
void swap(int *a, int *b)
{
    int tmp = *a;
    *a = *b;
    *b = tmp;
}
// 호출: swap(&x, &y);
```

- `void swap(int a, int b)`는 매개변수 a, b(복사본)만 바꾼다. 호출자의 x, y와 a, b는 서로 다른 객체라 x, y는 그대로다.
- 주소를 넘기면 호출된 함수가 그 주소의 객체를 바꿀 수 있다. `scanf("%d", &x)`가 `&`를 요구하는 이유도 같다.
- 포인터 자체도 값으로 복사된다. 함수 안에서 `a = &other;`로 바꿔도 호출자의 포인터는 그대로이고, 호출자의 포인터를 바꾸려면 `int **`처럼 포인터의 주소를 넘긴다.
- C++ 참조와의 비교는 [[Cpp-Language-Memory-and-STL#함수 인자: 값 복사와 참조|C++ 값 복사와 참조]]를 본다.

## 저장 기간과 메모리 영역

| 저장 기간 | 대상 | 수명 | 흔한 배치 |
|---|---|---|---|
| 자동(automatic) | 지역 변수, 매개변수 | 블록 진입부터 탈출까지 | 스택 |
| 정적(static) | 파일 범위 변수, `static` 변수 | 프로그램 전체, `main` 전에 한 번 초기화 | 데이터 영역 |
| 할당(allocated) | `malloc` 등이 만든 객체 | `free`할 때까지 | 힙 |
| 스레드(thread) | `_Thread_local` 변수 | 스레드 수명 | 스레드마다 별도 |

- C 표준은 영역 이름이 아니라 저장 기간을 정의한다. 기계어, 전역, 힙, 스택으로 나누는 배치와 성장 방향은 OS와 ABI의 구현이다([[Stack-vs-Heap|스택 vs 힙]], [[Concurrency-and-Process-Overview#프로세스메모리구조(상세)|프로세스 메모리 구조]]).
- 함수가 끝난 뒤에도 써야 하는 데이터를 지역 변수에 두고 그 주소를 반환하면 수명이 끝난 객체를 가리키게 된다. 호출 뒤에도 살아야 하면 할당 저장 기간을 쓰고 해제 책임을 정한다.

## 동적 할당: malloc과 free

```c
int *x = malloc(10 * sizeof(int));  // int 10개, 4바이트 int면 40바이트
if (x == NULL)
{
    return 1;
}
x[9] = 0;  // 마지막 원소의 index는 9
free(x);
```

- `malloc`(`<stdlib.h>`)은 초기화되지 않은 공간의 시작 주소를, 실패하면 NULL을 돌려준다. C에서는 `void *`가 다른 객체 포인터로 자동 변환되므로 캐스트가 필요 없다. 0으로 채운 공간이 필요하면 `calloc(n, size)`를 쓴다. 배열을 키우는 `realloc`과 연결 리스트 같은 node 구조는 [[Data-Structures-in-C|C로 구현하는 자료구조]]에서 다룬다.
- Linux는 기본적으로 낙관적 할당을 하므로 `malloc`이 NULL이 아닌 값을 돌려줘도 실제 메모리가 보장되지는 않는다. 메모리가 고갈되면 OOM killer가 프로세스를 종료할 수 있다.
- `malloc(0)`의 결과는 구현 정의다.
- `free(p)`에는 할당 함수가 돌려준 포인터를 한 번만 넘긴다. NULL을 넘기면 아무 일도 하지 않는다. 같은 포인터를 두 번 해제하거나, 해제한 뒤 접근하거나, 할당 함수가 주지 않은 포인터를 해제하면 UB다. 해제 뒤 `p = NULL;`로 두면 실수로 다시 쓰는 경로가 줄어든다.
- `malloc`이 매번 시스템 콜을 하지는 않는다. 할당기와 커널의 관계는 [[Stack-vs-Heap#사용자 공간 할당기와 커널 할당|사용자 공간 할당기와 커널 할당]]에 있다.

## 메모리 오류와 도구

| 오류 | 예 | 결과 |
|---|---|---|
| 범위 밖 쓰기(버퍼 오버플로) | 40바이트 블록에 `x[10] = 0` | 이웃 데이터 손상, 함수 포인터 덮어쓰기 같은 보안 취약점 |
| 메모리 누수 | 마지막 포인터를 잃고 `free`하지 않음 | 프로세스가 끝날 때까지 재사용 불가, 오래 실행되는 프로세스에서 누적 |
| 해제 후 사용, 이중 해제 | `free(x)` 뒤 `x[0]` 접근, 두 번 `free` | UB |
| 초기화 안 된 값 사용 | `malloc` 직후 원소를 읽음 | 실행마다 다른 결과 |

- 누수는 해제하지 않은 블록이 쓰레기 값으로 변하는 것이 아니라 할당된 채로 남아 재사용되지 못하는 상태다. 프로세스가 끝나면 그 주소 공간이 통째로 사라지므로 문제는 서버나 데몬처럼 오래 실행되거나 같은 경로를 반복하는 프로그램에서 커진다.
- Valgrind Memcheck: `-g`와 `-O0` 또는 `-O1`로 빌드하고 `valgrind --leak-check=yes ./prog`로 실행한다. 표의 첫 두 오류를 함께 가진 함수는 `Invalid write of size 4`, `Address ... is 0 bytes after a block of size 40 alloc'd`와 `40 bytes in 1 blocks are definitely lost`를 보고한다. definitely lost는 가리키는 포인터가 하나도 남지 않은 블록이다.
- AddressSanitizer: `-fsanitize=address -g -O1 -fno-omit-frame-pointer`로 빌드한다. 힙, 스택, 전역 범위 밖 접근, use-after-free, double free 등을 잡고 보통 2배 정도 느려진다. 누수 탐지는 Linux에서 기본으로 켜진다. LLVM 문서는 macOS에서 `ASAN_OPTIONS=detect_leaks=1`로 켤 수 있다고 하지만, Apple clang 21(arm64)로 빌드한 실행 파일은 이 옵션에 `detect_leaks is not supported on this platform`을 출력하고 누수를 보고하지 않는다.
- 두 도구는 실행된 경로만 검사한다. 오류 보고가 없다는 사실이 다른 입력에서도 안전하다는 증거는 아니다.

## 점검 질문

- `int *p, q;`에서 q의 타입은?
- `s == t`가 내용 비교가 아닌 이유와 `strcmp` 반환값의 의미는?
- `t = s`와 `malloc(strlen(s) + 1)` 뒤 `strcpy`의 차이, `+ 1`이 필요한 이유는?
- `swap(int a, int b)`가 실패하는 이유를 저장 기간과 값 전달로 설명할 수 있는가?
- 누수, 범위 밖 쓰기, use-after-free를 각각 어떤 도구 출력으로 알아보는가?

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 메모리 주소](https://www.boostcourse.org/cs112/lecture/119027)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 포인터](https://www.boostcourse.org/cs112/lecture/119028)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열](https://www.boostcourse.org/cs112/lecture/119029)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열 비교](https://www.boostcourse.org/cs112/lecture/119030)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열 복사](https://www.boostcourse.org/cs112/lecture/119031)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 메모리 할당과 해제](https://www.boostcourse.org/cs112/lecture/119032)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 메모리 교환, 스택, 힙](https://www.boostcourse.org/cs112/lecture/119033)
- [cppreference, Pointer declaration](https://en.cppreference.com/w/c/language/pointer)
- [cppreference, Member access operators](https://en.cppreference.com/w/c/language/operator_member_access)
- [cppreference, Arithmetic operators (pointer arithmetic)](https://en.cppreference.com/w/c/language/operator_arithmetic)
- [cppreference, Storage-class specifiers](https://en.cppreference.com/w/c/language/storage_class_specifiers)
- [cppreference, strcmp](https://en.cppreference.com/w/c/string/byte/strcmp)
- [cppreference, strcpy](https://en.cppreference.com/w/c/string/byte/strcpy)
- [cppreference, strdup](https://en.cppreference.com/w/c/string/byte/strdup)
- [cppreference, malloc](https://en.cppreference.com/w/c/memory/malloc)
- [cppreference, calloc](https://en.cppreference.com/w/c/memory/calloc)
- [cppreference, free](https://en.cppreference.com/w/c/memory/free)
- [Linux, malloc(3)](https://man7.org/linux/man-pages/man3/malloc.3.html)
- [Valgrind, Quick Start Guide](https://valgrind.org/docs/manual/quick-start.html)
- [Valgrind, Memcheck: a memory error detector](https://valgrind.org/docs/manual/mc-manual.html)
- [Clang, AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
- [MITRE CWE, CWE-122: Heap-based Buffer Overflow](https://cwe.mitre.org/data/definitions/122.html)

## 관련 문서

- [[C언어(C)|C 인덱스]]
- [[C-Arrays-and-Strings|C 배열과 문자열]]
- [[C-Standard-IO-and-Files|C 표준 입출력과 파일]]
- [[C-Build-and-Debugging|C 빌드와 디버깅]]
- [[Stack-vs-Heap|스택 vs 힙]]
- [[Cpp-Language-Memory-and-STL|C++ 값과 메모리]]
- [[Data-Structures-in-C|C로 구현하는 자료구조]]
- [[Linear-Data-Structures|선형 자료구조]]
