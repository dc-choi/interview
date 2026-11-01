---
tags: [rust, type-system, memory-safety, soundness]
status: done
verified_at: 2026-11-02
category: "CS - 기초"
aliases: ["Rust 건전성과 수명 계약", "Rust Soundness and Lifetime Boundaries"]
---

# Rust 건전성과 수명 계약

Soundness(건전성)는 안전한 코드로 사용하는 인터페이스가 정의되지 않은 동작(UB)을 일으키지 않도록 지켜야 하는 성질이다. 컴파일 성공, 특정 테스트 통과와 이 성질의 증명은 구분한다.

## 안전한 인터페이스의 계약

Rust의 `unsafe`는 컴파일러가 확인하지 못하는 계약과, 그 계약을 개발자가 지켰다는 책임을 표시한다. `unsafe fn`을 호출할 때는 호출자가 문서의 선행조건을 확인한다. 내부에 unsafe 코드가 있어도 외부에 안전한 API를 제공할 수 있지만 구현은 그 경계를 지켜야 한다.

안전한 API의 호출자가 논리적으로 잘못된 값을 제공해도 UB로 이어지면 안 된다. Rustonomicon은 `BTreeMap`에 잘못된 `Ord` 구현을 넘기는 예를 든다. 정렬 의미가 깨져 동작이 이상해질 수 있다는 것과 메모리 안전성이 깨진다는 것은 다르다.

모든 unsafe 함수를 안전한 API로 감싸야 한다는 뜻은 아니다. 호출자가 지킬 조건이 남는 인터페이스는 unsafe 계약을 명시해야 한다.

## 공변 필드 대입으로 구조체 수명 요구를 우회하는 결함

2026-10-26 확인한 Rust 이슈 #164250은 구조체의 수명 요구를 공변(covariant) 필드 대입으로 우회하는 결함이다. `Q<T: 'static>`를 빈 `Option`으로 만든 뒤 짧게 사는 지역 값의 참조를 필드에 넣으면, `Drop` 구현이 그 값을 `'static`이라는 가정으로 다룰 수 있다. 거부해야 할 프로그램을 허용하는 문제다.

보고자는 안전한 코드의 재현과 AddressSanitizer의 `stack-use-after-scope` 진단을 제시했다. 확인 당시 이슈는 Open, `I-unsound`, `P-high`였고 수정 관련 PR #164277이 연결돼 있었다. PR 연결만으로 수정 배포를 확정하지 않는다.

유지관리자의 설명은 결함이 11년 된 것이라고 평가하면서도 악용에는 의도적으로 악성인 `Drop` 구현이 필요하다고 명시한다. 이는 결함을 가볍게 볼 이유도, 모든 Rust 서비스가 원격 공격에 노출됐다고 볼 근거도 아니다. 적용 서비스의 호출 경로와 재현 조건은 따로 조사해야 한다.

2026-11-02 다시 확인한 이슈는 여전히 Open이다. 2026-10-28 댓글에서 한 기여자가 `Drop` 구현 없이 안전한 코드로 UB를 일으키는 변형을 제시했으므로, 악성 `Drop`이 필요하다는 초기 평가를 영향 범위의 경계로 쓰지 않는다. 이슈 본문의 메타 정보는 작성 당시의 nightly와, 적어도 1.85.0부터 그 이후의 stable에서 재현된다고 적는다. 2026-11-02 기준 PR #164277(MIR 지역 변수 타입의 well-formed 요구)은 Open, 리뷰 대기 상태로 병합되지 않았고 milestone도 없었다. 2026-10-30 리뷰에서 한 기여자가 `LocalKind::Temp` 검사만으로 충분한지 의문을 제기했고, 2026-11-01에는 그 변형은 별도 PR #153027이 막을 것이므로 이 PR에서 더 할 일은 없다고 적었으며 이어 crater 실행을 위한 try 빌드가 요청됐다. #153027의 상태는 확인하지 않았다.

이 내용은 공개 이슈와 PR의 보고, 유지관리자 설명과 댓글을 대조한 기록이다. 로컬 재현, 전체 영향 버전, CVE와 실제 원격 악용 가능성은 검증하지 않았다.

## 거부와 통과는 다른 실패다

정적 검사의 실패는 두 방향이다. 안전한 프로그램을 거부하면 불필요한 수정이 생기고, 거부해야 할 프로그램을 통과시키면 건전성이 깨진다. 앞쪽을 줄이는 개선과 뒤쪽을 고치는 수정은 다른 작업이다.

NLL(RFC 2094)은 수명을 구문 트리의 어휘적 범위 대신 제어 흐름 그래프로 계산하고 몇 가지 확장을 더해, 대여 검사를 통과하려고 함수 안의 코드를 조금 고쳐야 했던 흔한 경우의 상당수를 없애는 것을 목표로 했다. 그래도 남는 대여 검사 오류가 있다. 대여 검사기의 이런 개선은 받아들이는 안전한 프로그램을 넓히는 쪽이며(Polonius alpha의 사례는 [[Compile-and-Runtime|컴파일과 런타임]]), 대여 검사 오류가 곧 메모리 오류의 증거는 아니다.

반대 방향의 결함은 `I-unsound` 라벨로 추적된다. 2015-05-28 등록된 #25860(중첩 참조의 암시적 경계(implied bounds)와 변성(variance)이 만드는 건전성 구멍)은 2026-11-02 기준 Open이며, 본문은 higher-ranked가 아닌 함수 포인터 경우는 #129021에서 고쳤지만 근본 문제는 남아 있다고 적는다. 알려진 건전성 결함이 여러 해 열려 있을 수 있으므로 컴파일 통과를 메모리 안전의 증명으로 쓰지 않는다.

