---
tags: [cs, typescript]
status: index
category: "CS - TypeScript"
aliases: ["동작원리", "compile"]
verified_at: 2026-08-04
---

# 동작원리 (compile 인덱스)

TypeScript 컴파일러는 소스 코드를 분석해 진단을 만들고, 필요하면 JavaScript와 선언 파일을 emit한다. 타입 검사와 코드 생성은 관련되어 있지만 같은 단계는 아니다.

## 처리 흐름

1. 소스 텍스트를 토큰과 AST로 파싱한다.
2. 선언과 심볼을 연결하고 타입 관계를 검사해 진단을 만든다.
3. `target`, `module` 같은 옵션에 따라 JavaScript로 변환한다.
4. 타입 주석과 인터페이스처럼 런타임 표현이 없는 타입 문법을 제거하고 결과물을 emit한다.

JavaScript 엔진의 바이트코드 생성과 실행은 emit된 JavaScript를 받은 뒤의 런타임 단계다. TypeScript 자체가 모든 코드를 바이트코드로 만드는 것은 아니다.

## 타입 오류와 emit

타입 오류가 있다고 항상 JavaScript 생성이 중단되는 것은 아니다. `noEmitOnError`의 기본값은 `false`라서 오류가 있어도 결과물이 emit될 수 있다.

- `noEmit: true`: JavaScript, source map, declaration 같은 출력물을 만들지 않고 검사만 한다.
- `noEmitOnError: true`: 보고된 오류가 있으면 해당 실행에서 출력물을 만들지 않는다.

CI에서는 보통 `tsc --noEmit`으로 검사를 별도 단계로 두거나 `noEmitOnError`를 명시한다. 빌드 성공 여부를 파일 생성 여부만으로 판단하면 오류가 포함된 결과물을 배포할 수 있다.

## 목차
- [x] [[option|컴파일러 옵션 (target, module, outDir, strict, moduleDetection)]]
- [x] [[TS-JavaScript-Migration|JavaScript에서 TypeScript로 점진적 마이그레이션]]

## 관련 문서
- [[타입스크립트(TS)|TS 인덱스]]
- [[TypeScript-AST|TypeScript와 AST (컴파일러 파이프라인, Compiler API)]]

## 출처

- [TypeScript TSConfig, noEmitOnError](https://www.typescriptlang.org/tsconfig/noEmitOnError.html)
- [TypeScript TSConfig, noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html)
- [타입스크립트의 동작 원리, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154360)
