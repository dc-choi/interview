---
tags: [cs, functional, category-theory, adt, type-algebra, sum-type, product-type]
status: index
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Algebraic Data Types", "ADT", "타입 대수", "Type Algebra"]
---

# Algebraic Data Types (타입 대수)

타입을 **덧셈과 곱셈으로 다루는 대수적 구조**. Product를 곱셈, Sum을 덧셈으로 보면 자연수 산술과 거의 같은 법칙(항등원, 영, 분배법칙)이 성립한다. 이 관점이 ADT가 "algebraic"이라 불리는 이유다. Product/Coproduct의 카테고리적 정의는 [[Products-And-Coproducts]] 참조.

- [[Algebraic-Data-Types-Sum-Product|Sum과 Product — 카디널리티 핵심 명제, 곱셈과 덧셈, 항등원 Unit/Void]]
- [[Algebraic-Data-Types-Laws|타입 대수 법칙 — 산술 법칙 표, 분배법칙 실용 의미, 함수 타입 지수, 재귀 ADT 방정식]]
- [[Algebraic-Data-Types-Practice|실용적 가치 — 합성성, 패턴 매칭 안전성, illegal states 차단, Curry-Howard, 면접 체크포인트]]

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 6. Simple Algebraic Data Types](https://evan-moon.github.io/2024/03/05/category-theory-for-programmers-6-simple-algebraic-data-types/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Products-And-Coproducts|Products and Coproducts (카테고리 이론적 정의)]]
- [[Function-Types-And-Currying|Function Types, Currying, CCC (지수 법칙)]]
- [[Bifunctors-Profunctors|Bifunctors, Profunctors (ADT가 자동 Functor 되는 근거)]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Void/Unit)]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[Order-Monoid-Categories|Order, Monoid 카테고리]]
- [[Monads-In-TypeScript|Monads in TypeScript (Maybe = 1+a)]]
