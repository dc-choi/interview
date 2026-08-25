---
tags: [cs, typescript, type-system, type-theory, curry-howard, subtyping]
status: index
category: "CS - TypeScript"
aliases: ["TS Type System Principles", "TS 타입 시스템 원리"]
---

# TS 타입 시스템 원리

타입을 집합과 명제로 보는 관점, 그리고 이름이 아니라 구조로 호환을 판정하는 규칙처럼 TS 타입 시스템의 밑바탕이 되는 원리를 모은다. 집합, 대수적 타입, 추론, 좁히기, 단언 실습 코드는 같은 폴더의 `.mts` 파일에 있다.

- [[Types-As-Proofs|타입은 증명이다]]: 커리-하워드 대응, never와 exhaustive switch, TS가 의도적으로 불건전한 지점, OOP와 함수형 비교
- [[TypeScript-Type-Compatibility|타입 호환성]]: 구조적 타이핑과 명목 타이핑, 초과 속성 검사(freshness), 공변/반공변, Brand 타입

## 함께 볼 문서

- [[타입스크립트(TS)|TypeScript]]
