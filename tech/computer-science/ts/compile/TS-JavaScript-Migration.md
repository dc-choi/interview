---
tags: [cs, typescript, migration, declaration-file]
status: done
category: "CS - TypeScript"
aliases: ["JavaScript TypeScript 마이그레이션", "TypeScript 라이브러리 설계"]
verified_at: 2026-08-04
---

# JavaScript에서 TypeScript로 점진적 마이그레이션

마이그레이션의 목표는 파일 확장자를 바꾸는 것이 아니라 실행 동작을 유지하면서 검증되지 않은 경계를 줄이는 것이다. JavaScript와 TypeScript를 함께 검사하고, 의존성의 말단부터 변환하며, 엄격도를 되돌아가지 않게 올린다.

## 시작 전에 고정할 것

1. 기존 테스트와 빌드 결과를 기준선으로 만든다.
2. 입력 소스와 emit 출력 디렉터리를 분리해 원본 덮어쓰기를 막는다.
3. 현재 런타임에 맞는 `target`, `module`, `moduleResolution`을 함께 정한다.
4. `sourceMap`을 켜 emit된 JavaScript를 실행해도 원본 TypeScript 위치에서 디버깅할 수 있게 한다.

`noEmitOnError`의 기본값은 `false`다. CI에서 타입 오류를 실패로 만들려면 `tsc --noEmit`을 별도 검사 단계로 두거나 `noEmitOnError: true`를 명시한다.

## JavaScript 상태에서 검사 시작하기

`allowJs`는 `.js`를 프로젝트 입력과 import 대상으로 허용한다. `checkJs`는 포함된 JavaScript 파일에도 오류를 보고하며, 각 파일의 `// @ts-check`를 프로젝트 전체에 적용한 것과 같다.

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["src"]
}
```

오류가 너무 많으면 `// @ts-check`로 파일 단위에서 시작하고, 수정된 디렉터리부터 `checkJs` 범위를 넓힌다. JSDoc은 기존 JavaScript의 매개변수와 반환 계약을 표현할 수 있지만, 최종 타입 원천이 여러 곳으로 갈라지지 않게 관리한다.

## 의존성 방향으로 변환하기

- import graph의 말단인 유틸리티와 도메인 타입부터 옮긴다.
- 순환 의존성을 먼저 줄이면 변환 순서와 모듈 경계가 명확해진다.
- 외부 입력은 `unknown`으로 받고 validator 뒤에서 내부 타입으로 바꾼다.
- 아직 변환하지 않은 모듈은 최소한의 임시 `.d.ts` 또는 어댑터로 감싼다. 실제보다 정밀한 선언을 지어내지 않는다.
- 각 단계에서 테스트, 타입 검사와 실제 빌드를 모두 실행한다. 타입 검사만 통과해도 모듈 해석이나 emit 동작은 달라질 수 있다.

`noImplicitAny`는 가능한 한 일찍 새 코드에 적용하고, 기존 영역은 폴더나 하위 `tsconfig` 단위로 ratchet한다. 마이그레이션 완료 기준에는 명시적 `any` 검토와 `strict` 계열 옵션 적용을 포함한다.

## 타입 의존성과 공개 API

애플리케이션에서는 `typescript`와 보통의 `@types/*`를 개발 의존성으로 둔다. 라이브러리의 공개 `.d.ts`가 다른 선언 패키지를 노출한다면 소비자에게도 필요하므로 해당 선언 패키지는 `dependencies`에 있어야 할 수 있다.

라이브러리가 자체 타입을 포함하면 중복 `@types`를 설치하지 않는다. TypeScript 버전, 런타임 패키지와 선언 패키지 버전이 실제 API를 함께 설명하는지 확인한다.

라이브러리는 `declaration`으로 생성한 `.d.ts`를 패키지의 `types` 또는 exports 구성에서 노출한다. 소비자가 함수만 import해도 반환 타입을 이름으로 참조하고 확장할 수 있도록 공개 시그니처에 등장하는 도메인 타입을 의도적으로 export한다.

API 주석은 타입을 되풀이하지 않는다. TSDoc에는 단위, 전제 조건, 오류, 부작용과 예제를 남기고, 구조는 타입 선언을 단일 원천으로 둔다.

## 현재 런타임과 ECMAScript 우선 원칙

`enum`, 런타임 `namespace`, parameter property와 `import =`는 TypeScript 컴파일러가 JavaScript 코드를 만들어야 하는 문법이다. 표준 JavaScript 모듈, 객체, `#private` 필드로 같은 목적을 달성할 수 있으면 상호 운용성과 실행 도구 선택 폭이 넓어진다.

이 원칙은 모든 TypeScript 전용 문법이 잘못이라는 뜻이 아니다. 사용하는 런타임과 빌드 파이프라인이 기준이다. Node의 type stripping처럼 타입 문법만 지우는 실행 환경을 목표로 하면 `erasableSyntaxOnly`로 런타임 의미가 있는 TypeScript 문법을 미리 차단할 수 있다.

TypeScript의 `private`는 기본적으로 타입 검사 경계다. 실행 시 캡슐화가 필요하면 JavaScript `#private`를 사용한다.

## DOM과 런타임 객체

DOM 선언은 `EventTarget`, `Node`, `Element`, `HTMLElement` 같은 실제 Web API 계층을 모델링한다. 선택자는 `null`을 반환할 수 있고 타입 인수나 단언이 실제 요소 종류를 검증하지 않는다.

```typescript
const element = document.querySelector("#save");

if (!(element instanceof HTMLButtonElement)) {
  throw new Error("Save button not found");
}

element.disabled = true;
```

라이브러리 타입과 런타임 객체가 일치한다는 증거가 없으면 `as HTMLButtonElement`보다 실제 가드를 사용한다.

## 타입 자체를 테스트하기

- 공개 API의 정상 호출이 원하는 타입으로 추론되는지 검사한다.
- 잘못된 호출 앞에는 `@ts-expect-error`를 두어 오류가 사라졌을 때 테스트가 실패하게 한다.
- 오버로드보다 유니온 매개변수로 표현할 수 있으면 유니온을 우선한다. 유니온 값 자체를 전달할 수 있고 구현 시그니처도 단순해진다.
- callback의 `this`가 계약 일부라면 가짜 첫 매개변수 `this: T`로 선언한다. 화살표 함수는 자체 `this`를 갖지 않는다.
- 타입 테스트와 런타임 테스트는 서로 대체하지 않는다.

## 관련 문서

- [[option|컴파일러 옵션]]
- [[compile|컴파일과 emit]]
- [[TS-Any-Boundaries|any 경계 설계]]
- [[TS-Function-Overloading|함수 오버로딩]]
- [[TS-Class-Type-System|클래스 접근 제어]]
- [[TS-Module-Augmentation|선언 파일과 module augmentation]]

## 출처

- [TypeScript Handbook, Migrating from JavaScript](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)
- [TypeScript TSConfig, allowJs](https://www.typescriptlang.org/tsconfig/allowJs.html)
- [TypeScript TSConfig, checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html)
- [TypeScript TSConfig, sourceMap](https://www.typescriptlang.org/tsconfig/sourceMap.html)
- [TypeScript TSConfig, erasableSyntaxOnly](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html)
- [TypeScript Declaration Files, Publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [TypeScript Handbook, DOM Manipulation](https://www.typescriptlang.org/docs/handbook/dom-manipulation.html)
- [TSDoc, Doc Comment Syntax](https://tsdoc.org/pages/tags/doc_comment_syntax/)
- [이펙티브 타입스크립트 스터디 7-1회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91644)
- [이펙티브 타입스크립트 스터디 7-2회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91646)
