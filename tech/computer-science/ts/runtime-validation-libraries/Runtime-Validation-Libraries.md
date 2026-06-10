---
tags: [cs, typescript, validation, zod, typia, ajv, performance]
status: index
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Runtime Validation Libraries", "Zod Typia Ajv", "런타임 검증"]
---

# Runtime 검증 라이브러리 — Zod, Typia, Ajv

TypeScript의 타입은 **컴파일 타임**에만 존재하므로, 외부 입력(API 요청, 파일, DB, 사용자)을 신뢰하려면 **런타임 검증**이 별도 필요하다. 주요 라이브러리인 Zod, Typia, Ajv는 동작 원리, 성능, API가 모두 다르며, 선택이 프로젝트 성능, 개발 경험을 좌우한다.

- [[Runtime-Validation-Libraries-Comparison|핵심 명제와 Zod, Typia, Ajv의 동작 원리, API 비교]]
- [[Runtime-Validation-Libraries-Performance|성능 벤치마크와 Zod AOT의 Fast/Slow Path 원리]]
- [[Runtime-Validation-Libraries-Practice|실무 선택 기준, tRPC와 React Hook Form 통합, NestJS 팁, 면접 체크포인트]]

## 출처
- [dev.to @wakita181009 — Zod vs Typia vs Ajv, Vite 플러그인](https://dev.to/wakita181009/zod-vs-typia-vs-ajv-i-built-a-vite-plugin-that-makes-zod-60x-faster-with-zero-code-changes-1poc)
- [velog @miinhho — NestJS에서 Zod v4 적용해보기](https://velog.io/@miinhho/Nest.js-%EC%97%90%EC%84%9C-Zod-v4-%EC%A0%81%EC%9A%A9%ED%95%B4%EB%B3%B4%EA%B8%B0)

## 관련 문서
- [[TypeScript-AST|TypeScript와 AST (컴파일러 파이프라인)]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
- [[Types-As-Proofs|Types as Proofs]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
