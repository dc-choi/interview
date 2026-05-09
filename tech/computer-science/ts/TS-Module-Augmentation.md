---
tags: [cs, typescript, declaration-merging, module-augmentation, dts]
status: done
category: "CS - TypeScript"
aliases: ["TS Module Augmentation", "Declaration Merging", "declare global", "declare module"]
---

# TypeScript Declaration Merging · Module Augmentation

같은 이름으로 여러 번 선언된 타입을 컴파일러가 **자동 병합**하는 기능과, 외부 모듈·전역 타입에 새 멤버를 끼워 넣는 기법. **소스 코드를 수정하지 않고 타입 시스템을 확장**하는 것이 핵심.

## Declaration Merging — 선언 병합

같은 스코프에서 같은 이름으로 여러 번 선언된 항목이 자동으로 합쳐진다.

| 선언 종류 | 병합 가능 | 예 |
|-----------|---------|-----|
| `interface` + `interface` | ✅ | 멤버 합집합 |
| `namespace` + `namespace` | ✅ | exports 합집합 |
| `interface` + `namespace` | ✅ | static 멤버 추가 |
| `class` + `namespace` | ✅ | static 멤버·중첩 타입 |
| `function` + `namespace` | ✅ | 함수에 속성 부착 |
| `type` + `type` | ✗ | 중복 선언 에러 |
| `interface` + `type` | ✗ | 에러 |

`interface`는 병합되지만 `type`은 안 됨 — 라이브러리 확장에 `interface`를 쓰는 결정적 이유.

```ts
// 같은 파일에서
interface User { name: string; }
interface User { email: string; }
const u: User = { name: 'dc', email: 'x@x' };   // 자동 병합
```

## Module Augmentation — 외부 모듈 확장

설치된 라이브러리의 타입에 멤버를 추가. 라이브러리 코드는 안 건드림.

```ts
// types/lodash.d.ts (또는 src 안 어디든)
import 'lodash';

declare module 'lodash' {
  interface LoDashStatic {
    myCustomMethod(): void;
  }
}
```

핵심 규칙:
- **`import 'lodash'`** 같은 import문이 같은 파일에 있어야 모듈로 인식되어 augmentation이 적용.
- **interface 멤버 추가만** 가능 — 새 export 추가는 불가.
- 원본과 같은 모듈명을 그대로 사용.

흔한 사례: `Express.Request`에 사용자 정의 필드, `axios`의 `AxiosRequestConfig`에 옵션, `vite`/`vue` 환경에 import.meta.env 확장.

## Global Augmentation — 전역 타입 확장

브라우저 `Window`·Node.js `Process`·`globalThis`에 멤버 추가.

```ts
declare global {
  interface Window {
    myCustomProperty: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      JWT_SECRET: string;
    }
  }
}
export {};   // 이 파일을 모듈로 만들기 위해 필수
```

`export {}` 또는 다른 import/export가 있어야 **모듈 스코프로 인식**. 없으면 스크립트 파일로 취급되어 `declare global` 자체가 의미 없어짐.

`ProcessEnv` 확장은 `process.env.X`가 타입 안전해지는 표준 패턴 — 모든 Node 프로젝트에 도움.

## `declare` 키워드의 의미

`declare`는 **컴파일러에 "이 심볼이 런타임에 존재함"이라고 알려주는 것** — 코드는 emit 안 됨.

| 형식 | 용도 |
|------|------|
| `declare const X: T` | 외부에서 정의된 변수 |
| `declare function f(): T` | 외부 함수 |
| `declare class C` | 외부 클래스 |
| `declare module 'name'` | 외부 모듈 (augmentation 또는 ambient) |
| `declare global` | 전역 스코프 진입 |
| `declare namespace` | 외부 namespace |

## `.d.ts` 파일

타입 정의 전용 파일. 런타임 코드 없이 **타입만 export**.

```ts
// my-lib.d.ts
export interface Config { apiKey: string; }
export function init(config: Config): void;
```

| 패턴 | 위치 |
|------|------|
| 라이브러리 자체 타입 | `dist/index.d.ts` (자동 생성) |
| Community 타입 | `@types/<lib>` (DefinitelyTyped) |
| 프로젝트 글로벌 타입 | `src/types/global.d.ts` |
| Module Augmentation | `src/types/<lib>.d.ts` |

`tsconfig.json`의 `include`·`typeRoots`·`types`로 인식 범위 조정.

## 실전 예 — Express Request 확장

```ts
// types/express.d.ts
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
      requestId?: string;
    }
  }
}
export {};
```

미들웨어가 `req.user = ...`를 주입하는 패턴이 타입 안전해짐. NestJS의 `@CurrentUser()` 같은 데코레이터도 이 augmentation 위에서 동작.

## 모호함 함정

같은 augmentation을 **여러 위치**에서 정의하면 모두 병합 — 의도와 다른 충돌 발생 가능.

```ts
// libA.d.ts
declare module 'express' {
  interface Request { tenantId: string; }
}

// libB.d.ts
declare module 'express' {
  interface Request { tenantId?: number; }   // ❌ 타입 충돌
}
```

타입 호환되지 않으면 컴파일 에러. **모노레포·플러그인**에서 자주 발생 — augmentation은 한 곳에 모아 관리.

## 흔한 실수

- **`declare global` 안에서 `export {}` 누락** → 스크립트 파일로 취급, augmentation 무효화.
- **Module augmentation에 `import` 없음** → 모듈로 인식 안 돼 augmentation 무시.
- **`type` 별칭으로 augmentation 시도** → 병합 안 됨. interface로.
- **새 export 추가하려고 augmentation 시도** → 멤버 추가만 가능, export는 불가.
- **여러 곳에서 같은 모듈 augmentation 충돌** → 컴파일 에러. 한 곳에 집중.
- **`@types/<lib>`와 라이브러리 자체 타입 충돌** → 라이브러리가 자체 `.d.ts` 가졌으면 `@types` 제거.
- **`tsconfig`의 `types` 옵션이 막아서 augmentation 안 잡힘** → typeRoots·types 설정 점검.
- **VSCode가 augmentation 못 잡음** → TS 서버 재시작 (`Cmd+Shift+P` → Restart TS Server).

## 면접 체크포인트

- Declaration Merging 가능한 선언 종류 — interface·namespace는 가능, type은 불가
- 라이브러리 확장에 interface를 쓰는 결정적 이유 — 병합 가능성
- Module Augmentation 적용 조건 — 같은 파일에 import 또는 export 필요
- `declare global` 안 `export {}`가 필요한 이유 — 모듈 스코프 진입
- `declare`의 의미 — 런타임 코드 emit 안 함, 타입만
- `.d.ts` 파일의 역할과 `@types` (DefinitelyTyped)
- ProcessEnv augmentation으로 환경변수 타입 안전성 확보
- Express Request 확장 패턴 (NestJS·미들웨어)
- 여러 위치 augmentation 충돌 시 동작

## 관련 문서

- [[TS-Type-vs-Interface|type vs interface (선언 병합·유니온)]]
- [[TypeScript-Type-Compatibility|TS 타입 호환성]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍]]
- [[TypeScript-AST|TypeScript와 AST]]
- [[Runtime-Validation-Libraries|Runtime 검증 라이브러리]]
