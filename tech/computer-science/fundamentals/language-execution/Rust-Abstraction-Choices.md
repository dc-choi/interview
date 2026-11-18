---
tags: [rust, enum, sum-type, dispatch, trait-object, generics, macro, derive, typescript]
status: done
verified_at: 2026-11-18
category: "CS - 기초"
aliases: ["Rust Abstraction Choices", "Rust 추상화 선택", "정적 디스패치", "동적 디스패치", "Static Dispatch", "Dynamic Dispatch", "trait object", "트레이트 객체", "derive 매크로", "아레나 패턴"]
---

# Rust의 추상화 선택과 비용

여러 종류의 값을 한 코드로 다루는 방법은 어느 언어에나 있다. Rust는 그 방법을 열거형과 `match`, 제네릭, 트레이트 객체로 나누고, 어느 쪽을 골랐는지와 그 실행 비용을 코드에 드러낸다. 이 문서는 세 방법의 선택 기준, 컴파일 시점에 코드를 만드는 derive 매크로, 역참조가 필요한 자료 구조를 The Rust Programming Language 기준(2026-11-18 대조)으로 정리하고 TypeScript의 대응 개념과 잇는다. 소유권과 대여의 기본 규칙은 [[Rust-Ownership-and-Borrowing|Rust 소유권과 대여]]에 있다.

## 호출할 구현을 정하는 세 방식

| 방식 | 구현이 정해지는 시점 | 다루는 타입 집합 | 비용과 제약 |
|---|---|---|---|
| 열거형 + `match` | 실행 중 variant를 보고 분기한다 | 컴파일할 때 아는 고정 집합 | variant를 더하면 그 열거형을 다루는 `match`를 모두 고쳐야 하고, 빠진 곳은 컴파일 오류로 드러난다 |
| 제네릭 + 트레이트 경계 | 컴파일 시점(정적 디스패치) | 호출 지점마다 구체 타입 하나 | 단형화(monomorphization)로 호출된 구체 타입마다 코드를 만들어 실행 비용이 없다 |
| 트레이트 객체 `dyn Trait` | 실행 시점(동적 디스패치) | 라이브러리 사용자가 넓힐 수 있는 열린 집합 | 객체 안의 포인터로 메서드를 찾는 실행 비용이 들고, 컴파일러가 메서드를 인라인하지 못한다. `Box<dyn Trait>`나 참조처럼 포인터 뒤에 둔다 |

공식 문서는 열거형을 서로 바꿔 쓸 항목이 컴파일할 때 아는 고정된 타입 집합일 때 충분히 좋은 해법이라고 설명하고, 라이브러리 사용자가 유효한 타입 집합을 넓혀야 할 때 트레이트 객체를 쓴다고 구분한다. 트레이트 객체를 만들 수 있는 트레이트에는 dyn compatibility라는 규칙이 따로 있다.

```rust
enum Person {
    Human { name: String, job: String },
    Cat { name: String },
}

fn greet(p: &Person) -> String {
    match p {
        Person::Human { name, job } => format!("{name} ({job})"),
        Person::Cat { name } => format!("{name}, meow"),
    } // Dog variant를 추가하면 이 match가 컴파일되지 않아 고칠 곳이 드러난다
}

trait Speak {
    fn speak(&self) -> String;
}

// 정적 디스패치: T마다 따로 컴파일되고 실행 중 조회가 없다
fn chorus<T: Speak>(members: &[T]) -> Vec<String> {
    members.iter().map(|m| m.speak()).collect()
}

// 동적 디스패치: 서로 다른 타입을 한 목록에 담고 실행 중 구현을 찾는다
fn chorus_mixed(members: &[Box<dyn Speak>]) -> Vec<String> {
    members.iter().map(|m| m.speak()).collect()
}
```

`chorus`에 고양이만 담은 목록을 넘기면 항목마다 종류를 확인할 필요가 없고, 다른 타입을 섞으면 컴파일되지 않는다. 모두 같은 종류라는 불변식을 실행 중 검사 대신 타입이 지킨다.

## 고르는 기준

