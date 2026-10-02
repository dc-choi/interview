---
tags: [cs, typescript, compiler, ast, tooling]
status: done
verified_at: 2026-09-03
category: "CS - TypeScript"
aliases: ["TypeScript AST", "TypeScript 컴파일러", "AST"]
---

# TypeScript와 AST

TypeScript 컴파일러는 소스 코드를 **AST(Abstract Syntax Tree)** 로 변환한 뒤 타입을 검사하고 JavaScript로 변환한다. AST는 린터, 코드 변환기, 타입 체커 같은 모든 정적 분석 도구의 공통 기반이다. TypeScript 7.0의 `typescript` 패키지에는 stable compiler API가 없으므로, 현재 직접 다룰 때는 TypeScript 6 호환 패키지 또는 7.0의 비안정 API를 사용해야 한다.

## 핵심 명제

- 소스 코드는 **Scanner(토큰화) → Parser(AST 생성) → Checker(의미 분석) → Emitter(코드 생성)** 파이프라인을 거친다
- **AST = 코드의 구조를 트리로 표현한 중간 표현**. 기계가 이해하고 조작하기 쉬운 형태
- TypeScript는 JavaScript 문법과 타입 문법을 함께 파싱하고 타입 검사를 수행한다. JavaScript 엔진의 AST와 별개인 빌드 도구의 표현이다.
- **린터, 포매터, 번들러, 트랜스파일러**는 모두 AST를 읽거나 변환

## TypeScript 컴파일러 파이프라인

| 단계 | 입력 → 출력 | 역할 |
|---|---|---|
| **Scanner** | 소스 문자열 → 토큰 | 어휘 분석. 키워드/식별자와 토큰 구분. 공백과 주석(trivia)의 처리도 옵션과 목적에 따라 다름 |
| **Parser** | 토큰 → AST | 구문 분석. 문법 트리 생성 |
| **Binder** | AST → 심볼 테이블 | 스코프, 식별자 해석 |
| **Type Checker** | AST + 심볼 → 타입 검증 결과 | TS 고유. 타입 추론, 검사, 에러 보고 |
| **Transformer** | AST → 변환된 AST | 타입 구문 제거, ES 버전 다운레벨, 커스텀 변환 |
| **Emitter** | 변환된 AST → JS/선언 파일 | 코드 생성 |

타입 검사는 실행 전에 수행한다. 타입 주석과 interface 등 타입 전용 문법은 emit 결과에서 제거된다. 반면 enum, namespace의 값 멤버와 parameter property 같은 TypeScript 구문은 JavaScript 구현을 생성할 수 있다.

## AST 노드의 구조

모든 AST 노드는 공통 인터페이스를 가진다.

```ts
interface Node {
  kind: SyntaxKind;       // 노드 종류 (FunctionDeclaration, Identifier 등)
  flags: NodeFlags;
  parent: Node;          // 생성 방식과 순회 환경에 따라 연결 여부 확인
  pos: number;            // 소스 내 시작 위치
  end: number;            // 종료 위치
}
```

예: `const x = 1 + 2;`는 다음 AST로 변환.

```
VariableStatement
 └─ VariableDeclarationList (const)
     └─ VariableDeclaration (x)
         └─ BinaryExpression (+)
             ├─ NumericLiteral (1)
             └─ NumericLiteral (2)
```

