---
tags: [cs, c, compile, linker, make, debugging]
status: done
verified_at: 2026-11-18
category: "CS - C"
aliases: ["C Build and Debugging", "C 빌드와 디버깅", "C 컴파일과 링크", "헤더와 라이브러리", "Rubber Duck Debugging", "고무 오리 디버깅"]
---

# C 빌드와 디버깅

C 소스 파일은 그대로 실행되지 않는다. `clang`이나 `gcc` 같은 컴파일러 드라이버가 전처리, 컴파일, 어셈블, 링크를 차례로 실행해 실행 파일을 만든다. 오류가 어느 단계에서 났는지 구분하면 원인의 범위가 바로 좁혀진다.

## 가장 작은 프로그램

```c
#include <stdio.h>

int main(void)
{
    printf("hello, world\n");
}
```

- `#include <stdio.h>`는 전처리기에게 그 자리에 헤더 내용을 붙이라는 지시다. 헤더에는 `printf`의 선언(프로토타입)이 있고, 구현은 C 표준 라이브러리에 있다.
- `main`은 호스트 환경에서 프로그램이 시작하는 함수다. C99부터는 `return` 없이 닫는 `}`에 도달하면 `return 0;`과 같고, 이 값이 종료 상태가 된다.
- `\n`은 줄바꿈을 나타내는 escape sequence이고 문장은 `;`로 끝난다. 소스 파일은 `.c`, 헤더는 `.h` 확장자를 쓴다.
- 문자열 리터럴 안에는 `"`, `\`, 줄바꿈을 그대로 쓸 수 없어 `\"`, `\\`, `\n` 같은 escape sequence로 적는다. `\r`은 커서를 현재 줄의 맨 앞으로 되돌린다. 문장은 줄이 아니라 `;`에서 끝나고, 인접한 리터럴 `"hello, " "world\n"`은 번역 단계 6에서 `"hello, world\n"` 하나로 이어지므로 긴 문자열은 이렇게 나눠 여러 줄에 쓴다. 리터럴 중간에서 줄을 바꾸면 Apple clang 21은 `missing terminating '"' character`를 알리고 뒤이은 오류와 함께 멈춘다(표준은 짝 없는 `"`를 정의되지 않은 동작으로 둔다).

## 소스에서 실행 파일까지

| 단계 | 하는 일 | 그 단계에서 멈추는 옵션 | 결과 |
|---|---|---|---|
| 전처리 | `#include` 펼치기, 매크로 치환, 조건부 컴파일 | `-E` | 전처리된 C 소스 |
| 컴파일 | 구문과 의미를 분석하고 어셈블리를 생성 | `-S` | `.s` |
| 어셈블 | 어셈블리를 기계어 object로 변환 | `-c` | `.o` |
| 링크 | 여러 object와 라이브러리의 심볼을 연결 | 없음 | 실행 파일 |

