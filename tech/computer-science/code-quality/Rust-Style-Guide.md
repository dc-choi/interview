---
tags: [cs, code-quality, rust, style-guide, api-design, large-scale-change]
status: done
verified_at: 2026-10-27
category: "CS - 코드 품질"
aliases: ["Rust Style Guide", "Google Rust Style Guide", "Rust 스타일 가이드", "Rust API 설계 규칙", "LSC 친화 코드 규칙"]
---

# Rust 스타일 가이드: 대규모 변경을 견디는 규칙

여러 팀이 한 저장소를 공유하는 조직의 스타일 가이드는 포맷 규칙에 그치지 않고 API와 구현 설계까지 정한다. 기본은 언어 커뮤니티의 관습을 따르고, 도구로 코드베이스 전체를 고치는 대규모 변경(LSC, Large-Scale Change)과 빌드 규모 때문에 필요한 곳에서만 관습과 다르게 정한다. 이 문서는 Google Rust 스타일 가이드(2026-10-21 공개 저장소에 처음 게시, 2026-10-27 확인)를 기준으로 규칙과 그 이유를 정리한다. 언어의 관습과 사내 규칙의 관계는 [[Beautiful-Code#사회적인 코드|아름다운 코드의 사회적 조건]]과 이어진다.

## 적용 범위와 우선순위

- Google은 google3, Android, ChromeOS, Fuchsia, Chrome에서 Rust를 쓰고, 이 가이드로 코드베이스 안팎의 일관성을 맞추려 한다. Android, Chromium 등과 협의해 만들었고 이 코드베이스들이 적용할 예정이며, 얼마나 엄격하게 적용할지는 코드베이스마다 정한다.
- 이 가이드와 충돌하지 않는 범위에서 공식 Rust Style Guide와 Rust API Guidelines를 따른다. 포맷 규칙 대부분은 rustfmt가 강제한다. 충돌은 이 가이드가 권하는 패턴이 공식 가이드에서 권장되지 않거나 주된 권장 패턴과 반대인 경우다.
- `[chrome]`, `[Fuchsia]` 표시가 붙은 규칙은 해당 코드베이스에만 적용한다. Chromium의 작은 crate 선호, flat 파일 배치와 `async`/`.await` 금지가 여기에 속하므로 다른 프로젝트가 그대로 가져올 규칙과 구분한다.

## 목표: 사람과 도구가 함께 읽는 코드

1. 작성 편의보다 가독성과 유지보수성을 앞세운다. 코드는 오래 살아남으므로 작성할 때의 약간의 수고가 장기적으로 이득이다.
2. 자동화를 돕는다. LSC는 도구의 도움을 받아 코드베이스 전체에 걸쳐 하는 리팩터링이며, 일관성과 리팩터링 도구가 다루기 쉬운 패턴이 이를 쉽게 만든다.
3. 가능한 한 Rust 생태계와 일관되게 해서 놀랄 일과 배울 거리를 줄인다.
4. 모든 개발자와 리뷰어가 기억해야 하므로 규칙은 실질적 이득이 있어야 한다.
5. 의견이 갈리는 사소한 스타일을 미리 정해 리뷰마다 같은 논쟁을 반복하지 않는다. 다른 이득이 없는 이런 규칙은 최소화한다.

공식 Rust 규칙과 다른 지침을 두는 이유로 가이드는 일반적인 스타일 가이드의 목표(일관성, 가독성, 좋은 API 설계)에 더해진 2번, 곧 LSC를 쉽게 하는 목표를 든다.

## 라이브러리 코드와 애플리케이션 코드

| 구분 | 정의 | API 설계 규칙 |
|---|---|---|
| 라이브러리 코드 | 다른 프로젝트(애플리케이션이나 라이브러리)가 쓰고 비교적 일반적인 문제를 푼다 | 구속력 있음 |
| 애플리케이션 코드 | 한 애플리케이션 안에서 쓰고 더 구체적인 문제를 푼다 | 강한 권고. 넓은 재사용보다 단순하고 직접적인 구현을 택하고 섣부른 일반화와 추상화를 피한다 |

같은 질문에 두 코드의 답이 달라지는 예는 다음과 같다.

- 반환 타입: 라이브러리는 가능하면 `Vec<T>`보다 iterator를 반환해 호출자가 소비 방식을 고르게 한다. 대부분의 호출자가 벡터를 만들어야 하거나, 구현이 자연스럽게 벡터를 만들거나, 임의 접근이 필요하면 예외다. 애플리케이션은 유연성과 성능 이점이 분명히 필요하지 않으면 `Vec<T>`를 반환해도 된다.
- 입력: 순회만 하는 라이브러리 함수는 iterator나 `impl IntoIterator`를 받고, 애플리케이션은 더 단순하면 `&[T]`를 받는다.
- `impl Into<T>` 인자: 호출부 편의가 중요한 라이브러리 API에서만 검토하고 복잡한 시그니처와 코드 크기 증가와 견준다. 애플리케이션 코드는 거의 쓰지 않는다.
- trait 구현: 저수준 라이브러리는 사용자의 필요를 미리 예상해 구현하고, 애플리케이션은 필요해질 때 더한다.

## 모듈과 import 규칙

LSC 도구와 리뷰어가 이름의 출처를 바로 알 수 있도록 import 형태를 좁힌다.

| 규칙 | 내용 | 이유 |
|---|---|---|
| glob import 금지 | `use foo::*`를 쓰지 않는다. 인라인 모듈의 `use super::*`, enum을 주로 다루는 함수의 enum variant glob, non-leaf 모듈의 `pub use submodule::*`, 비공개로 두는 C++ namespace 병합만 선택적으로 허용한다. prelude도 정의하지 않는다 | LSC 작업 부담을 늘리고, 상호 참조 도구가 없는 곳에서 타입의 출처를 알기 어렵다 |
| `use` 하나는 한 모듈에서만 | `{}` 안에 `::`를 쓰지 않는다. rustfmt의 `imports_granularity = Module`에 해당한다 | 형태가 하나로 정해져 기계적 변경이 쉽다 |
| trait는 지역 import | 파일 전반에서 쓰지 않으면 함수 본문 안에서 import한다 | 사용 범위가 드러난다 |
| 최상위 함수는 모듈로 한정 | `use std::mem;` 뒤 `mem::transmute(y)`로 부른다. C++ 함수처럼 이름이 충분히 구별되면 예외 | 한정하지 않은 소문자 이름은 같은 모듈 것이라는 관례를 유지한다. 주된 이득은 리뷰 논쟁 방지다 |
| 타입과 trait는 import해 그대로 사용 | `regex::Regex` 대신 `use regex::Regex;` 뒤 `Regex`. `io::Error`처럼 흔한 이름이 겹치면 모듈로 한정하거나 `as`로 바꾼다 | 리뷰 논쟁 방지 |
| non-leaf 모듈에는 선언과 re-export만 | API 구현은 leaf 모듈에 두고, leaf 모듈과 파일은 주 항목 이름(`Foo`면 `foo.rs`)으로 짓는다 | 구조와 내용을 섞지 않아 찾기 쉽다 |

```rust
// 권장: use 하나가 한 모듈의 항목만 가져온다
use foo::Foo;
use foo::bar::{Bar, Baz};

// 비권장: {} 안에 다른 모듈 경로가 섞인다
use foo::{Foo, bar::Bar};
```

`imports_granularity`는 rustfmt 설정 문서 기준(2026-10-27 확인) stable 옵션이 아니다. stable 툴체인만 쓰는 코드베이스에서는 이 규칙을 formatter로 자동 강제하지 못할 수 있으므로 리뷰나 별도 검사가 맡는다. 자동 포맷 제외(`#[rustfmt::skip]`)는 의도적인 수동 정렬과 생성 코드에만 쓰고 개인 취향으로 쓰지 않는다.

Chromium 전용 규칙은 빌드 규모에서 나온다. 작은 crate를 선호하고(이상적으로는 하나의 추상화를 담은 파일 하나), 한 crate의 소스는 하위 디렉터리 없이 한 디렉터리에 둔다. 하위 디렉터리가 필요해 보이면 crate가 너무 커졌다는 신호로 본다. Cargo의 관례적 디렉터리 구조와 의도적으로 다르며, Cargo로도 빌드하는 `//third_party` 코드는 예외다. 이유로는 거대한 코드베이스, 의존성 추가가 빌드 그래프에 주는 비지역적 영향, 병렬 컴파일과 빌드 캐시 효율을 든다.

## 매크로는 마지막 수단

API를 표현할 때 다음 순서로 고른다.

1. 일반 함수, 타입, trait, 객체와 모듈
2. `macro_rules!` 매크로
3. genrule 같은 다른 코드 생성 전략
4. `proc_macro` 매크로

매크로를 쓰면 IDE와 코드 검색 같은 도구가 덜 동작하고, 코드베이스 안에 언어의 방언이 생겨 다른 팀 코드를 읽기 어려워지며, 대규모 변경을 적용하기가 더 어렵고 비싸진다. 독자는 매크로 호출부에 대해 일반 코드보다 가정할 수 있는 것이 적고, 매크로는 올바르게 작성하기도 더 어렵다. 단순한 코드 생성에는 AST 위에서 동작해 텍스트 기반 생성보다 덜 취약한 `macro_rules!`를 쓴다.

## 공개 API의 변경 여지

다른 팀이 쓰는 API는 바꿀 때의 파급이 크므로 처음부터 변경 여지를 남긴다.

- 다른 팀이 쓰는 공개 enum에는 `#[non_exhaustive]`를 붙인다. `match`에 wildcard 분기를 강제해 variant를 추가해도 사용자 코드가 계속 컴파일되게 한다. 색상처럼 바뀌지 않을 분류, bool로 대체할 수 있는 두 상태, 깨지는 곳을 LSC로 고치기로 약속한 경우는 예외다. 몇 군데서만 쓰는 enum과 struct는 깨져도 범위가 작아 이 규칙을 생략할 수 있다.
- 필드가 모두 공개된 struct도 같다. 비공개 필드 하나를 추가해도 호출자가 struct literal로 모든 필드를 적을 수 없게 되어 breaking change가 되는데, `#[non_exhaustive]` struct는 같은 crate 밖에서 literal로 만들 수 없으므로 필드를 추가해도 사용자가 깨지지 않는다. 필드가 바뀌지 않을 것이 확실하거나 LSC로 고치기로 했거나, struct update 문법(`..Default::default()`)을 허용하려는 경우는 예외다.
- `#[non_exhaustive]` enum을 `match`할 때도 알려진 variant를 나열하고, 신경 쓰지 않는 variant와 미래 variant는 wildcard 분기에 둔다. 특정 variant만 다루면 `if let`이나 `let ... else`를 쓴다.
- 반환값을 무시하면 오용인 함수(`HashMap::get` 같은 순수 함수)와 오류나 중요한 정보를 반환하는 함수에는 `#[must_use]`를 붙인다. 반환 타입이 이미 `#[must_use]`(예: `Result`)면 함수에는 붙이지 않는다. 오류 타입과 지연 계산을 나타내는 타입처럼 그런 함수가 반환할 타입에도 붙인다.
- 공개 함수의 `const`는 계속 `const`로 유지할 때만 붙인다. `const` 함수를 일반 함수로 바꾸는 것은 breaking change다.
- `#[doc(hidden)]` 항목은 소유하지 않았다면 비공개로 보고 쓰지 않는다.
- 주된 생성 수단인 `From` 구현에는 `new()`, `from_foo()` 같은 명시적 생성자를 짝으로 둔다. 생성자는 `new()`, 여러 개면 `new_with_foo()`, `Result`를 반환하면 `try_new()`로 짓는다.

일반적인 API 하위 호환 원칙은 [[Backward-Compatibility-Design|하위 호환성 설계]]에서 다룬다.

## 소유권, 오류와 구현 규칙

| 주제 | 규칙 |
|---|---|
| 공유 소유권 | `Rc`, `Arc`보다 고유 소유권과 대여를 쓴다. 대안 구조가 지나치게 복잡하면 리뷰에서 판단해 허용한다. 다른 언어에서 온 개발자가 공유 포인터에 너무 빨리 기대는 경향을 경계한다 |
| 복사 | 대여 대신 `.clone()`으로 deep copy하지 않는다. 대여 관계가 지나치게 복잡해지면 실용적 선택으로 허용한다. `Rc`, `Arc`의 clone은 deep copy가 아니므로 대상이 아니다 |
| 불변 인자 | `&Vec<T>` 대신 `&[T]`, `&String` 대신 `&str`, `&Box<T>` 대신 `&T`, `&Option<T>` 대신 `Option<&T>`처럼 데이터 자체의 참조를 받는다 |
| 의미가 불분명한 bool 인자 | enum으로 바꾸거나, bool을 쓰면 호출부 인자 목록에 주석으로 목적을 적는다 |
| 오류 보고 | 원인이 자명한 실패는 `Option`, 호출자가 원인을 구분해 복구할 실패는 `Result`, 버그와 불변식 위반은 `panic!`. 일부 코드베이스는 panic을 금지하고 깨진 불변식도 `Result`로 보고한다 |
| unwrap | 확인 뒤 `unwrap()`하지 않고 패턴 매칭으로 컴파일러에 증명한다. panic이 정당하면 `unwrap`보다 이유를 남기는 `expect`를 쓴다 |
| 타입 추론 | `.into()`, `.parse()`처럼 반환 타입이 제네릭인 호출과 복잡한 iterator 결과에는 turbofish보다 변수 선언에 타입을 적는다 |
| iterator 체인 | 길고 복잡한 체인, `for` 헤더 안의 체인, 이유 없는 `for_each`를 피한다. 체인은 이름 있는 변수에 담은 뒤 순회한다. `any()`처럼 조합기가 로직을 대신하는 짧은 체인은 권장한다 |
| assert | 조건을 되풀이하지 않고 왜 성립해야 하는지, API 오용인지 구현 버그인지를 메시지로 남긴다 |
| unsafe | 안전한 구현이 불가능할 때만 쓰고, 안전한 추상화로 감싸 업무 로직에서 떼며, `SAFETY:` 주석과 기술적 정당화(성능이 이유면 벤치마크)를 남긴다 |
| 금지 | unstable 기능(코드베이스별 예외 있음), poison된 mutex 내부 접근, `panic::catch_unwind`(의존하지 않는 방어 심층용 예외만), `ctor` 같은 `main()` 이전 코드 실행, 수학적, 논리적 의미가 없는 연산자 오버로딩 |

이 밖에 공개 API 문서화(`missing_docs` lint 활용, panic 조건과 unsafe 불변식 명시, 코드가 이미 말하는 내용의 반복 금지), getter와 setter 이름(`foo()`, `foo_mut()`, `take_foo()`, `set_foo()`, `with_foo()`, `replace_foo()`), `len()`을 구현하면 `is_empty()`도 구현하는 규칙이 있다. 규칙마다 관련 Clippy lint(`ptr_arg`, `wrong_self_convention`, `exhaustive_enums` 등)를 맥락으로 든다.

## 적용 제안

다음은 가이드 내용을 다른 팀에 옮길 때의 판단 제안이며 가이드의 규칙 자체는 아니다.

- 외부 가이드를 들여올 때는 규칙과 이유를 함께 읽는다. LSC와 빌드 그래프에서 나온 규칙(glob import 금지, import 형태 고정, 작은 crate)은 자동화 리팩터링과 대형 저장소를 운영할 때 이득이 크고, 작은 프로젝트에서는 공식 Rust 스타일과 API 가이드라인으로 충분할 수 있다.
- 라이브러리와 애플리케이션을 나눠 API 규칙의 구속력을 달리하는 방식은 언어와 무관하게 쓸 수 있다. 공용 라이브러리는 변경 여지와 범용 입력을 우선하고, 애플리케이션은 단순성을 우선한다.
- formatter 옵션, lint와 CI로 강제할 수 있는 규칙을 먼저 자동화하고, 도구가 지원하지 않는 규칙(stable rustfmt의 import 형태 등)만 리뷰가 맡는다([[Function-Structure-and-Contracts|함수 구조와 호출 계약]]).

## 확인 범위

2026-10-27 Google 스타일 가이드 페이지 본문과 google/styleguide 저장소의 `rustguide.md` 커밋 이력(최초 2026-10-21, 내부 가이드의 자동 내보내기)을 대조했다. 페이지에는 버전이나 확정 표기가 없고 첫 주에 여러 번 갱신됐으므로 세부 규칙은 적용 시점에 다시 확인한다. 각 코드베이스의 실제 적용 범위와 강제 수준은 확인하지 않았다.

## 출처

- [Google Style Guides, Rust Style Guide](https://google.github.io/styleguide/rustguide.html)
- [google/styleguide rustguide.md 커밋 이력 — GitHub](https://github.com/google/styleguide/commits/gh-pages/rustguide.md) — 최초 게시일과 갱신 이력 확인
- [rustfmt, Configurations](https://github.com/rust-lang/rustfmt/blob/master/Configurations.md#imports_granularity) — `imports_granularity`의 stable 여부 확인
- [Google의 Rust 스타일 가이드 — GeekNews](https://news.hada.io/topic?id=35789) — 2026-10-22 소개 글, 원문 식별에 사용

## 관련 문서

- [[Beautiful-Code|아름다운 코드의 조건과 유지]]
- [[Function-Structure-and-Contracts|함수 구조와 호출 계약]]
- [[Readable-Code-Cognition|코드 가독성의 인지과학]]
- [[Backward-Compatibility-Design|하위 호환성 설계]]
- [[Rust-Soundness-and-Lifetime-Boundaries|Rust 건전성과 수명 계약]]
- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]]
