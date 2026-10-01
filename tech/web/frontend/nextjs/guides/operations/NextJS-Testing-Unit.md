---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Jest와 Vitest 단위 테스트"]
---

# Next.js Jest와 Vitest 단위 테스트

## 테스트 경계와 시작 방법

Jest와 Vitest는 동기 Server Component와 Client Component의 렌더, props, 사용자 상호작용을 검증할 수 있다. `async` Server Component의 실행은 두 도구의 지원 범위 밖이므로 실제 서버 E2E로 검증한다. 스냅샷은 렌더 결과의 변경 신호이며 변경의 정당성은 사람이 확인한다.

새 프로젝트는 `npx create-next-app@latest --example with-jest with-jest-app` 또는 `--example with-vitest with-vitest-app`으로 시작할 수 있다. 기존 프로젝트에 아래 설정을 추가하는 방식과 구분한다. npm 명령은 같은 패키지를 설치하는 pnpm/yarn/bun 명령으로 바꿀 수 있다.

## Jest 설치와 설정

```sh
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom ts-node @types/jest
npm init jest@latest
```

```ts
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'
const createJestConfig = nextJest({ dir: './' })
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
  },
}
export default createJestConfig(config)
```

`dir`는 Next 설정과 환경 파일을 읽을 프로젝트 위치다. 래퍼를 export해야 비동기 Next 설정 로딩이 처리된다. JavaScript 설정은 타입 import를 빼고 CommonJS의 `require('next/jest')`, `module.exports`로 작성할 수 있다. `moduleNameMapper`는 실제 tsconfig/jsconfig의 `paths`에 맞춰 조정한다. 예제는 `@/components/*`가 프로젝트의 `components/*`를 가리킬 때다.

`next/jest`가 맡는 작업은 SWC 변환, CSS/CSS Module/SCSS와 이미지 import 모킹, `next/font` 모킹, 환경 파일 로딩, `node_modules`의 변환/테스트 제외, `.next` 테스트 제외, Next 설정의 SWC 플래그 로딩이다. 테스트 코드에서 환경 변수를 직접 쓰는 경우에는 필요한 환경 로딩을 Jest 설정 또는 setup에서 명시적으로 준비한다.

```ts
// jest.setup.ts
import '@testing-library/jest-dom'
```

v6 전에는 `@testing-library/jest-dom/extend-expect`를 사용하던 예가 있지만 v6부터 그 경로가 제거됐다. setup은 DOM용 matcher를 등록하며 앱 서버를 시작하지 않는다.

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## Jest 렌더와 스냅샷 예제

테스트할 `app/page.tsx`가 `<h1>Home</h1>`과 About 링크를 렌더한다고 가정한다. 예제의 `Page`는 동기 컴포넌트다.

```tsx
// __tests__/page.test.tsx
import { render, screen } from '@testing-library/react'
import Page from '../app/page'

test('홈 제목을 표시한다', () => {
  render(<Page />)
  expect(screen.getByRole('heading', { level: 1, name: 'Home' }))
    .toBeInTheDocument()
})

test('홈 렌더 결과를 기록한다', () => {
  const { container } = render(<Page />)
  expect(container).toMatchSnapshot()
})
```

`npm run test`는 현재 테스트를 실행하고 `npm run test:watch`는 변경을 지켜본다. 저장된 snapshot이 바뀌면 기대한 UI 변경인지 검토한 뒤 갱신한다. Testing Library와 Testing Playground는 접근 가능한 role/name으로 요소를 찾는 데 도움을 준다.

## Vitest 설치와 설정

```sh
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: { environment: 'jsdom' },
})
```

`vite-tsconfig-paths`는 TypeScript alias를 맞추는 선택이다. JavaScript 프로젝트에서 경로 매핑이 필요 없으면 해당 의존성과 플러그인을 빼고 `vitest.config.js`로 작성한다. React 플러그인은 JSX를, jsdom은 DOM 환경을 제공한다. Next의 서버 실행과 캐시 동작을 재현하는 설정은 아니다.

## Vitest 테스트와 실행

```tsx
// __tests__/page.test.tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '../app/page'

test('홈 제목을 찾는다', () => {
  render(<Page />)
  expect(screen.getByRole('heading', { level: 1, name: 'Home' }))
    .toBeDefined()
})
```

`__tests__`에 모으거나 `app`의 대상 파일 옆에 테스트를 둘 수 있다. `package.json`에 `"test": "vitest"`를 추가하고 `npm run test`로 실행한다. 로컬 기본 watch와 CI의 단발 실행 `vitest run`을 구분한다. matcher 확장은 Jest처럼 별도 등록이 필요하므로 위 예제는 Vitest 기본 assertion을 사용한다.

추가 설정은 공식 with-jest/with-vitest 예제, Jest/Vitest 매뉴얼과 React Testing Library를 함께 확인한다. 도구의 외부 매뉴얼 전체가 Next.js Docs 수집 범위에 포함되는 것은 아니다.

## 출처

- [Next.js, jest](https://nextjs.org/docs/app/guides/testing/jest)
- [Next.js, vitest](https://nextjs.org/docs/app/guides/testing/vitest)

## 관련 문서

- [[NextJS-Testing]]
- [[NextJS-Testing-E2E]]
- [[NextJS-Pages-Jest-Babel]]
