---
tags: [rust, ownership, borrowing, memory-safety, error-handling, allocator, cargo]
status: done
verified_at: 2026-11-16
category: "CS - 기초"
aliases: ["Rust Ownership and Borrowing", "Rust 소유권과 대여", "소유권 규칙", "borrow checker", "대여 검사기", "never type", "never 타입", "DropGuard"]
---

# Rust 소유권과 대여

Rust는 가비지 컬렉터 없이 메모리 안전성을 얻기 위해 값의 소유자를 하나로 정하고, 그 규칙을 컴파일 시점에 검사한다. 이 문서는 Python, JavaScript나 Go를 아는 사람이 Rust 코드를 처음 읽을 때 필요한 소유권, 대여, 값의 부재와 오류 표현, 빌드 프로파일을 2026-11-16 The Rust Programming Language와 Cargo 문서, Rust 1.100 발표 기준으로 정리한다. `unsafe` 경계와 건전성 결함은 [[Rust-Soundness-and-Lifetime-Boundaries|Rust 건전성과 수명 계약]]에서 다룬다.

## 메모리를 관리하는 세 방식

| 방식 | 대표 언어 | 해제 시점을 정하는 주체 | 치르는 비용 |
|---|---|---|---|
| 수동 관리 | C | 프로그래머가 할당과 해제를 직접 호출 | 해제 누락은 누수, 이중 해제는 힙 손상 |
| 가비지 컬렉션 | JavaScript, Go | 런타임이 쓰지 않는 객체를 찾아 회수 | 추가 메모리와 회수 작업의 실행 시간 |
| 소유권 | Rust | 컴파일러가 소유자의 스코프 끝에 해제 코드를 넣음 | 규칙을 어긴 코드는 컴파일되지 않음 |

이 표는 입문용의 거친 구분이며 언어 이름과 비용 칸은 공식 문서로 대조한 범위가 아니다. CPython은 참조 카운트에 순환 수집을 더한 방식이라 가비지 컬렉션 행에 그대로 넣지 않았다. 언어별 설계 목적과 메모리 관리 방식의 넓은 비교는 [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]에 있다.

## 값이 놓이는 곳

크기가 고정된 값은 스택에 놓인다. `i32` 같은 정수가 그렇다. 실행 중에 크기가 바뀌는 `String`은 내용 바이트를 힙에 두고, 스택에는 힙 버퍼를 가리키는 포인터, 길이, 용량 세 값을 둔다. 늘어나는 배열인 `Vec`도 같은 구조다. 64비트 대상에서는 세 값이 각각 8바이트라 스택 쪽이 24바이트가 된다(계산값이며 대조한 공식 문서 구간에는 이 수치가 없다).

힙 버퍼를 어디서 받을지는 할당자가 정한다. Rust 1.100(2026-11-12)에서 `std::alloc::Allocator` 트레이트와 `Vec::new_in`, `Vec::with_capacity_in`, `Box::new_in` 같은 생성자가 안정화돼 값마다 할당자를 지정할 수 있다. 1.100 발표 기준으로 표준 타입 가운데 `Vec`과 `Box`에서만 쓸 수 있고, 다른 컬렉션과 포인터 타입으로 넓히는 일은 남아 있다.

## 소유권 세 규칙과 이동

1. 모든 값에는 소유자가 있다.
2. 소유자는 한 번에 하나뿐이다.
3. 소유자가 스코프를 벗어나면 값이 해제(drop)된다.

```rust
let x = 5;
let y = x;            // 정수는 Copy라 복사된다. x와 y 모두 쓸 수 있다.

let s1 = String::from("hello");
let s2 = s1;          // 힙 버퍼는 복사하지 않고 소유권이 s2로 이동한다.
// println!("{s1}");  // error[E0382]: borrow of moved value: `s1`
```

- 정수처럼 `Copy` 트레이트를 구현한 타입은 대입할 때 복사된다. `String`은 대입하면 이동하고 원래 변수는 무효가 된다. 힙 메모리의 소유자가 하나라서 해제도 한 번만 일어난다.
- `clone`은 힙 데이터까지 복사한다. 공식 문서는 `clone` 호출을 비용이 클 수 있는 코드가 실행된다는 표시로 읽으라고 설명한다. Rust가 자동으로 깊은 복사를 하는 일은 없다.
- 컴파일 오류를 없애려고 `clone`을 곳곳에 넣으면 읽기만 필요한 자리에서도 힙 할당과 복사를 치른다. 읽기만 하면 되는 자리는 아래의 대여로 푼다.

