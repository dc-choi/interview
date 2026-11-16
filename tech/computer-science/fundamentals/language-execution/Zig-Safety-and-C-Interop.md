---
tags: [zig, c, systems-programming, memory-safety, error-handling]
status: done
verified_at: 2026-11-16
category: "CS - 기초"
aliases: ["Zig Safety and C Interop", "Zig와 C", "Zig 안전 장치", "errdefer", "Why Zig over C"]
---

# Zig: C 수준 제어에 더한 안전 장치와 C 연동

Zig는 가비지 컬렉터와 런타임 없이 C처럼 메모리를 직접 다루는 시스템 언어다. C에서 정의되지 않은 동작(UB)이 되는 오류 상당수를 빌드 모드에 따라 실행 중 검사하고, 오류 처리와 자원 정리를 문법으로 다룬다. 이 문서는 Zig 0.17 언어 레퍼런스와 릴리스 노트(2026-11-16 확인) 기준으로 C와 다른 지점과 남는 경계를 정리한다. 다른 메모리 관리 방식은 [[Rust-Ownership-and-Borrowing|Rust 소유권과 대여]], C의 메모리 오류와 탐지 도구는 [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]에 있다.

## C의 관례와 Zig의 장치

| 문제 | C의 관례 | Zig의 장치 |
|---|---|---|
| 실패 경로의 자원 정리 | `goto` 레이블로 정리 코드를 함수 끝에 모은다. 할당과 정리가 멀어지고 레이블 순서를 손으로 맞춘다 | `errdefer`를 할당 바로 아래에 둔다. 함수가 오류로 블록을 떠날 때만 실행되고, `defer`와 함께 선언의 역순으로 실행된다 |
| 오류 보고 | `-1`, `NULL`, `errno`, 반환 코드. 호출자가 확인하지 않아도 컴파일된다 | 오류가 반환 타입(error union)에 들어간다. 쓰지 않은 값은 컴파일 오류이므로 `try`, `catch`, `if`로 처리한다. 오류가 날 수 없다고 단언할 때는 `catch unreachable`을 쓰며, 단언이 틀리면 debug와 safe에서는 패닉하고 fast와 small에서는 Illegal Behavior다 |
| 범위 밖 접근 | 경고 없이 이웃 메모리를 읽을 수 있다 | 배열과 슬라이스 인덱스를 검사해 안전 검사가 켜진 모드에서 패닉한다 |
| 정수 넘침 | 부호 있는 정수 넘침은 UB | `+`, `-`의 넘침은 Illegal Behavior이고 안전 검사가 켜진 모드(debug, safe)에서 패닉한다. 감싸는 연산은 `+%`, 포화 연산은 `+\|`로 따로 적는다 |
| 조건부 컴파일과 매크로 | 전처리기. `MAX(a, b)` 같은 매크로는 인자를 두 번 평가할 수 있다 | `comptime`으로 컴파일 시점에 코드를 실행한다. `builtin.os.tag`에 따른 분기 중 해당하지 않는 쪽은 버린다. 제네릭은 타입을 받아 타입을 돌려주는 함수다 |

한 글의 시연에서 `{1, 2, 3}`을 더하는 C 함수의 반복 조건을 `<=`로 잘못 쓰자 `-Wall -Wextra`로 빌드해도 경고 없이 `sum = 7`을 출력하고 정상 종료했고, 같은 실수를 한 Zig 코드는 `index out of bounds: index 3, len 3`으로 멈췄다. 정리 코드를 할당 옆에 두는 `errdefer` 예는 다음과 같다(언어 레퍼런스 예제를 줄였다).

```zig
fn createFoo(param: i32) !Foo {
    const foo = try tryToAllocateFoo();
    errdefer deallocateFoo(foo); // 이 함수가 오류를 반환할 때만 실행된다
    if (param > 1337) return error.InvalidParam;
    return foo; // 성공하면 errdefer는 실행되지 않는다
}
```

## 빌드 모드가 안전 검사를 정한다

| 모드 | 최적화 | 안전 검사 |
|---|---|---|
| `debug` (기본) | 끔 | 켬 |
| `safe` | 켬 | 켬 |
| `fast` | 켬 | 끔 |
| `small` | 크기 최적화 | 끔 |

안전 검사가 꺼진 모드에서는 검사 대상이던 Illegal Behavior도 C의 UB처럼 무엇이든 일으킬 수 있다. 블록 단위로 `@setRuntimeSafety`를 써서 모드 기본값을 바꿀 수 있다. 범위와 넘침 검사는 언어가 모든 빌드에 보장하는 성질이 아니라 빌드 설정에 달린 실행 중 검사다. 배포 빌드를 `fast`나 `small`로 내면 그 경로의 보호도 함께 빠진다.

## 할당자를 인자로 받는다

Zig에는 C의 `malloc`, `free` 같은 기본 할당자가 없다. 할당이 필요한 함수와 자료구조는 관례에 따라 할당자(`Allocator`)를 인자로 받는다. 그래서 호출자가 아레나, 고정 버퍼나 테스트용 할당자로 바꿔 끼울 수 있다.