- 단계 옵션 없이 `clang hello.c`를 실행하면 링크까지 마치고, `-o`가 없으면 실행 파일 이름은 `a.out`이다. `clang -o hello hello.c`처럼 이름을 정하고 `./hello`로 현재 디렉터리의 파일을 실행한다.
- 명령 이름에 `/`가 없으면 셸은 내장 명령과 함수에서 찾지 못할 때 `PATH`의 디렉터리를 검색하고, 거기에도 없으면 종료 상태 127로 실패한다. 현재 디렉터리가 `PATH`에 없으면 `hello`만으로는 `command not found`가 나므로 `./hello`처럼 `/`가 든 경로로 실행한다([[Linux-File-System|Linux 상대 경로]]).
- 컴파일이라는 말은 이 전체 과정과 둘째 단계 하나를 모두 가리킨다. Clang의 둘째 단계는 AST를 LLVM IR로 바꾼 뒤 대상 기계의 코드를 만든다.
- 네 단계는 논리적 구분이고 실행되는 프로세스 수와는 다르다. Clang은 내장 어셈블러로 `.s` 파일 없이 object를 바로 만들 수 있고, 이를 기본으로 쓸지는 대상에 따라 다르다. Apple clang 21(arm64)에서 `clang -### hello.c`는 전처리부터 object 생성까지 맡은 `clang -cc1 ... -emit-obj` 한 번과 `ld` 한 번만 보여 줬다. 단계별 산출물은 `-save-temps`로 남긴다. 같은 환경에서 `hello.i`(전처리), `hello.bc`(LLVM IR), `hello.s`, `hello.o`가 생겼다.
- 만들어진 기계어는 대상 CPU의 명령어 집합과 OS 인터페이스를 전제로 하므로 다른 플랫폼에서는 그 대상으로 다시 빌드하거나 변환 계층을 쓴다([[Emulation-and-Compatibility-Layers|에뮬레이션과 호환 계층]]).
- 번역하면 소스의 정보가 사라진다. 주석은 실행 파일에 들어가지 않고 지역 변수 이름은 `-g`로 디버그 정보를 넣을 때만 남는다. 함수 이름은 심볼 표에 남지만 `strip`으로 지울 수 있고, 동적 링크로 가져올 `printf` 같은 외부 심볼은 지워지지 않는다. Apple clang 21의 `-O2`에서는 같은 일을 하는 `for` 루프와 `while` 루프가 같은 명령어가 됐고, `printf("meow\n")`는 `puts` 호출로, 올라가던 카운터는 내려가는 카운터로 바뀌었다. 디컴파일러가 내놓는 것은 원래 소스가 아니라 동작이 같은 소스의 추정이다([[Agent-Reverse-Engineering|에이전트 역공학]]).
- 번역 방식 전반(AOT, interpreter, JIT)은 [[Compile-and-Runtime|컴파일과 런타임]], 단계별 산출물은 [[Process-Lifecycle#컴파일 과정 (C언어)|프로세스 생명주기의 C 컴파일 과정]]에서 다룬다.

## 헤더와 라이브러리

헤더는 선언을, 라이브러리는 컴파일된 정의를 담는다. 무엇이 빠졌는지에 따라 컴파일 오류와 링크 오류로 실패하는 단계가 다르다.

| 빠진 것 | 실패 단계 | 증상 |
|---|---|---|
| 헤더(`#include`) | 컴파일 | 선언되지 않은 함수를 호출했다는 오류 |
| 라이브러리 지정(`-l`) | 링크 | 정의를 찾지 못했다는 링커 오류(undefined reference, undefined symbol) |

- C89는 선언 없이 호출한 함수를 `extern int f();`로 암시 선언했지만 C99에서 이 규칙이 사라졌다. GCC는 14부터 `-Wimplicit-function-declaration`을 C99 이후 방언에서 기본 오류로 다루고(13까지는 경고), Clang은 16부터 C99, C11, C17 모드에서 기본 오류로 바꿨다. Apple clang 21은 `<stdio.h>` 없이 `printf`를 부르면 `call to undeclared library function 'printf'`와 함께 헤더를 포함하라고 안내한다.
- 함수를 쓸 때 포함할 헤더는 man page SYNOPSIS의 `#include`로 확인한다. C 라이브러리 함수는 대부분 섹션 3(명령은 1, `read` 같은 시스템 호출 래퍼는 2)이라 `man 3 printf`로 연다. man-db 2.13.1의 기본 검색 순서는 1이 3보다 앞서 섹션 없이 `man printf`를 치면 셸 명령 printf(1)이 먼저 나올 수 있다. macOS에서도 `man -w printf`는 `man1/printf.1`을 가리켰다.
- `-l<name>`은 `lib<name>.a`나 `lib<name>.so` 같은 라이브러리를 찾는다. `clang -o hello hello.c -lcs50`은 `libcs50`을 함께 링크한다.
- 링커는 object와 라이브러리를 명령행에 적힌 순서대로 처리하므로 라이브러리는 그 심볼을 쓰는 소스나 object 뒤에 둔다.
- 표준 C 라이브러리는 드라이버가 링크 명령에 기본으로 넣는다(`-nolibc`, `-nostdlib`가 이를 뺀다). 다만 Linux의 glibc는 `sqrt` 같은 `<math.h>` 함수를 별도 수학 라이브러리(`libm`)에 두므로 `-lm`을 붙인다. 그 밖의 라이브러리는 설치한 뒤 `-l`로 지정해야 한다.

## make

Makefile이 없어도 GNU make는 내장 규칙 `%: %.c`로 `hello.c`에서 `hello`를 만든다. 규칙의 명령은 `$(CC) $(CFLAGS) $(CPPFLAGS) $(LDFLAGS) $(TARGET_ARCH) hello.c $(LOADLIBES) $(LDLIBS) -o hello`이고 기본 `CC`가 `cc`라서 `make hello`는 `cc hello.c -o hello`를 실행한다(GNU Make 3.81의 `make -p`, `make -n` 출력 기준).

```sh
make hello CC=clang CFLAGS='-g -Wall -Wextra' LDLIBS=-lcs50
```

- 변수로 컴파일러, 옵션과 라이브러리를 바꾼다. 실행 파일이 소스보다 새로우면 다시 빌드하지 않고 이미 최신(`is up to date`)이라고 알린다.
- 파일이 여러 개이고 의존 관계가 있으면 Makefile에 규칙을 적는다.

## 경고, 표준과 디버그 정보

- `-Wall -Wextra`로 경고를 켠다. GCC의 `-Wall`이 켜는 `-Wformat`은 `printf`, `scanf`의 인자 타입이 형식 문자열과 맞는지 검사한다.
- `-std=c17`처럼 표준을 지정해 VLA, `bool`, 빈 괄호 함수 선언처럼 판마다 다른 규칙을 고정한다([[C-Types-Control-Flow-and-Functions|C 자료형과 함수]]).
- `-g`는 디버그 정보를 넣고 `-O0`은 최적화를 끈다. 디버거로 한 줄씩 따라갈 빌드는 `-g -O0`이 소스와 실행 순서를 맞추기 쉽다.

## 디버깅

버그는 컴파일 오류, 실행 중 오류, 오류 없이 결과만 틀린 논리 오류로 나뉜다. 논리 오류는 도구가 알려 주지 않으므로 관찰이 필요하다.

1. 같은 입력으로 같은 실패가 나는 가장 작은 경우를 만든다.
2. 의심 변수를 출력해 기대와 처음 달라지는 지점을 찾는다. `#`를 10개 찍으려던 `for (int i = 0; i <= 10; i++)`는 `i`를 함께 출력하면 0부터 10까지 11번 도는 것이 보인다. n번 반복은 `i = 0; i < n`이다.
3. 출력으로 부족하면 디버거로 중단점(breakpoint)에서 멈추고 한 줄씩 진행하며 변수를 본다.

| 동작 | LLDB | GDB | VS Code |
|---|---|---|---|
| `main`에 중단점 | `b main` | `break main` | 줄 번호 왼쪽 여백 클릭, F9 |
| 실행 | `run` | `run` | F5 |
| 다음 중단점까지 계속 | `continue`(`c`) | `continue`(`c`) | Continue(F5) |
| 다음 줄, 호출한 함수 안으로 들어가지 않음 | `next` | `next` | Step Over(F10) |
| 호출한 함수 안으로 들어감 | `step` | `step` | Step Into(F11) |
| 현재 함수가 반환될 때까지 실행 | `finish` | `finish` | Step Out(Shift+F11) |
| 변수 값 보기 | `p n` | `p n` | VARIABLES 보기 |
| 호출 스택 보기 | `bt` | `bt` | CALL STACK 보기 |

- 멈춘 줄은 아직 실행되지 않았다. 그 줄에서 값을 받을 지역 변수는 쓰레기 값으로 보일 수 있고, 한 줄을 넘긴 뒤에야 바뀐다([[C-Types-Control-Flow-and-Functions#변수의 범위, 수명과 상수|초기화하지 않은 지역 변수]]). VS Code에서 C를 디버깅하려면 C/C++ 디버거 확장이 필요하다.

- 컴파일 오류는 `hello.c:5:29: error: expected ';' after expression`처럼 파일, 줄, 열과 메시지로 나오고, 캐럿(`^`)이 위치를 가리킨다. 고칠 내용이 분명하면 그 아래 fix-it 줄이 넣을 문자를 보여 준다. 원인 하나가 오류 여러 개를 만들기도 한다. Apple clang 21에서 `void meow(void)`를 프로토타입 없이 `main` 아래에 정의하고 부르면 호출 줄의 `call to undeclared function 'meow'`에 이어 정의 줄의 `conflicting types for 'meow'`가 나오지만 고칠 곳은 프로토타입 하나다. 그래서 첫 오류부터 고치고 다시 빌드한다.
- 범위 밖 접근, 누수와 정의되지 않은 동작은 sanitizer와 Valgrind로 찾는다([[C-Pointers-and-Dynamic-Memory#메모리 오류와 도구|C 메모리 오류와 도구]]).
- 고무 오리 디버깅(rubber duck debugging): 도구가 답을 주지 않을 때 코드를 한 줄씩 소리 내어 설명한다. 각 줄이 하는 일을 말로 옮기다 보면 머릿속 가정과 실제 코드가 갈라지는 지점이 드러난다. 듣는 쪽이 사람일 필요는 없다.
- AI 도우미에게는 오류 메시지의 뜻처럼 범위를 좁힌 질문을 한다. 코드를 통째로 붙여 무엇이 틀렸는지 묻는 일은 출력, 디버거와 고무 오리로 원인을 좁혀 본 뒤로 미룬다. 학습 중에는 답보다 원인을 좁히는 과정이 디버깅 감각을 만든다([[Expertise-Formation-AI|AI 시대 전문성 형성]]).

## 정확성과 스타일

- 정확성은 기대 출력과 비교하는 자동 검사로 확인하고 변경할 때마다 다시 실행한다. 여러 사람이 나눠 고치는 코드에서 한 사람의 변경이 다른 부분을 깨뜨리지 않았는지 확인하는 장치다([[Test-Pyramid|테스트 피라미드]]).
- 공백, 들여쓰기, 중괄호 위치는 실행 결과를 바꾸지 않지만 읽는 비용을 바꾼다. 팀 규칙을 `.clang-format`에 적고 `clang-format -i --style=file`로 적용하면 같은 논쟁을 리뷰마다 반복하지 않는다([[Beautiful-Code|관습과 팀 규칙]], [[Function-Structure-and-Contracts|formatter와 linter]]).

## 점검 질문

- 헤더가 빠졌을 때와 라이브러리가 빠졌을 때 실패 단계와 메시지가 왜 다른가?
- `make hello`가 Makefile 없이 동작하는 이유와 `CC`, `CFLAGS`, `LDLIBS`의 역할은?
- `i <= n` 루프가 n+1번 도는 off-by-one을 출력이나 디버거로 확인할 수 있는가?
- 디버거의 `next`와 `step`은 무엇이 다른가?
- `hello`만 치면 실행되지 않고 `./hello`는 실행되는 이유는?
- 오류 메시지가 여러 개일 때 첫 오류부터 고치는 이유는?
- 실행 파일에서 원래 소스를 그대로 되살릴 수 없는 이유는?

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), C 기초](https://www.boostcourse.org/cs112/lecture/119004)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 문자열](https://www.boostcourse.org/cs112/lecture/119005)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 컴파일링](https://www.boostcourse.org/cs112/lecture/119011)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 디버깅](https://www.boostcourse.org/cs112/lecture/119012)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 코드의 디자인](https://www.boostcourse.org/cs112/lecture/119013)
- [YouTube, Harvard CS50 (2026), Lecture 1: C](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=7060s)
- [YouTube, Harvard CS50 (2026), Lecture 2: Arrays](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=16078s)
- [Clang, clang command guide](https://clang.llvm.org/docs/CommandGuide/clang.html)
- [Clang 16.0.0 Release Notes — LLVM](https://releases.llvm.org/16.0.0/tools/clang/docs/ReleaseNotes.html)
- [Porting to GCC 14 — GCC](https://gcc.gnu.org/gcc-14/porting_to.html)
- [GCC, Options Controlling the Kind of Output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)
- [GCC, Options for Linking](https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html)
- [Linux, sqrt(3)](https://man7.org/linux/man-pages/man3/sqrt.3.html)
- [Linux, man-pages(7)](https://man7.org/linux/man-pages/man7/man-pages.7.html) — man-pages 6.19의 섹션 구분
- [man-db, man(1)](https://man7.org/linux/man-pages/man1/man.1.html) — man-db 2.13.1의 기본 섹션 검색 순서
- [GCC, Options to Request or Suppress Warnings](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html)
- [cppreference, Other operators (function call)](https://en.cppreference.com/w/c/language/operator_other)
- [cppreference, Main function](https://en.cppreference.com/w/c/language/main_function)
- [cppreference, String literals](https://en.cppreference.com/w/c/language/string_literal)
- [cppreference, Escape sequences](https://en.cppreference.com/w/c/language/escape)
- [WG14, N3220 ISO/IEC 9899:2024 working draft](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf) — 2026-11-18 5.1.1.2 번역 단계 6, 5.2.3 문자 표시 의미, 6.4 짝 없는 따옴표, 6.4.5 문자열 리터럴 대조
- [LLDB, GDB to LLDB command map](https://lldb.llvm.org/use/map.html)
- [GDB, Continuing and Stepping](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Continuing-and-Stepping.html)
- [Visual Studio Code, Debug code with Visual Studio Code](https://code.visualstudio.com/docs/debugtest/debugging)
- [Clang, ClangFormat](https://clang.llvm.org/docs/ClangFormat.html)
- [Clang, Expressive Diagnostics](https://clang.llvm.org/diagnostics.html)
- [POSIX.1-2024, Shell Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_09_01_04)

## 관련 문서

- [[C언어(C)|C 인덱스]]
- [[C-Types-Control-Flow-and-Functions|C 자료형, 제어 흐름과 함수]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]
- [[Compile-and-Runtime|컴파일과 런타임]]
- [[Process-Lifecycle|프로세스 생명주기]]
- [[Test-Pyramid|테스트 피라미드]]
- [[Linux-File-System|Linux 파일 시스템 (상대 경로와 파일 명령)]]
- [[Emulation-and-Compatibility-Layers|에뮬레이션과 호환 계층]]
- [[Agent-Reverse-Engineering|에이전트 역공학과 실행 하네스]]
- [[Expertise-Formation-AI|AI 시대 전문성 형성]]