스코프를 벗어날 때 정리 코드가 실행된다는 규칙은 실패 때의 되돌리기에도 쓴다. 1.100에서 안정화된 `DropGuard`(`core::mem`, `std::mem`)는 값과 클로저를 받고, 가드가 버려질 때 그 클로저로 값을 정리한다. `Deref`와 `DerefMut`를 구현해 안의 값을 그대로 쓸 수 있다. `?`로 조기 반환하면 클로저가 실행되고, 성공 경로에서 `DropGuard::dismiss`를 부르면 클로저를 실행하지 않고 값을 돌려받는다. `dismiss`는 안쪽 타입의 메서드와 이름이 부딪히지 않도록 메서드가 아닌 연관 함수다.

```rust
use std::mem::DropGuard;

fn parse_all(nums: &mut Vec<u32>, strings: &[&str]) -> Result<(), std::num::ParseIntError> {
    let len = nums.len();
    let mut nums = DropGuard::new(nums, move |nums| {
        nums.truncate(len); // 실패하면 원래 길이로 되돌린다
    });
    for s in strings {
        nums.push(s.parse()?); // `?`로 반환하면 가드가 버려지며 클로저가 실행된다
    }
    DropGuard::dismiss(nums); // 모두 성공했으니 되돌리기를 취소한다
    Ok(())
}
```

## 대여: 참조의 규칙

값 앞에 `&`를 붙이면 소유권을 넘기지 않고 참조를 건넨다. 함수가 끝나도 호출한 쪽이 값을 계속 소유한다.

```rust
fn len(s: &String) -> usize { s.len() }         // 공유 참조: 읽기만
fn shout(s: &mut String) { s.push_str("!!!"); } // 가변 참조: 제자리 수정

let mut name = String::from("rust");
let n = len(&name);
shout(&mut name);
```

- 한 시점에 가변 참조 하나만 두거나, 불변 참조를 여러 개 둘 수 있다. 둘을 함께 둘 수는 없다.
- 참조는 항상 유효해야 한다. 해제된 메모리를 가리키는 참조는 컴파일되지 않는다.
- 이 제약으로 데이터 경쟁을 컴파일 시점에 막는다. 데이터 경쟁은 둘 이상의 포인터가 같은 데이터에 동시에 접근하고, 그중 하나 이상이 쓰며, 접근을 동기화하는 장치가 없는 상태다.

문서 공유 권한에 빗대면 불변 참조는 여러 사람에게 주는 보기 권한, 가변 참조는 한 사람에게만 주는 편집 권한이다. 비유는 규칙을 외우는 용도이며 참조의 유효 기간(수명) 검사는 담지 못한다.

## 변수는 기본이 불변이다

`let`으로 만든 변수는 기본이 불변이고 `mut`을 붙여야 바꿀 수 있다. 타입은 대개 추론된다. 상수(`const`)는 다른 개념이다. 상수는 언제나 불변이고 타입을 반드시 적어야 하며, 실행 중에 계산한 값이 아니라 상수 식만 넣을 수 있다. JavaScript의 `const`에 빗대는 설명은 재대입 금지라는 점만 맞는다.

## 값의 부재와 실패를 타입으로 표현한다

- **`Option<T>`**: Rust에는 null이 없다. 값이 없을 수 있으면 `Some(T)` 또는 `None`인 `Option<T>`로 감싼다. `Option<T>`는 `T`와 다른 타입이라 `T`로 바꾸기 전에는 `T`의 연산을 쓸 수 없고, 컴파일러가 `None` 처리를 요구한다.
- **`Result<T, E>`**: 실패할 수 있는 연산은 `Ok(T)` 또는 `Err(E)`를 돌려준다. Rust에는 예외가 없고, 복구 가능한 오류는 `Result`, 복구할 수 없는 오류는 `panic!`으로 나눈다.
- **`?` 연산자**: `Err`이면 그 오류를 함수에서 바로 반환하고 `Ok`이면 안의 값을 꺼낸다. 오류 값은 `From` 트레이트를 거쳐 현재 함수의 반환 오류 타입으로 변환된다. 반환 타입이 `Result`나 `Option`처럼 호환되는 함수에서만 쓸 수 있다.
- **`unwrap`**: `Ok`이면 값을 꺼내고 `Err`이면 `panic!`을 부른다. 패닉은 기본적으로 메시지를 출력하고 스택을 되감으며 정리한 뒤 끝난다. `Cargo.toml`의 프로파일에 `panic = 'abort'`를 두면 정리 없이 즉시 끝난다.
- **`!`(never 타입)**: 값이 하나도 없는 타입이다. `return`, `break`, `std::process::exit`처럼 값을 만들지 않고 흐름을 끝내는 식이 이 타입을 가지며, 어떤 타입으로도 바뀔 수 있어 `match`의 한 갈래에서 `return`해도 타입 검사를 통과한다. 1.100부터 반환 타입(`-> !`) 밖에서도 이름으로 쓸 수 있어 실패할 수 없는 연산을 `Result<T, !>`로 적고, `Err` 쪽이 비어 있으므로 `let Ok(v) = res;`처럼 `Err` 갈래 없이 값을 꺼낸다. 표준 라이브러리의 `Infallible`은 `!`의 별칭이 됐다. 같은 릴리스가 2015, 2018, 2021 에디션의 never 타입 폴백을 `()`에서 `!`로 바꿨으므로(2024 에디션은 이미 적용) 드물게 추론 결과가 달라지거나 도달할 수 없는 코드로 판정되는 범위가 넓어질 수 있다.