- `std.testing.allocator`로 할당하면 기본 테스트 러너가 해제하지 않은 메모리를 할당 위치의 스택과 함께 보고한다.
- `std.testing.FailingAllocator`로 할당 실패를 일으켜 `error.OutOfMemory` 경로가 맞게 처리되는지 시험한다.
- C에서 같은 검사를 하려면 `malloc` 래퍼를 만들거나 Valgrind, AddressSanitizer 같은 외부 도구를 쓴다.

## C 코드와 함께 빌드한다

`zig cc`는 Clang 기반 C 컴파일러로 쓸 수 있다(0.17은 Clang 22.1.8 기반). 앞의 글은 `zig cc -target x86_64-linux-musl`로 정적 Linux 실행 파일을 만드는 교차 컴파일을 시연한다. 빌드 시스템의 `addCSourceFile`로 C 파일을 Zig 모듈과 함께 빌드할 수 있어 기존 C 코드를 파일 단위로 옮길 수 있다.

0.17은 0.16에서 폐기를 예고한 `@cImport`를 제거했다. C 헤더 변환은 `zig translate-c` CLI나, Zig Software Foundation의 translate-c 패키지를 명시적 의존성으로 받아 빌드 스크립트에서 쓴다. 이 패키지는 Zig 도구 체인과 별도의 릴리스 주기를 갖는다.

## 남는 경계

- 포인터가 가리키는 메모리가 사라진 뒤 접근하지 않도록 하는 일은 프로그래머 책임이다. 해제 뒤 사용과 사라진 스택 변수를 가리키는 포인터를 언어가 막지 않는다. 함수 문서에 반환 포인터의 소유자를 적는 관례로 보완한다.
- 1.0 이전이라 언어가 계속 바뀐다. 0.17 릴리스 노트는 1.0 태그 전에 언어 안정화가 필요하다고 적고, `@bitCast` 재정의가 컴파일 오류 없이 기존 코드를 깨뜨릴 수 있다고 경고한다. 앞의 글 저자는 0.17에 맞추느라 자기 책의 Zig 파일 152개 중 35개를 고쳤다고 밝혔다(저자 보고).
- 도구, 책, 숙련자와 칩 지원 범위는 C가 넓다. 벤더 C 컴파일러만 있는 마이크로컨트롤러에서는 선택지가 없다는 것이 그 글의 지적이다.
- 대규모 Zig 코드베이스를 다른 언어로 옮긴 사례는 [[Agent-Language-Port|에이전트로 하는 대규모 언어 이전]]에 있다. Bun은 JavaScript GC가 관리하는 메모리와 직접 관리하는 메모리가 섞이는 지점의 안정성 문제를 이유로 Zig에서 Rust로 옮겼다.

## 확인 질문

- `errdefer`와 `defer`는 각각 어떤 반환 경로에서 실행되는가?
- `fast` 모드로 배포한 Zig 프로그램이 배열 범위 밖을 읽으면 무엇이 보장되는가?
- C 함수의 반환 코드를 무시하는 것과 Zig의 error union을 무시하는 것은 컴파일러에서 어떻게 다른가?
- 할당자를 인자로 받는 관례가 누수 시험과 할당 실패 시험을 어떻게 쉽게 만드는가?

## 출처

- [Zig 0.17.0 Language Reference](https://ziglang.org/documentation/0.17.0/) — 2026-11-16 최적화 모드와 안전 검사, Illegal Behavior, `errdefer`와 `defer` 순서, 쓰지 않은 값의 컴파일 오류, 감싸기와 포화 연산자, 할당자 관례, 누수 보고, `FailingAllocator`, 포인터 수명 책임, C 소스 빌드 대조
- [Zig 0.17.0 Release Notes](https://ziglang.org/download/0.17.0/release-notes.html) — `@cImport` 제거와 translate-c 패키지 이전, `zig cc`의 Clang 버전, 언어 안정화와 `@bitCast` 경고
- [Why Zig Over C for Systems Programming — Mihalis Tsoukalos](https://www.mtsoukalos.eu/2026/11/why-zig-over-c-for-systems-programming/) — 2026-11 게시. C와 Zig 비교 구성, 범위 밖 읽기와 교차 컴파일 시연, 저자의 이전 비용 보고. 저자는 macOS에서 Zig 0.17과 clang으로 예제를 실행했다
- [시스템 프로그래밍에서 C보다 Zig를 선택하는 이유 — GeekNews](https://news.hada.io/topic?id=37123)

## 관련 문서

- [[CS-Language-Execution|언어와 실행]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]] — C의 메모리 오류와 Valgrind, AddressSanitizer
- [[C-Build-and-Debugging|C 빌드와 디버깅]]
- [[Rust-Ownership-and-Borrowing|Rust 소유권과 대여]] — 컴파일 시점 검사로 해제 시점을 정하는 방식
- [[Agent-Language-Port|에이전트로 하는 대규모 언어 이전]] — Bun의 Zig에서 Rust로의 이전
- [[Version-Upgrade-Difficulty|버전 업그레이드의 난이도 구조]] — 언어 공급자의 호환성 정책
