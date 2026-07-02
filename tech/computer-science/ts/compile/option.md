---
tags: [cs, typescript]
status: done
category: "CS - TypeScript"
aliases: ["컴파일러 옵션", "option"]
---

# 컴파일러 옵션
include: 이 안의 내용은 컴파일러가 모두 읽어들인다.

### compilerOptions 설정
target: 컴파일러가 변환할 ECMAScript의 버전
module: 모듈 시스템을 설정
outDir: 컴파일된 파일을 저장할 디렉토리
strict: 모든 엄격한 타입 검사를 활성화
moduleDetection: TS는 기본적으로 글로벌 모듈이다. 그에 따른 글로벌, 개별 모듈 감지 방법을 설정
skipLibCheck: 타입 정의 파일을 검사하지 않음

### strict 계열 세부 옵션
`strict: true` 하나가 아래 엄격 검사 묶음을 한 번에 켠다. 새 프로젝트는 처음부터 켜는 것이 이득이다. 나중에 켜면 이미 쌓인 코드가 대량으로 에러를 뿜어 되돌리기 어렵다.

- `noImplicitAny`: 타입을 추론하지 못해 암묵적으로 `any`가 되는 지점을 에러로 만든다. "정말 아무 타입이나 되는 게 맞나"를 강제로 되묻는 옵션.
- `strictNullChecks`: `null`, `undefined`를 모든 타입에 암묵 포함하지 않는다. 꺼져 있으면 컴파일 타임 타입과 런타임 값이 어긋나기 쉽다. 켜면 옵셔널 체이닝이나 가드로 명시적으로 다뤄야 한다.
- `strictPropertyInitialization`: 클래스 필드가 선언 시 또는 생성자에서 초기화되는지 검사한다(strictNullChecks 필요). 미초기화 필드의 런타임 `undefined`를 잡는다. 확정 할당 단언 `!`은 "내가 책임진다"는 표시라 남발하면 안전망이 무너진다.
- `strictFunctionTypes`: 함수 매개변수의 반공변 호환성을 엄격히 검사.
- `strictBindCallApply`: `bind`, `call`, `apply` 인자 타입 검사.
- `noImplicitThis`: `this`가 암묵적 `any`가 되는 것을 막는다.
- `alwaysStrict`: 컴파일 결과에 `'use strict'`를 방출.

### strict 묶음 밖이지만 함께 권장
- `noImplicitReturns`: 함수의 모든 코드 경로가 값을 반환하는지 확인한다. 일부 분기에서 반환을 빠뜨리는 실수를 막는다.
- `noUnusedLocals`, `noUnusedParameters`: 미사용 지역 변수, 매개변수 검출.
- `noFallthroughCasesInSwitch`: switch의 의도치 않은 fall-through 방지.
- `exactOptionalPropertyTypes`: 옵셔널 속성에 `undefined` 명시 대입을 구분.

### 보강 습관
- **반환 타입 명시**: 추론에만 맡기지 말고 함수 반환 타입을 적으면, 구현이 계약을 어길 때 컴파일러가 즉시 잡는다. 함수 본문이 길수록 이득이 크다. 사용자뿐 아니라 작성자 자신을 위한 안전장치.
- **점진적 도입**: 기존 JS 프로젝트는 strict 전체를 한 번에 켜기 어렵다. `any`를 줄이고 `unknown`, 타입 가드, 유니언 타입부터 도입하며 파일 단위로 엄격도를 올린다.

### ts-node
esm: esm을 사용하여 ts-node를 실행

## 관련 문서
- [[타입스크립트(TS)|TS 개요]]
- [[타입특징|타입 특징 (any/unknown, 추론)]]
- [[TS-Type-Narrowing|Type Narrowing]]

## 출처
- [우아한테크 — 우아한 타입스크립트](https://www.youtube.com/watch?v=ViS8DLd6o-E)
