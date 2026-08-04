---
tags: [cs, typescript]
status: index
category: "CS - TypeScript"
aliases: ["TS"]
verified_at: 2026-08-04
---

# TypeScript

TypeScript는 JavaScript에 정적 타입 검사기를 더한 언어다. 유효한 JavaScript 코드를 받아 타입 정보를 분석하고, 실행 시에는 타입 문법을 제거한 JavaScript를 사용한다. 타입 검사 때문에 JavaScript의 런타임 동작 자체가 바뀌지는 않는다.

JavaScript도 대규모 애플리케이션에 사용된다. TypeScript가 해결하는 문제는 JavaScript가 대규모 개발에 불가능하다는 것이 아니라, 실행 전 피드백이 부족하다는 점이다. 함수 계약과 객체 구조를 타입으로 표현하면 잘못된 호출과 속성 접근을 개발 중에 찾고, 자동완성, 탐색, 리팩터링의 근거로 활용할 수 있다.

## 정적 타입 검사의 경계

- 타입 오류를 조기에 찾지만 모든 런타임 오류를 막지는 않는다.
- 타입은 기본적으로 emit 결과에서 지워진다. API 응답, 사용자 입력, 저장 데이터는 별도의 런타임 검증이 필요하다.
- JavaScript와 호환되는 점진적 도입을 지원하지만 `any`, 타입 단언, 느슨한 컴파일러 옵션은 안전성을 낮춘다.
- 타입 추론, 유니온, 인터페이스와 타입 별칭, 제네릭으로 코드의 관계와 불변식을 표현한다.

## 기초 문서

- [[compile|컴파일 원리]]
- [[option|컴파일러 옵션]]
- [[types|TS 타입 폴더 인덱스]]
- [[tech/computer-science/ts/types/타입특징|타입 특징]]
- [[TS-Declaration-Spaces-and-Inference|타입 공간, 값 공간과 추론]]
- [[TS-Collection-Type-Design|컬렉션 타입 설계]]
- [[TS-Type-Design-Principles|타입 설계 원칙]]
- [[TS-Any-Boundaries|any 경계 설계]]
- [[TS-Type-Assertions|타입 단언과 satisfies]]
- [[TS-Class-Type-System|클래스 타입 시스템]]
- [[TS-Generics|제네릭]]
- [[TS-Decorators|Decorators]]
- [[TS-React-Type-Contracts|React 타입 계약]]
- [[TS-JavaScript-Migration|JavaScript에서 TypeScript로 마이그레이션]]
- [[tech/computer-science/ts/ts-study/ts-study|실습 프로젝트]]

## 심화 주제
- [x] [[Types-As-Proofs|Types as Proofs (커리-하워드 대응, never, exhaustive switch, TS 불건전 지점)]]
- [x] [[TypeScript-AST|TypeScript와 AST (컴파일러 파이프라인, Compiler API, AST 기반 도구)]]
- [x] [[Runtime-Validation-Libraries|Runtime 검증 라이브러리 (Zod/Typia/Ajv, AOT 최적화, 벤치마크)]]
- [x] [[TS-Type-vs-Interface|type vs interface (선언 병합, 유니온, 복잡한 타입)]]
- [x] [[TS-Enum-Antipattern|TS enum 안티패턴 (as const, Union Type 대안)]]
- [x] [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍 (Conditional, Mapped, Infer, Recursive)]]
- [x] [[TypeScript-Type-Compatibility|타입 호환성 (구조적 타이핑, Freshness, 공변/반공변, Brand)]]
- [x] [[TS-Pattern-Matching|패턴 매칭 (ts-pattern, Discriminated Union, exhaustive check)]]
- [x] [[TS-Type-Narrowing|Type Narrowing (typeof, instanceof, in, predicate, assertion function, exhaustive)]]
- [x] [[TS-Module-Augmentation|Module Augmentation (Declaration Merging, declare global, declare module, .d.ts)]]
- [x] [[TS-Function-Overloading|함수 오버로딩 (오버로드 vs 구현 시그니처, 조건부 타입 대비)]]

## 출처

- [TypeScript Handbook, TypeScript for the New Programmer](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- yongsoocho, [TypeScript 등장 배경](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136622)
- [타입스크립트를 소개합니다, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154358)
- [자바스크립트의 한계점과 타입스크립트, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154359)
- [타입스크립트의 동작 원리, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154360)
