---
tags: [runtime, nodejs, typescript, tooling]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Node.js TypeScript", "Node TypeScript 실행"]
---

# Node.js에서 TypeScript 개발과 실행

TypeScript는 Node.js의 별도 런타임이 아니다. 타입 검사는 실행 전에 수행하고, Node.js는 타입 문법을 제거하거나 미리 생성한 JavaScript를 실행한다. 개발 환경은 지원 중인 Node.js LTS와 프로젝트 로컬 TypeScript 의존성을 기준으로 재현 가능하게 구성한다.

## 환경 구성

```bash
npm init -y
npm install --save-dev typescript @types/node tsx
npx tsc --init
```

전역 `typescript` 설치는 프로젝트마다 다른 컴파일러 버전을 숨길 수 있다. `package.json`과 lockfile에 버전을 고정하고 package script나 `npx tsc`로 실행한다. PATH 설정은 운영체제보다 설치 방식에 좌우된다. 공식 installer, Homebrew, `nvm` 같은 version manager가 PATH를 구성하는 방식이 다르므로 특정 shell 초기화 파일을 모든 환경의 정답으로 고정하지 않는다.

2026-08-04 기준 Node.js 24는 LTS, 26은 Current이며 18과 20은 EOL이다. 새 프로젝트는 조직의 배포 환경과 라이브러리가 지원하는 LTS를 선택하고, 고정된 과거 major를 일반 권장 버전으로 남기지 않는다.

## 실행 경로를 분리해서 선택하기

| 경로 | 타입 검사 | 실행 특성 |
|---|---|---|
| `tsc` 후 `node dist/main.js` | `tsc`가 수행 | 배포 산출물을 명시적으로 생성 |
| `tsx src/main.ts` | 기본적으로 별도 수행 필요 | 개발 중 빠른 변환과 실행 |
| `node src/main.ts` | 수행하지 않음 | Node가 지원하는 erasable TypeScript 문법만 제거 |

Node의 내장 type stripping은 `tsconfig.json`을 읽지 않고 타입 오류를 찾지 않는다. `paths` 별칭도 변환하지 않으며 `enum`, parameter property처럼 JavaScript로 바꾸는 변환이 필요한 문법은 기본 stripping 대상이 아니다. 타입 검사와 실행을 분리해 CI에서는 `tsc --noEmit`을 별도로 수행한다.

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "dev": "tsx src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js"
  }
}
```

## 타입과 런타임 import

타입 전용 의존성은 `import type`으로 표시한다. 타입 이름을 일반 import로 가져오면 실행 도구와 compiler option에 따라 불필요한 런타임 import가 남거나, 실제 export가 없어 실패할 수 있다.

```typescript
import type { ServerOptions } from "node:https";
import { createServer } from "node:https";
```

`@types/node`는 Node API의 정적 선언을 제공할 뿐 런타임 기능을 추가하지 않는다. 라이브러리 패키지는 소비자의 실행 도구에 TypeScript 변환을 떠넘기지 말고 보통 JavaScript와 `.d.ts`를 함께 발행한다. Node는 `node_modules`의 TypeScript 타입 제거를 기본 지원 대상으로 삼지 않는다.

## 관련 문서

- [[option|TypeScript 컴파일러 옵션]]
- [[TS-Declaration-Spaces-and-Inference|타입 공간과 값 공간]]
- [[TS-Class-Type-System|TypeScript 클래스 타입 시스템]]

## 출처

- [Node.js, Previous Releases](https://nodejs.org/en/about/previous-releases)
- [Node.js, Modules: TypeScript](https://nodejs.org/api/typescript.html)
- [TypeScript, Download](https://www.typescriptlang.org/download/)
- yongsoocho, [Node.js 설치](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136785)
- yongsoocho, [환경 변수 설정, Windows](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136786)
- yongsoocho, [환경 변수 설정, macOS와 Linux](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136787)
- yongsoocho, [TypeScript 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136788)
