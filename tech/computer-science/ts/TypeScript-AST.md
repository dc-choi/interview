---
tags: [cs, typescript, compiler, ast, tooling]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["TypeScript AST", "TypeScript 컴파일러", "AST"]
---

# TypeScript와 AST

TypeScript 컴파일러는 소스 코드를 **AST(Abstract Syntax Tree)** 로 변환한 뒤 타입을 검사하고 JavaScript로 변환한다. AST는 린터·코드 변환기·타입 체커 같은 모든 정적 분석 도구의 공통 기반이며, TS Compiler API로 직접 다룰 수 있다.

## 핵심 명제

- 소스 코드는 **Scanner(토큰화) → Parser(AST 생성) → Checker(의미 분석) → Emitter(코드 생성)** 파이프라인을 거친다
- **AST = 코드의 구조를 트리로 표현한 중간 표현**. 기계가 이해하고 조작하기 쉬운 형태
- TS는 JS 파이프라인 앞에 **자체 AST + 타입 체커 단계**를 추가
- **린터·포매터·번들러·트랜스파일러**는 모두 AST를 읽거나 변환

## TypeScript 컴파일러 파이프라인

| 단계 | 입력 → 출력 | 역할 |
|---|---|---|
| **Scanner** | 소스 문자열 → 토큰 | 어휘 분석. 공백·주석 제거, 키워드/식별자 구분 |
| **Parser** | 토큰 → AST | 구문 분석. 문법 트리 생성 |
| **Binder** | AST → 심볼 테이블 | 스코프·식별자 해석 |
| **Type Checker** | AST + 심볼 → 타입 검증 결과 | TS 고유. 타입 추론·검사·에러 보고 |
| **Transformer** | AST → 변환된 AST | 타입 구문 제거·ES 버전 다운레벨·커스텀 변환 |
| **Emitter** | 변환된 AST → JS/선언 파일 | 코드 생성 |

TS 고유 단계는 Type Checker. 타입은 Emitter 전에 **완전히 제거**되며 런타임에 존재하지 않는다.

## AST 노드의 구조

모든 AST 노드는 공통 인터페이스를 가진다.

```ts
interface Node {
  kind: SyntaxKind;       // 노드 종류 (FunctionDeclaration·Identifier 등)
  flags: NodeFlags;
  parent: Node;
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
| **tRPC·Prisma** | AST 분석으로 타입 기반 API 생성 |

## TS Compiler API — 직접 쓰는 방법

```ts
import * as ts from 'typescript';

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

`ts.forEachChild`·`ts.visitEachChild`로 트리 순회, `ts.isXxx` 타입 가드로 노드 종류 판별.

## 실무 활용 사례

- **커스텀 린터 룰** — 팀 내 코드 컨벤션 강제 (특정 API 사용 금지·패턴 요구)
- **코드 마이그레이션** — 대규모 API 변경을 자동 적용 (jscodeshift·ts-morph)
- **타입 기반 스키마 생성** — 타입 선언에서 OpenAPI/JSON Schema 자동 생성
- **성능 최적화** — 컴파일 타임에 검증 함수 미리 생성 ([[Runtime-Validation-Libraries]]의 Typia·Zod AOT)
- **디버깅 도구** — AST를 시각화해 학습·문제 파악
- **Dead Code 제거** — AST 분석으로 미사용 export 찾기

## 자주 헷갈리는 포인트

- **AST ≠ Parse Tree** — Parse Tree는 문법 규칙을 그대로 반영, AST는 **의미 있는 구조만** 추상화
- **TS 타입은 런타임에 없음** — `typeof`·`instanceof`로 검증 불가. 런타임 검증은 별도 라이브러리
- **Babel의 AST와 TS의 AST는 다름** — 호환 안 됨. Babel-TS 플러그인이 있긴 하지만 기능 제한
- **ESLint의 AST는 ESTree 스펙** — TS AST와는 별도. `@typescript-eslint/parser`로 연결
- **컴파일 시간이 긴 이유** — Type Checker가 프로젝트 전체 심볼을 분석. `tsc --noEmit`으로도 시간이 상당
- **incremental 빌드의 의미** — `tsBuildInfo`에 AST·타입 정보를 저장해 재컴파일 시간 단축

## 면접 체크포인트

- **TS 컴파일러 파이프라인 6단계** (Scanner·Parser·Binder·Type Checker·Transformer·Emitter)
- **AST가 무엇이고 왜 필요한가** — 정적 분석·변환의 공통 기반
- **TS 타입이 런타임에 없는 이유**와 그 의미
- ESLint·Prettier·Babel이 **같은 AST 자원**을 어떻게 다르게 쓰는지
- **TS Compiler API**로 할 수 있는 일 5가지 (린터·마이그레이션·코드 생성·검증·디버깅)
- `tsc --noEmit`·`incremental` 옵션의 의미
- **AST 기반 최적화**(Zod AOT·Typia)가 런타임 검증을 어떻게 가속하는가

## 출처
- [velog @chltjdrhd777 — Typescript와 AST](https://velog.io/@chltjdrhd777/Typescript%EC%99%80-AST)
- [TS AST Viewer](https://ts-ast-viewer.com)

## 관련 문서
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[Runtime-Validation-Libraries|Runtime 검증 라이브러리 (Zod/Typia/Ajv)]]
- [[Compile-and-Runtime|컴파일과 런타임]]