## 자격 인증을 받은 Rust 툴체인

Ferrocene은 Rust 프로젝트의 하위(downstream) 배포판으로, TÜV SÜD의 자격 인증(qualification)을 받은 오픈소스 Rust 툴체인이라고 밝힌다. 2026-11-02 확인한 공식 페이지는 ISO 26262(ASIL D), IEC 61508(SIL 3, SIL 4를 향한 고객 인증 지원)과 IEC 62304(Class C)를 제시하고, core 라이브러리는 일부만 ISO 26262(ASIL B)와 IEC 61508(SIL 2)로 인증했다고 적는다. 자격 인증 문서를 포함해 MIT 또는 Apache-2.0 라이선스로 공개한다.

자격 인증을 컴파일러에 결함이 없다는 증명으로 보지 않고, 사용하는 릴리스의 인증 범위와 위의 건전성 이슈가 그 릴리스에 미치는 영향을 따로 확인한다(적용 제안). 기능 안전 표준 원문이 도구 자격 인증을 언제 요구하는지는 이번에 대조하지 않았다.

## 도구의 통과와 건전성 증명을 나눈다

Miri는 Rust 프로그램을 실행하며 범위 밖 접근, 해제 뒤 사용과 데이터 경합 같은 UB를 탐지하는 도구다. 테스트에서 특정 입력과 실행 경로를 검사하며, 모든 입력과 스레드 실행 순서를 탐색하지는 않는다. 지원하지 않는 플랫폼 API와 FFI도 있다.

따라서 Miri가 UB를 찾지 못했다는 결과는 전체 건전성의 증명이 아니다. 컴파일러 결함의 패치 여부도 Miri 통과만으로 판단하지 않는다. 이는 공식 README에 명시된 한계이며 이번 문서 작성에서 Miri를 실행하지는 않았다.

다음은 영향 조사에 적용할 점검 제안이다.

- 실제 빌드에 쓴 컴파일러 버전과 의존성을 확인한다.
- 참조 수명과 공변 필드 대입이 만나는 경로를 `Drop` 구현 유무와 관계없이 확인한다.
- 재현 테스트의 입력, 빌드 옵션과 진단을 남기고 패치 적용 뒤 같은 조건으로 비교한다.
- 테스트로 확인한 범위, 지원하지 않는 실행 경로와 미확인 악용 가능성을 나눠 기록한다.

## 확인 질문

- 안전한 API를 호출하는 쪽의 논리 오류가 UB를 일으켜도 되는가?
- Miri 테스트 통과와 임의의 안전한 호출에서 UB가 없다는 보장은 어떻게 다른가?
- 대여 검사기가 안전한 코드를 거부하는 것과 위험한 코드를 통과시키는 것 중 어느 쪽이 건전성 결함인가?

## 출처

- [The Rustonomicon, How Safe and Unsafe Interact](https://doc.rust-lang.org/nomicon/safe-unsafe-meaning.html) — unsafe 계약, 안전한 API와 호출자 코드의 신뢰 경계.
- [struct's lifetime requirements can be bypassed via covariant field assignment, #164250 — rust-lang/rust](https://github.com/rust-lang/rust/issues/164250) — 재현 구조와 유지관리자의 영향 설명. 2026-10-26 상태 확인, 2026-11-02 Open 상태와 2026-10-28의 `Drop` 없는 UB 변형 댓글, 영향 버전 메타 정보 확인.
- [require MIR local types to be well-formed, #164277 — rust-lang/rust](https://github.com/rust-lang/rust/pull/164277) — 2026-11-02 Open, 리뷰 대기, milestone 없음, 2026-10-30~11-01 리뷰의 범위 논의와 try 빌드 요청 확인.
- [Implied bounds on nested references + variance = soundness hole, #25860 — rust-lang/rust](https://github.com/rust-lang/rust/issues/25860) — 2015-05-28 등록, 2026-11-02 Open과 본문의 부분 수정(#129021) 서술 확인.
- [The Rust RFC Book, 2094 NLL](https://rust-lang.github.io/rfcs/2094-nll.html) — 2026-11-02 요약, 문제 사례와 부록의 남는 오류 확인.
- [Ferrocene — Ferrous Systems](https://ferrocene.dev/en/) — 2026-11-02 자격 인증 표준과 등급, core 라이브러리 일부 인증, 라이선스 확인. 페이지에 작성일이 없다.
- [Miri — rust-lang](https://github.com/rust-lang/miri) — 탐지 범위, 실행 경로와 건전성 증명의 차이. 2026-10-26 확인.
- [11년간 숨겨진 Rust의 치명적 결함, 당신의 코드는 정말 안전한가 — YouTube, 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=8Zxe83gW7xk) — 2026-10-20 업로드, 거부와 통과의 구분과 툴체인 자격 인증 절의 계기. 사실은 위 1차 출처와 대조했고, 영상이 근거로 든 이슈 #128487은 no_sanitize 속성 검증 이슈라 쓰지 않았으며 Polonius가 이 결함을 해결한다는 설명도 확인하지 못해 쓰지 않았다.

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]] — 메모리 안전 언어의 적용 경계
- [[Compile-and-Runtime|컴파일과 런타임]] — 검사 시점과 실제 실행의 구분
- [[Nodejs-Native-Addons|Node.js Native Addons]] — 네이티브 코드 경계의 책임
