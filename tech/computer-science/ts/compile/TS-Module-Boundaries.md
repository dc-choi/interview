---
tags: [cs, typescript, modules, esm, commonjs]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript 모듈 경계", "TS barrel과 type import"]
verified_at: 2026-10-01
---

# TypeScript 모듈 경계

모듈은 파일 안의 이름을 감추고 공개 계약만 다른 파일에 전달한다. 타입 검사가 통과하는 import와 실행 환경이 실제로 해석할 수 있는 import를 함께 맞춰야 한다.

## 실행 환경부터 정하기

`module`은 출력과 모듈 의미를, `moduleResolution`은 import 대상 탐색 규칙을 정한다. 두 옵션을 독립적인 취향으로 고르지 않는다.

| 실행과 변환의 책임 | 기본 선택 방향 |
|---|---|
| `tsc`로 emit하고 Node.js에서 실행 | `module: "nodenext"`, 이에 맞는 `moduleResolution: "nodenext"` |
| 번들러가 변환과 모듈 해석을 담당 | `module: "esnext"` 또는 도구가 지원하는 `"preserve"`, `moduleResolution: "bundler"` |
| 여러 환경에서 소비하는 라이브러리 | 실제 배포 형식과 선언 파일을 소비자 환경에서 확인 |

Node 모드에서 `.mts`는 ESM, `.cts`는 CommonJS로 취급한다. `.ts`의 형식은 가까운 `package.json`의 `type` 같은 조건에 따라 결정된다. Node ESM의 상대 import는 출력 파일을 가리키는 `.js` 확장자를 소스에 적는 방식이 가능하다. 번들러에서 통과한 확장자 생략이나 alias가 Node 실행에서도 통과한다고 가정하지 않는다.

브라우저, 서버, worker와 테스트의 전역 선언은 다르다. 모든 환경을 한 `tsconfig`에 넣어 충돌을 숨기기보다 환경별 설정으로 나눈다. 버전별 옵션 변경과 `paths`의 한계는 [[option|컴파일러 옵션]]을 따른다.

## 타입 import와 실행 import

```typescript
import type { User } from "./user.js";
import { createUser } from "./user.js";
import "./register.js";

export type { User } from "./user.js";
export { createUser } from "./user.js";
```

`import type`과 `export type`은 emit에서 제거된다. 등록, polyfill 같은 부작용이 필요하면 별도의 실행 import로 의도를 남긴다. `verbatimModuleSyntax`에서는 `type` 표시가 없는 import/export를 유지하고, `import { type User }`는 바인딩만 없어져 `import {}`가 남을 수 있다. 모듈 실행까지 제거하려면 `import type { User }`를 사용한다.

이 옵션은 ESM 구문을 CommonJS의 `require`로 자동 변환하지 않는다. 파일이 CommonJS로 판정됐는데 ESM 구문을 쓰면 오류로 형식 불일치를 드러낸다. `import x = require("x")`, `export = x`는 특정 CommonJS 계약을 표현하는 별도 구문이므로 모두 폐기된 문법으로 취급하지 않는다.

## 공개 이름과 barrel

named export는 선언 이름을 공개 계약으로 유지한다. default export는 소비자가 이름을 정하며 프레임워크나 패키지의 계약에서 필요할 수 있다. 팀 관례와 소비 API를 보고 선택한다.

barrel은 여러 파일의 공개 진입점을 모으는 파일이다. 내부 구현 전체를 자동 공개하기보다 의도한 값과 타입을 명시한다.

```typescript
// index.ts
export { createUser } from "./create-user.js";
export type { User, CreateUserInput } from "./user.js";
```

`export *`는 default export를 재노출하지 않고, 여러 모듈의 같은 이름이 충돌할 수 있다. barrel이 내부 모듈에 다시 import되면 순환 의존이 생길 수 있으므로 내부 파일은 필요한 구현 파일을 직접 참조하는 편이 경계를 읽기 쉽다. barrel 자체가 번들 크기 감소나 순환 의존 해소를 보장하지 않는다.

## 동적 import

```typescript
async function openEditor() {
  const editorModule = await import("./editor.js");
  return editorModule.createEditor();
}
```

`import()`는 모듈 namespace 객체를 얻는 Promise를 반환한다. default export가 있으면 `module.default`로 접근하며, 반환 객체 자체를 함수처럼 호출하지 않는다. 동적 import 구문이 있다고 모든 환경에서 별도 chunk가 생성되는 것은 아니다. 번들 분할은 번들러의 분석과 설정, 실제 출력물을 확인한다.

`type EditorModule = typeof import("./editor.js")`는 타입 위치의 모듈 참조이며 위의 런타임 로딩과 다르다.

## namespace와 선언 파일의 경계

`namespace`는 관련 이름을 묶는 TypeScript 구문으로, 값 멤버가 있으면 런타임 객체를 생성할 수 있다. 파일을 로딩하고 의존성을 해석하는 ES 모듈의 대체물이 아니다. 일반 애플리케이션에서는 파일 모듈로 경계를 만들고, 기존 전역 라이브러리나 선언 병합 계약을 다룰 때 namespace의 필요성을 판단한다.

`declare`와 `.d.ts`는 실행 값을 만들지 않는다. 선언이 있다고 패키지가 설치되거나 런타임 export가 생기지 않으며, 배포한 JavaScript와 선언의 export 형식이 일치해야 한다. 기존 라이브러리 보강은 [[TS-Module-Augmentation|선언 병합과 module augmentation]], 점진적 도입은 [[TS-JavaScript-Migration|JavaScript 마이그레이션]]을 따른다.

## 관련 문서

- [[compile|TypeScript 컴파일]]
- [[TS-Declaration-Spaces-and-Inference|타입과 값 선언 공간]]
- [[TS-Diagnostics|타입 오류와 모듈 해석 진단]]

## 출처

책의 파일 모듈, barrel, 동적 import 설계 관점은 참고하되 당시의 `module` 설정 예시는 현재 실행 환경에 맞게 다시 선택한다.

- [TypeScript Deep Dive, Modules — Basarat](https://basarat.gitbook.io/typescript/project/modules)
- [TypeScript Deep Dive, Barrel — Basarat](https://basarat.gitbook.io/typescript/main-1/barrel)
- [TypeScript Deep Dive, Dynamic import expressions — Basarat](https://basarat.gitbook.io/typescript/project/dynamic-import-expressions)
- [TypeScript Deep Dive, Namespaces — Basarat](https://basarat.gitbook.io/typescript/project/namespaces)
- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [TypeScript, Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [TypeScript TSConfig, verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)
