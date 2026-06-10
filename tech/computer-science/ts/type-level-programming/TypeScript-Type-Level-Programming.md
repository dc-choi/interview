---
tags: [cs, typescript, type-system, type-level]
status: index
category: "CS - TypeScript"
aliases: ["TypeScript Type-Level Programming", "타입 레벨 프로그래밍"]
---

# TypeScript 타입 레벨 프로그래밍

TypeScript의 타입 시스템은 **튜링 완전한 함수형 언어**에 가깝다. 조건 분기, 재귀, 패턴 매칭이 모두 가능해서 **컴파일 타임에 타입 수준에서 로직을 표현**할 수 있다. 이것이 라이브러리 저자가 쓰는 `Pick`, `Omit`, `Parameters` 같은 고급 유틸리티 타입의 기반.

- [[TypeScript-Type-Level-Programming-Basics|기초 — 타입은 집합, Generic, 조건부 타입과 분배 조건부 타입]]
- [[TypeScript-Type-Level-Programming-Advanced|심화 — infer 패턴 매칭, Mapped Types, Template Literal Types, 재귀 조건부 타입]]
- [[TypeScript-Type-Level-Programming-Practice|실용 — API 응답과 라우터 타입 예시, 흔한 함정, 면접 체크포인트]]

## 출처
- [velog @gomjellie — 타입스크립트 타입 레벨 프로그래밍](https://velog.io/@gomjellie/You-dont-know-type)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs (커리-하워드)]]
- [[TypeScript-AST|TypeScript와 AST]]
- [[TS-Type-vs-Interface|type vs interface]]
- [[TS-Enum-Antipattern|TS Enum 안티패턴]]
