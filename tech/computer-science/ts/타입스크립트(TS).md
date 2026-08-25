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

## 목차

- [[compile|동작원리 (컴파일 파이프라인, 컴파일러 옵션, AST, JavaScript 마이그레이션)]]
- [[types|TS 타입 (타입 특징, 단언과 satisfies, 선언 공간과 추론, 컬렉션 설계, any 경계, enum 대안)]]
- [[TS-Type-System-Principles|TS 타입 시스템 원리 (타입은 증명이다, 구조적 타이핑과 타입 호환성)]]
- [[TS-Interface-Declarations|TS 인터페이스 선언과 병합 (type vs interface, Declaration Merging, Module Augmentation)]]
- [[TS-Class-and-Decorators|TS 클래스와 데코레이터 (클래스 타입 시스템, proposal과 legacy 데코레이터)]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍 (Conditional, Mapped, Infer, Recursive)]]
- [[TS-Type-Narrowing|Type Narrowing (typeof, instanceof, in, predicate, assertion function, 패턴 매칭)]]
- [[Runtime-Validation-Libraries|Runtime 검증 라이브러리 (Zod/Typia/Ajv, AOT 최적화, 벤치마크)]]
- [[tech/computer-science/ts/ts-study/ts-study|실습 프로젝트]]
- [[TS-Generics|제네릭 (타입 관계 보존, 제약과 기본 타입 인자)]]
- [[TS-Function-Overloading|함수 오버로딩 (오버로드 vs 구현 시그니처, 조건부 타입 대비)]]

## 출처

- [TypeScript Handbook, TypeScript for the New Programmer](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- yongsoocho, [TypeScript 등장 배경](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136622)
- [타입스크립트를 소개합니다, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154358)
- [자바스크립트의 한계점과 타입스크립트, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154359)
- [타입스크립트의 동작 원리, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154360)
