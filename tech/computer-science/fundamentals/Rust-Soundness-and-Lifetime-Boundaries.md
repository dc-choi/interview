---
tags: [rust, type-system, memory-safety, soundness]
status: done
verified_at: 2026-10-26
category: "CS - 기초"
aliases: ["Rust 건전성과 수명 계약", "Rust Soundness and Lifetime Boundaries"]
---

# Rust 건전성과 수명 계약

Soundness(건전성)는 안전한 코드로 사용하는 인터페이스가 정의되지 않은 동작(UB)을 일으키지 않도록 지켜야 하는 성질이다. 컴파일 성공, 특정 테스트 통과와 이 성질의 증명은 구분한다.

## 안전한 인터페이스의 계약

Rust의 `unsafe`는 컴파일러가 확인하지 못하는 계약과, 그 계약을 개발자가 지켰다는 책임을 표시한다. `unsafe fn`을 호출할 때는 호출자가 문서의 선행조건을 확인한다. 내부에 unsafe 코드가 있어도 외부에 안전한 API를 제공할 수 있지만 구현은 그 경계를 지켜야 한다.

안전한 API의 호출자가 논리적으로 잘못된 값을 제공해도 UB로 이어지면 안 된다. Rustonomicon은 `BTreeMap`에 잘못된 `Ord` 구현을 넘기는 예를 든다. 정렬 의미가 깨져 동작이 이상해질 수 있다는 것과 메모리 안전성이 깨진다는 것은 다르다.

모든 unsafe 함수를 안전한 API로 감싸야 한다는 뜻은 아니다. 호출자가 지킬 조건이 남는 인터페이스는 unsafe 계약을 명시해야 한다.

## 공변 필드 대입과 소멸자의 수명 가정

2026-10-26 확인한 Rust 이슈 #164250은 구조체의 수명 요구를 공변(covariant) 필드 대입으로 우회하는 결함이다. `Q<T: 'static>`를 빈 `Option`으로 만든 뒤 짧게 사는 지역 값의 참조를 필드에 넣으면, `Drop` 구현이 그 값을 `'static`이라는 가정으로 다룰 수 있다. 거부해야 할 프로그램을 허용하는 문제다.

보고자는 안전한 코드의 재현과 AddressSanitizer의 `stack-use-after-scope` 진단을 제시했다. 확인 당시 이슈는 Open, `I-unsound`, `P-high`였고 수정 관련 PR #164277이 연결돼 있었다. PR 연결만으로 수정 배포를 확정하지 않는다.

유지관리자의 설명은 결함이 11년 된 것이라고 평가하면서도 악용에는 의도적으로 악성인 `Drop` 구현이 필요하다고 명시한다. 이는 결함을 가볍게 볼 이유도, 모든 Rust 서비스가 원격 공격에 노출됐다고 볼 근거도 아니다. 적용 서비스의 호출 경로와 재현 조건은 따로 조사해야 한다.

이 내용은 공개 이슈의 보고와 유지관리자 설명을 대조한 기록이다. 로컬 재현, 전체 영향 버전, CVE와 실제 원격 악용 가능성은 검증하지 않았다.

## 도구의 통과와 건전성 증명을 나눈다

Miri는 Rust 프로그램을 실행하며 범위 밖 접근, 해제 뒤 사용과 데이터 경합 같은 UB를 탐지하는 도구다. 테스트에서 특정 입력과 실행 경로를 검사하며, 모든 입력과 스레드 실행 순서를 탐색하지는 않는다. 지원하지 않는 플랫폼 API와 FFI도 있다.

따라서 Miri가 UB를 찾지 못했다는 결과는 전체 건전성의 증명이 아니다. 컴파일러 결함의 패치 여부도 Miri 통과만으로 판단하지 않는다. 이는 공식 README에 명시된 한계이며 이번 문서 작성에서 Miri를 실행하지는 않았다.

다음은 영향 조사에 적용할 점검 제안이다.

- 실제 빌드에 쓴 컴파일러 버전과 의존성을 확인한다.
- 참조 수명, 필드 대입과 `Drop`의 가정이 만나는 경로를 확인한다.
- 재현 테스트의 입력, 빌드 옵션과 진단을 남기고 패치 적용 뒤 같은 조건으로 비교한다.
- 테스트로 확인한 범위, 지원하지 않는 실행 경로와 미확인 악용 가능성을 나눠 기록한다.

## 확인 질문

- 안전한 API를 호출하는 쪽의 논리 오류가 UB를 일으켜도 되는가?
- Miri 테스트 통과와 임의의 안전한 호출에서 UB가 없다는 보장은 어떻게 다른가?

## 출처

- [The Rustonomicon, How Safe and Unsafe Interact](https://doc.rust-lang.org/nomicon/safe-unsafe-meaning.html) — unsafe 계약, 안전한 API와 호출자 코드의 신뢰 경계.
- [struct's lifetime requirements can be bypassed via covariant field assignment, #164250 — rust-lang/rust](https://github.com/rust-lang/rust/issues/164250) — 재현 구조와 유지관리자의 영향 설명. 2026-10-26 상태 확인.
- [Miri — rust-lang](https://github.com/rust-lang/miri) — 탐지 범위, 실행 경로와 건전성 증명의 차이. 2026-10-26 확인.

## 관련 문서

- [[Programming-Language-Landscape|프로그래밍 언어 지형과 구분 기준]] — 메모리 안전 언어의 적용 경계
- [[Compile-and-Runtime|컴파일과 런타임]] — 검사 시점과 실제 실행의 구분
- [[Nodejs-Native-Addons|Node.js Native Addons]] — 네이티브 코드 경계의 책임