1. **집합을 누가 넓히는가**: 같은 crate가 variant를 모두 소유하면 열거형, 다른 crate나 사용자가 새 타입을 더해야 하면 트레이트 객체다. 플러그인과 GUI 컴포넌트가 후자의 전형이다.
2. **한 번에 몇 종류를 섞는가**: 한 자료 구조에 여러 타입을 섞어야 하면 열거형이나 트레이트 객체, 호출 지점마다 한 타입이면 제네릭이다.
3. **공개 API인가**: 다른 팀이 쓰는 공개 열거형에 variant를 더하면 사용자 코드의 `match`가 깨진다. 이를 막는 `#[non_exhaustive]`와 그 예외는 [[Rust-Style-Guide#공개 API의 변경 여지|Rust 스타일 가이드]]에 있다.

variant 추가와 연산 추가 가운데 무엇이 싼지는 [[Products-And-Coproducts#프로그래밍 비대칭성 — FP vs OOP|Expression Problem]]의 두 면이다. Rust를 오래 쓴 한 실무 회고는 한 도메인 안의 분류라면 인터페이스를 미리 설계하기보다 열거형으로 시작하는 편이 가볍고, 인터페이스의 설계 비용은 플러그인처럼 열린 확장이 실제로 필요할 때 회수된다고 전한다. 경험에서 나온 견해이며 일반 규칙으로 검증된 것은 아니다.

## 비용이 코드에 보인다

`dyn`, `Box`, 참조 카운트 `Rc`와 `clone`은 비용이 드는 선택이 일어난 자리를 코드에 남긴다(`clone`을 비용 신호로 읽는 설명은 [[Rust-Ownership-and-Borrowing#소유권 세 규칙과 이동|소유권 문서]]). 반대로 비용을 피하려고 제네릭을 겹겹이 쌓으면 타입이 읽기 어려워지므로, 실무에서는 필요한 곳에서 값을 복제해 소유하는 단순한 쪽을 택하기도 한다. 공식 스타일 가이드도 대여 관계가 지나치게 복잡해질 때의 `clone`을 실용적 선택으로 허용한다([[Rust-Style-Guide#소유권, 오류와 구현 규칙|Rust 스타일 가이드]]).

## derive 매크로: 컴파일 시점의 코드 생성

Rust에는 실행 중 타입 이름을 조회할 리플렉션이 없어서, 타입 정보로 코드를 만들려면 컴파일 시점에 생성해야 한다. 매크로는 `macro_rules!`로 만드는 선언적 매크로와 세 종류의 절차적 매크로(구조체와 열거형의 `#[derive]`에 쓰는 custom derive, 속성형, 함수형)로 나뉜다. 매크로는 컴파일러가 코드의 의미를 해석하기 전에 펼쳐지므로 타입에 트레이트를 구현할 수 있다. 실행 중에 호출되는 함수는 할 수 없는 일이다.

- **serde**: `features = ["derive"]`를 켜고 `#[derive(Serialize, Deserialize)]`를 붙이면 그 타입의 `Serialize`, `Deserialize` 구현이 생성된다. `Clone`, `Debug`와 같은 derive 메커니즘이다.
- **clap**: `#[derive(Parser)]`를 붙인 구조체가 명령행 인자 정의가 된다. 필드의 doc comment 첫 요약이 `help`가 되고, 빈 줄 뒤 설명까지 있으면 전체가 `long_help`로 간다. `#[arg(...)]` 속성이 doc comment보다 우선한다(clap 4.6.8 derive reference 기준). 값 목록은 `ValueEnum`, 하위 명령은 `Subcommand` 열거형으로 표현한다.
- **비용**: 매크로 정의는 코드를 만드는 코드라 함수보다 읽고 유지하기 어렵다. 매크로를 마지막 수단으로 두는 조직 규칙은 [[Rust-Style-Guide#매크로는 마지막 수단|Rust 스타일 가이드]]에 있고, 실무 회고에서도 매크로는 프레임워크가 감싸고 애플리케이션 코드에는 쓰는 쪽만 남기라는 견해가 나온다.

TypeScript의 대응은 시점이 다르다. NestJS와 class-validator가 쓰는 데코레이터는 클래스가 정의될 때 실행되고, `emitDecoratorMetadata`가 남기는 제한된 설계 타입 정보를 실행 중에 읽는다. interface와 제네릭 인수는 그 정보에서도 지워진다([[TS-Decorators|TS 데코레이터]], [[NestJS-vs-Spring-Runtime-DI|NestJS와 Spring의 DI 처리 시점]]). 타입에서 검증 코드를 빌드 시점에 만드는 방식은 [[Runtime-Validation-Libraries-Practice|런타임 검증 라이브러리 실무]]의 Typia 사례가 가깝다.

## 역참조가 필요한 구조

소유자가 하나라는 규칙 때문에 자식이 부모를 가리키는 트리, 서로 참조하는 그래프는 다른 언어처럼 바로 짜이지 않는다.

- **약한 참조**: 공식 문서의 트리 예제는 부모가 자식을 `Rc`로 소유하고, 자식은 부모를 `Weak`로 가리킨다. 부모가 사라지면 자식도 사라져야 하지만 자식이 사라져도 부모는 남아야 하기 때문이다. `Weak::upgrade`는 `Option<Rc<T>>`를 돌려주므로 부모가 이미 해제된 경우를 처리해야 한다. `Rc`와 `RefCell`로 순환을 만들면 참조 수가 0이 되지 않아 메모리가 누수될 수 있다.
- **아레나**: 노드를 배열 하나에 모으고 다른 노드를 인덱스로 가리키는 방식이다. 인덱스는 소유권이 없는 값이라 순환과 부모 참조를 쉽게 표현하고, 모든 노드의 수명이 아레나 하나로 묶인다. 대신 지운 노드를 가리키는 인덱스를 막는 일은 컴파일러가 아니라 프로그램이 맡는다. 같은 실무 회고는 아레나가 Rust 코드 곳곳에 쓰이고 순회와 할당이 빠르다고 전하지만, 여기서 성능을 측정하지는 않았다.
- **변경과 사용의 분리**: 값을 만드는 동안만 바꾸고 그 뒤에는 읽기만 하도록 단계를 나누면 대여 충돌이 줄어든다. 숨은 상호 참조가 줄어 결합도가 낮아진다는 평가는 실무 경험에서 나온 견해다.

## TypeScript와의 대응

| Rust | TypeScript | 차이 |
|---|---|---|
| 열거형 + `match` | 판별 유니온 + `switch` | 판별 필드를 직접 정하고, 완전성 검사는 `never` 대입이나 lint로 켠다([[Types-As-Proofs|타입은 증명이다]], [[Type-Driven-Development#판별 유니온|판별 유니온]]) |
| 제네릭(단형화) | 제네릭 | 타입은 컴파일하며 지워지고 실행 동작을 바꾸지 않는다. `T`마다 코드가 생기지 않고 JavaScript 함수 하나가 모든 타입을 처리한다 |
| 트레이트 객체 | interface와 class 메서드 호출 | 언어 의미로는 모든 메서드 호출이 실행 중 속성 조회다. 호출 지점을 빠르게 만드는 일은 엔진 최적화의 몫이다([[V8-Inline-Cache|V8 인라인 캐시]]) |
| derive 매크로 | 데코레이터와 실행 중 메타데이터, 또는 빌드 시점 변환기 | 위 derive 절 참조 |

TypeScript에는 Rust의 정적 디스패치에 해당하는 언어 차원의 장치가 없으므로, 제네릭으로 타입 안전성을 얻는 것과 실행 비용을 줄이는 것은 별개로 판단한다.

## 짧은 사례

6년 넘게 Rust를 쓰고 그중 4년 이상을 실무에 적용한 한 개발자는 2026-11 회고에서, 성능을 다룰 수 있게 되자 큰 JSON을 메모리에 올려 인덱스로 접근하는 라이브러리처럼 예전에는 떠올리지 않던 설계를 시도하게 됐다고 적었다. 또 열거형이 추상화의 기본 도구로 자리 잡아 합 타입이 없는 언어는 빈약하게 느껴진다고 했다. 개인 경험이며 일반화한 근거는 아니다.

## 확인 질문

- 같은 분류를 열거형, 제네릭, 트레이트 객체로 표현할 때 각각 무엇이 컴파일 시점에 정해지고 무엇이 실행 중에 정해지는가?
- 다른 crate가 새 타입을 더해야 하는 플러그인 목록을 열거형으로 만들면 어떤 문제가 생기는가?
- 트레이트 객체가 정적 디스패치보다 느릴 수 있는 이유 두 가지는 무엇인가?
- serde의 derive와 NestJS의 데코레이터는 타입 정보를 각각 언제 쓰는가?
- 자식이 부모를 `Rc`로 가리키면 어떤 일이 생기고, `Weak`나 아레나는 그 문제를 어떻게 피하는가?
- TypeScript 제네릭이 Rust 제네릭처럼 실행 비용을 줄여 주지 않는 이유는 무엇인가?

## 출처

- [The Rust Programming Language, Using Trait Objects to Abstract over Shared Behavior](https://doc.rust-lang.org/book/ch18-02-trait-objects.html) — 2026-11-18 고정 집합과 확장 가능한 집합의 구분, 정적, 동적 디스패치의 정의와 인라인 제약, dyn compatibility, 트레이트 객체 문법 대조
- [The Rust Programming Language, Generic Data Types](https://doc.rust-lang.org/book/ch10-01-syntax.html) — 단형화와 실행 비용이 없다는 설명
- [The Rust Programming Language, Macros](https://doc.rust-lang.org/book/ch20-05-macros.html) — 매크로 종류, 펼쳐지는 시점, 리플렉션 부재와 custom derive 예제, 유지보수 비용
- [The Rust Programming Language, Reference Cycles Can Leak Memory](https://doc.rust-lang.org/book/ch15-06-reference-cycles.html) — 부모의 `Weak` 참조, `upgrade`의 반환 타입, 순환 참조 누수
- [Serde, Using derive](https://serde.rs/derive.html)
- [clap, Derive reference](https://docs.rs/clap/latest/clap/_derive/index.html) — 4.6.8 기준 doc comment와 help의 대응, 속성 우선순위
- [TypeScript Handbook, The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) — Erased Types
- [How Rust Changed Me As A Developer — Secret Weblog, Martijn Faassen](https://blog.startifact.com/posts/how-rust-changed-me/) — 2026-11-16 개인 회고. 열거형 우선, 정적 디스패치 예, 아레나와 성능 사례의 계기이며 경험적 주장은 본문에 견해로 표기했다

## 관련 문서

- [[Rust-Ownership-and-Borrowing|Rust 소유권과 대여]]
- [[Rust-Style-Guide|Rust 스타일 가이드]]
- [[Rust-Soundness-and-Lifetime-Boundaries|Rust 건전성과 수명 계약]]
- [[Products-And-Coproducts|Products and Coproducts]] — 합 타입과 Expression Problem
- [[Type-Driven-Development|타입 주도 개발]]
- [[TS-Decorators|TS 데코레이터]]
