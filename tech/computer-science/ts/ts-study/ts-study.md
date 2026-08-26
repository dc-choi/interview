---
tags: [cs, typescript]
status: done
verified_at: 2026-08-26
category: "CS - TypeScript"
aliases: ["ts-study"]
---

# ts-study

스터디 중 작성한 TypeScript 예시다. 소스는 `src/*.mts`에 있고, 컴파일 결과는 `dist/*.mjs`에 생성된다.

## 실행

이 폴더에서 잠금 파일 기준으로 의존성을 설치한 뒤 타입 검사와 빌드를 분리해 실행한다.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm build
node dist/test2.mjs
```

다른 예시는 마지막 경로만 바꾼다. 예를 들어 enum 예시는 `dist/test24.mjs`를 실행한다. `typecheck`는 `tsc --noEmit`으로 JavaScript 파일을 만들지 않고 타입만 검사한다.

## 출처

- [TypeScript TSConfig, noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html)