[ts-ast-viewer.com](https://ts-ast-viewer.com)에서 실제 소스의 AST를 시각적으로 탐색 가능.

## TS와 JS의 처리 차이

| 단계 | JavaScript | TypeScript |
|---|---|---|
| 파싱 | Scanner → Token → AST | 동일 (TS 고유 확장) |
| 의미 분석 | (ESLint 선택적) | **Type Checker 내장** |
| 변환 | Babel 플러그인 | **타입 제거** + Babel과 유사 트랜스폼 |
| 실행 | V8 JIT | (TS는 실행 안 됨, JS로 변환된 뒤 실행) |

**런타임에는 타입이 없다** — 타입 체커는 빌드 시점 도구. 런타임 검증이 필요하면 [[Runtime-Validation-Libraries]] 사용.

## AST 기반 도구의 동작 원리

같은 AST 자원을 어떻게 쓰느냐에 따라 도구의 역할이 갈린다.

| 도구 | AST 활용 방식 |
|---|---|
| **ESLint** | AST 순회(traverse) → 규칙 위반 식별 → 리포트 |
| **Prettier** | AST → 재포매팅 → 소스 재생성 |
| **Babel** | AST → 플러그인으로 변환 → 코드 생성 |
| **TypeScript** | AST → 타입 검사 → 변환 + emit |
| **Vite/esbuild** | 빠른 파서로 AST → 번들링 |
| **jscodeshift** | AST 변환으로 대규모 코드 리팩토링 |
| **ts-morph, Typia** | TypeScript AST 분석과 변환, 타입 기반 코드 생성 |

tRPC는 코드 생성이나 AST 분석 없이 서버 라우터 타입을 클라이언트가 그대로 참조해 타입 안전성을 얻는다. Prisma는 TypeScript AST가 아니라 자체 스키마 언어인 PSL에서 클라이언트를 생성한다.

## TypeScript 6 Compiler API — 직접 쓰는 방법

다음 코드는 TypeScript 6까지의 compiler API 예제다. TypeScript 7.0의 `typescript` 패키지에는 stable API가 없으므로 같은 API가 필요하면 `@typescript/typescript6` 호환 패키지를 사용한다. 7.0에는 `typescript/unstable/ast` 같은 비안정 진입점도 있지만 이후 릴리스에서 바뀔 수 있다.

```ts
import * as ts from '@typescript/typescript6';

const source = `const x: number = 42;`;
const sourceFile = ts.createSourceFile(
  'example.ts',
  source,
  ts.ScriptTarget.Latest,
  true
);

function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node)) {
    console.log('변수:', node.name.getText());
    console.log('타입:', node.type?.getText());
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
```

`ts.forEachChild`, `ts.visitEachChild`로 트리 순회, `ts.isXxx` 타입 가드로 노드 종류 판별.

### 구문 트리와 타입 정보 구분

`createSourceFile`은 한 파일의 구문 트리를 만들지만 import 관계를 해석하고 타입을 검사한 프로젝트는 아니다. 여러 파일의 의미를 분석하려면 `Program`이 관리하는 소스 파일과 `program.getTypeChecker()`를 사용한다. `CompilerHost`는 파일 읽기와 모듈 해석 등 컴파일러가 외부 환경에 접근하는 경계를 제공한다.

- `Symbol`: 선언된 이름과 그 선언들을 연결하는 의미 분석 객체다. JavaScript의 런타임 `Symbol` primitive와 다르다.
- `Type`: 특정 표현이나 선언이 가진 타입 정보다. `checker.getTypeAtLocation(node)`와 `typeToString` 같은 API로 확인한다.
- `node.type`: 소스에 명시한 타입 구문 노드다. 타입 주석이 없는 표현의 추론 타입까지 담고 있지는 않는다.
- `forEachChild`: 구문적 자식 노드를 방문한다. `getChildren`은 토큰과 `SyntaxList`를 포함해 더 구체적인 트리 표현을 반환한다.
- `pos`와 `getStart()`: 앞의 trivia를 포함한 위치와 실제 구문 시작 위치가 다를 수 있다. 코드 치환 도구는 이를 구분한다.

Compiler API의 내부 함수와 노드 구조는 버전에 민감하다. 책의 binder/checker/emitter 내부 구현은 파이프라인 이해에 참고하고, 실제 도구는 사용하는 패키지 버전의 공개 API와 출력물을 확인한다.

## 실무 활용 사례

- **커스텀 린터 룰** — 팀 내 코드 컨벤션 강제 (특정 API 사용 금지, 패턴 요구)
- **코드 마이그레이션** — 대규모 API 변경을 자동 적용 (jscodeshift, ts-morph)
- **타입 기반 스키마 생성** — 타입 선언에서 OpenAPI/JSON Schema 자동 생성
- **성능 최적화** — 컴파일 타임에 검증 함수 미리 생성 ([[Runtime-Validation-Libraries]]의 Typia, Zod AOT)
- **디버깅 도구** — AST를 시각화해 학습, 문제 파악
- **Dead Code 제거** — AST 분석으로 미사용 export 찾기

## 자주 헷갈리는 포인트

- **AST ≠ Parse Tree** — Parse Tree는 문법 규칙을 그대로 반영, AST는 **의미 있는 구조만** 추상화
- **타입 별칭과 interface는 런타임에 없음** — 이름으로 `instanceof` 검증할 수 없다. 런타임 값인 class는 `instanceof`, primitive는 `typeof`로 좁힐 수 있지만 외부 객체의 전체 schema 검증과는 다르다.
- **Babel의 AST와 TS의 AST는 다름** — 호환 안 됨. Babel-TS 플러그인이 있긴 하지만 기능 제한
- **ESLint의 AST는 ESTree 스펙** — TS AST와는 별도. `@typescript-eslint/parser`로 연결
- **컴파일 시간이 긴 이유** — Type Checker가 프로젝트 전체 심볼을 분석. `tsc --noEmit`으로도 시간이 상당
- **incremental 빌드의 의미** — 직전 컴파일의 project graph 정보(파일 목록, 버전과 시그니처, 옵션, 참조 관계, 캐시된 진단)를 `.tsbuildinfo`에 저장해 다음 실행에서 다시 검사하고 emit할 최소 파일 집합을 계산. AST나 타입 자체를 캐시하지는 않음

## 면접 체크포인트

- **TS 컴파일러 파이프라인 6단계** (Scanner, Parser, Binder, Type Checker, Transformer, Emitter)
- **AST가 무엇이고 왜 필요한가** — 정적 분석, 변환의 공통 기반
- **TS 타입이 런타임에 없는 이유**와 그 의미
- ESLint, Prettier, Babel이 **같은 AST 자원**을 어떻게 다르게 쓰는지
- **TS Compiler API**로 할 수 있는 일 5가지 (린터, 마이그레이션, 코드 생성, 검증, 디버깅)
- `tsc --noEmit`, `incremental` 옵션의 의미
- **AST 기반 최적화**(Zod AOT, Typia)가 런타임 검증을 어떻게 가속하는가

## 출처
- [velog @chltjdrhd777 — Typescript와 AST](https://velog.io/@chltjdrhd777/Typescript%EC%99%80-AST)
- [TypeScript Deep Dive, Compiler Internals — Basarat](https://basarat.gitbook.io/typescript/overview)
- [Using the Compiler API — microsoft/TypeScript](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Announcing TypeScript 7.0 — Microsoft](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript TSConfig, incremental](https://www.typescriptlang.org/tsconfig/incremental.html)
- [tRPC](https://trpc.io/)

## 관련 문서
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[Runtime-Validation-Libraries|Runtime 검증 라이브러리 (Zod/Typia/Ajv)]]
- [[Compile-and-Runtime|컴파일과 런타임]]
