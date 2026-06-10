---
tags: [runtime, nodejs]
status: note
category: "OS & Runtime"
aliases: ["타입스크립트"]
---

# TypeScript in Node.js

## 개요
```
TypeScript는 Microsoft가 개발한 오픈소스 언어. JavaScript에 타입 시스템을 추가하여
편집기 통합과 조기 오류 감지를 지원한다.
```

## 기본 문법
```typescript
type User = { name: string; age: number };

function isAdult(user: User): boolean {
  return user.age >= 18;
}

const justine = { name: 'Justine', age: 23 } satisfies User;
const isJustineAnAdult = isAdult(justine);  // boolean 타입 추론
```

## Node.js에서 TypeScript 실행 방법

| 방법 | 버전 요구 | 명령어 |
|------|---------|--------|
| 네이티브 (플래그 없음) | v22.18.0+ | `node example.ts` |
| 네이티브 (플래그) | v22.6.0+ | `node --experimental-strip-types example.ts` |
| 고급 변환 (enum, namespace) | v22.7.0+ | `node --experimental-transform-types example.ts` |
| 트랜스파일 | 모든 버전 | `npx tsc example.ts && node example.js` |
| ts-node (타입 체크 O) | 모든 버전 | `npx ts-node example.ts` |
| tsx (타입 체크 X, 빠름) | 모든 버전 | `npx tsx example.ts` |

## 타입 정의
```bash
npm add --save-dev @types/node   # Node.js API 타입 정의
```
```typescript
import { resolve } from 'node:path';
resolve(123, 456);  // 오류: Argument of type 'number' is not assignable to type 'string'
```

## TS 패키지 발행
```
- main 필드는 JavaScript 파일을 가리켜야 함 (main.ts → "main": "main.js")
- Node.js는 node_modules에서 타입 스트리핑을 하지 않음 (성능)
- 발행 전에 tsc로 .js + .d.ts 생성
- TypeScript 5.8+에서 erasableSyntaxOnly 설정 권장
```
```json
{
  "files": ["*.js", "*.d.ts", "*.d.ts.map", "package.json", "README.md", "LICENSE"]
}
```