Go의 값과 오류 쌍 반환과 같은 발상이지만, 오류를 확인하지 않고 값을 쓰는 코드를 컴파일러가 막는다는 점이 다르다.

## 트레이트와 이터레이터

트레이트는 타입이 갖추고 다른 타입과 공유할 수 있는 동작을 정의한다. 공식 문서는 다른 언어의 인터페이스와 비슷하지만 차이가 있다고 적는다.

이터레이터는 지연 평가된다. 소비하는 메서드를 부르기 전에는 아무 일도 하지 않는다. `(1..=6).filter(|n| n % 2 == 0).map(|n| n * 10).sum::<i32>()`는 120이다. 공식 문서는 이터레이터를 실행 시간 부담을 더하지 않는 zero-cost abstraction이라 부르고, 직접 쓴 저수준 코드와 대략 같은 코드로 컴파일된다고 설명한다. 표현이 대략이므로 모든 파이프라인이 임시 할당 없는 단일 루프가 된다는 보장으로 읽지 않는다.

## Cargo와 빌드 프로파일

Cargo는 빌드 도구와 패키지 관리자를 겸한다. `cargo new`가 프로젝트를 만들고 `Cargo.toml`이 의존성을 기록하며 `cargo run`이 컴파일해 실행한다.

| 프로파일 | `opt-level` | `debug-assertions` | `overflow-checks` |
|---|---|---|---|
| `dev` (기본) | 0 | true | true |
| `release` (`--release`) | 3 | false | false |

성능은 `--release`로 잰다. 기본 프로파일은 최적화를 끄고 검사를 켠 상태라 속도 비교에 쓰지 않는다. `overflow-checks`가 켜져 있으면 정수 넘침에서 패닉이 나므로 두 프로파일은 넘침 동작도 다르다.

1.100부터 Cargo는 쓰지 않는 의존성을 `cargo::unused_dependencies` 린트(기본 `warn`)로 알린다. 그 의존성을 쓸 수 있는 빌드 대상을 모두 빌드할 때만 판정하므로 `cargo check --bin foo`처럼 일부만 빌드하면 경고하지 않고, dev-dependencies는 경고하지 않는다. 수준은 `Cargo.toml`의 `[lints.cargo]`에서 정한다. 새로 게시된 버전을 일정 기간 고르지 않는 `global-min-publish-age`는 [[Dependency-Release-Cooldown|의존성 릴리스 쿨다운]]에 정리한다.

로그 500만 줄을 훑는 Rust 프로그램이 0.37초, 같은 일을 하는 Python 스크립트가 1.23초였다는 교육 영상의 수치는 제작자의 자체 측정이다. 음성 전사에서는 입력, 장비와 Python 구현을 확인할 수 없어 일반적인 배수로 쓰지 않는다.

## 보장의 범위

- 데이터 경쟁을 막는다는 보장은 교착이나 논리적 경쟁 조건까지 막는다는 뜻이 아니다(이 문서의 주의이며 이번에 대조한 범위 밖이다).
- 컴파일 통과가 메모리 안전의 증명은 아니다. 안전한 코드만으로 잘못된 참조를 만드는 컴파일러의 건전성 결함이 보고돼 있다([[Rust-Soundness-and-Lifetime-Boundaries|건전성과 수명 계약]]).
- 누수 방지는 소유권 보장의 범위가 아니고, `unsafe` 코드와 외부 함수 경계의 정확성은 프로그래머가 책임진다([[Programming-Language-Landscape|언어 지형]], [[Rust-Soundness-and-Lifetime-Boundaries|건전성과 수명 계약]]).
- 수명 표기(lifetime annotation), 스마트 포인터와 동시성 타입은 이 문서가 다루지 않는다.

