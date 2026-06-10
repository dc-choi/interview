---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: index
category: "CS - TypeScript"
aliases: ["TS Type Narrowing", "Type Guard", "Type Predicate", "Assertion Function"]
---

# TypeScript Type Narrowing — 타입 좁히기 종합

Union, `unknown`, `any` 같은 **넓은 타입**을 조건문 흐름으로 **구체 타입**으로 좁혀, 좁혀진 컨텍스트 안에서 안전하게 메서드, 속성에 접근하는 메커니즘. 컴파일러는 control flow analysis로 각 분기 안의 타입을 추적한다.

- [[TS-Type-Narrowing-Builtin-Guards|타입 소거와 두 레이어, 6가지 도구 개요, typeof, instanceof, in, Discriminated Union과 exhaustive check]]
- [[TS-Type-Narrowing-Custom-Guards|사용자 정의 Type Predicate(x is T)와 Assertion Function(asserts x is T), 둘의 비교]]
- [[TS-Type-Narrowing-Pitfalls|control flow와 클로저 좁힘 해제, unknown vs any, 흔한 실수, 면접 체크포인트]]

## 관련 문서

- [[TypeScript-Type-Compatibility|TS 타입 호환성 (구조적 타이핑, Variance, Brand)]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍 (Conditional, Mapped, Infer)]]
- [[TS-Pattern-Matching|패턴 매칭 (ts-pattern, exhaustive)]]
- [[Runtime-Validation-Libraries|Runtime 검증 라이브러리 (Zod, Typia)]]
- [[Types-As-Proofs|Types as Proofs (never, exhaustive)]]