## 확인 질문

- `let s2 = s1;` 뒤에 `s1`을 쓰면 왜 컴파일되지 않는가? 정수에서는 왜 되는가?
- 읽기만 필요한 함수에 `String`을 넘길 때 `clone`과 `&` 가운데 무엇을 쓰며 비용 차이는 무엇인가?
- 가변 참조가 있는 동안 불변 참조를 만들 수 없다는 규칙은 데이터 경쟁의 세 조건 가운데 무엇을 없애는가?
- `?`와 `unwrap`은 `Err`을 만났을 때 각각 무엇을 하는가?
- `cargo run`으로 잰 실행 시간을 성능 근거로 쓰면 안 되는 이유는 무엇인가?
- `DropGuard`로 되돌리기를 구현할 때 성공 경로에서 `dismiss`를 빠뜨리면 어떤 일이 생기는가?

## 출처

- [The Rust Programming Language, What Is Ownership?](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html) — 2026-11-16 소유권 세 규칙, 이동과 Copy, clone의 비용, String의 세 구성 요소, E0382 출력 대조
- [The Rust Programming Language, References and Borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html) — 참조 규칙과 데이터 경쟁의 정의
- [The Rust Programming Language, Variables and Mutability](https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html) — 기본 불변, `mut`, 상수와의 차이
- [The Rust Programming Language, Defining an Enum](https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html) — null이 없다는 설명과 `Option<T>`
- [The Rust Programming Language, Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html) — 예외가 없고 `Result`와 `panic!`으로 나눈다는 설명
- [The Rust Programming Language, Unrecoverable Errors with panic!](https://doc.rust-lang.org/book/ch09-01-unrecoverable-errors-with-panic.html) — 되감기와 abort
- [The Rust Programming Language, Recoverable Errors with Result](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) — `?`의 동작과 `From` 변환, `unwrap`
- [The Rust Programming Language, Traits](https://doc.rust-lang.org/book/ch10-02-traits.html) — 트레이트와 인터페이스의 관계
- [The Rust Programming Language, Processing a Series of Items with Iterators](https://doc.rust-lang.org/book/ch13-02-iterators.html) — 지연 평가
- [The Rust Programming Language, Comparing Performance: Loops vs. Iterators](https://doc.rust-lang.org/book/ch13-04-performance.html) — zero-cost abstraction 표현의 범위
- [The Cargo Book, Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html) — `dev`와 `release` 기본값
- [Announcing Rust 1.100.0 — Rust Blog](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/) — 2026-11-16 never 타입과 폴백 변경, Allocator 안정화 범위, DropGuard 예제와 `dismiss`가 연관 함수인 이유, 미사용 의존성 경고의 한계 대조
- [Rust 1.100.0 - never 타입과 사용자 정의 메모리 할당자 안정화 — GeekNews](https://news.hada.io/topic?id=37070) — 요약의 `cargo install` 잠금 파일 기본 사용 항목은 공식 발표에서 확인하지 못해 쓰지 않았다
- [Rust for Dummies in 7 Minutes — YouTube, The Coding Gopher](https://www.youtube.com/watch?v=ROYk9_7Dyrk) — 2026-11-13 업로드, 2026-11-16 음성 인식 전사 전체 확인. 설명 순서와 비유의 계기. 소유권, 대여, 타입과 Cargo의 사실은 위 공식 문서와 대조했고, 메모리 관리 방식 비교 표는 영상의 구분을 따랐으며 벤치마크 수치는 자체 측정으로 표기

## 관련 문서

- [[Rust-Soundness-and-Lifetime-Boundaries|Rust 건전성과 수명 계약]] — unsafe 계약과 대여 검사기의 결함
- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]] — 메모리 관리 방식의 언어별 비교
- [[Compile-and-Runtime|컴파일과 런타임]] — 검사 시점과 실행의 구분
- [[Rust-Style-Guide|Rust 스타일 가이드]]
- [[Zig-Safety-and-C-Interop|Zig의 안전 장치와 C 연동]] — GC 없이 할당자를 인자로 넘기는 다른 방식
- [[Dependency-Release-Cooldown|의존성 릴리스 쿨다운]] — Cargo `global-min-publish-age`
