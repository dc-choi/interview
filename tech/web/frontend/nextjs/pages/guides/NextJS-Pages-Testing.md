---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router 테스트의 렌더와 서버 경계", "NextJS Pages Testing"]
---

# Pages Router 테스트의 렌더와 서버 경계

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 테스트 종류가 증명하는 범위

unit은 함수/작은 컴포넌트, component는 실제 렌더와 사용자 상호작용, integration은 연결된 기능, E2E는 브라우저부터 서버까지 전체 흐름을 검사한다. snapshot은 구조 변화 탐지이며 실제 라우팅과 권한 동작의 대체가 아니다.

Pages 컴포넌트는 `pages/index.tsx`를 import하지만 테스트 파일은 `pages` 바깥 `__tests__`/`tests` 등에 둔다. 기본 pageExtensions에 맞는 test 파일을 pages에 두면 route로 인식될 수 있다. App Server Component unit 테스트 제약을 Pages의 모든 테스트 제약으로 일반화하지 않는다.

## Jest와 Next transform

```ts
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })
export default createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
})
```

`next/jest`는 Next compiler transform, stylesheet/image/next/font mocks, env loading과 config를 연결한다. `jest.setup`에서 jest-dom matcher를 등록한다. alias는 moduleNameMapper와 실제 소스 위치를 맞춘다. env 변수를 직접 시험하려면 별도 setup에서 명시적으로 로딩한다.

Babel을 쓰는 기존 프로젝트는 `babel-jest`에 `next/babel` preset을 설정하고 CSS modules는 identity-obj-proxy, global CSS는 빈 mock, image는 파일 stub, font는 className/variable/style.fontFamily를 반환하는 mock을 구성한다. `server-only` mock과 ignore/coverage paths도 실제 test boundary에 맞춘다. 이 별도 설정을 기본 Next compiler 프로젝트에 중복으로 추가하지 않는다.

## Vitest와 DOM 조회

Vitest는 Vite React plugin, jsdom, React Testing Library를 설정하고 tsconfig paths를 plugin으로 연결할 수 있다. browser user action을 역할/이름으로 조회한다.

```tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

test('홈 제목을 표시한다', () => {
  render(<Home />)
  expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
})
```

Link가 렌더됐다는 assertion은 실제 navigation 성공 증거가 아니다. router context를 필요로 하는 컴포넌트는 해당 mock/provider를 제공하고 서버 데이터와 브라우저 이동은 E2E로 보완한다.

## Cypress의 component와 E2E

Cypress `defineConfig`의 e2e baseUrl을 현재 server와 맞추고 `cypress/e2e`에서 visit/click/URL/heading을 확인한다. component 모드는 Next framework와 bundler 설정으로 mount한다. isolated mount에는 `getServerSideProps` 실행이 포함되지 않는다.

TypeScript 5의 moduleResolution bundler를 사용할 때 Cypress 13.6.3 이전의 호환 문제를 고려한다. run/open은 headless/interactive 선택이다. production build/start를 먼저 실행하거나 start-server-and-test 같은 runner로 server 준비와 종료를 관리한다. CI에서는 충분한 browser dependency와 artifacts를 수집한다.

## Playwright의 실제 browser 흐름

```ts
import { test, expect } from '@playwright/test'

test('홈에서 소개 페이지로 이동한다', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
})
```

Chromium/Firefox/WebKit의 browser dependency를 설치한다. `webServer`로 production start 명령과 URL을 연결하고 local server 재사용은 환경에 맞춰 선택한다. localhost port가 바뀌면 baseURL도 바꾼다.

## Pages에 필요한 acceptance check

SSR cookie별 데이터, API 직접 호출 권한, dynamic route 첫 방문, fallback UI, ISR 실패 보존, client 이동의 query readiness와 history를 검사한다. 빌드가 되는지만 확인하면 이 동작을 증명할 수 없다. 실제 앱에 필요한 시나리오부터 골라 불필요한 test scaffolding을 늘리지 않는다.

## Pages page fixture와 도구별 경로

```tsx
// pages/index.tsx
import Link from 'next/link'
export default function Home() {
  return <div><h1>Home</h1><Link href="/about">About</Link></div>
}
```

```tsx
// pages/about.tsx
import Link from 'next/link'
export default function About() {
  return <div><h1>About</h1><Link href="/">Home</Link></div>
}
```

Playwright 원문은 JSX를 pages/index.ts와 about.ts로 표시하지만 실제 TypeScript JSX 파일은 .tsx로 둔다. Cypress component 테스트는 `import About from '../../pages/about'` 뒤 cy.mount하고 h1 About, `a[href="/"]` visible을 검사한다. 실제 click과 URL 변경은 E2E에서 검사한다. cy.mount 등록은 생성된 support adapter 설정을 전제한다.

Jest/Vitest unit은 `import Home from '../pages/index'`로 같은 fixture를 import한다. Jest는 render 후 heading level1이 toBeInTheDocument(), snapshot은 render 결과 container.toMatchSnapshot()이다. Vitest는 heading level1/name Home이 toBeDefined()다. .test/.spec 파일을 pages에 둬 route로 만들지 않는다.

공통 설치/quickstart/설정과 실행은 [[NextJS-Testing-Unit#Jest 설치와 설정]], [[NextJS-Testing-Unit#Vitest 설치와 설정]], [[NextJS-Testing-E2E#Cypress 설치와 E2E]], [[NextJS-Testing-E2E#Cypress 자동 실행과 CI]], [[NextJS-Testing-E2E#Playwright 설치와 구성]]을 따른다. App fixture 경로를 위 Pages fixture로 바꾸며 나머지 서버 readiness/DOM assertion/production 실행 계약은 같다. async Server Component 제약은 App 쪽 대상에 해당하며 Pages fixture는 동기 컴포넌트다.

Jest alias 예는 tsconfig/jsconfig `baseUrl:'./', paths:{'@/components/*':['components/*']}`와 moduleNameMapper `'^@/components/(.*)$':'<rootDir>/components/$1'`를 맞춘다. jest-dom v6은 extend-expect 경로가 제거되어 `import '@testing-library/jest-dom'`를 setup에 넣는다. v6 이전만 기존 경로를 사용한다.

## 학습 확인

- 컴포넌트 mount로 SSR 인증이 검증되지 않는 이유를 설명한다.
- dev와 production E2E에서 prefetch/ISR 차이를 확인한다.
- DOM 구조 snapshot과 사용자 이동 assertion의 목적을 구분한다.

## 출처

- [Next.js, testing](https://nextjs.org/docs/pages/guides/testing)
- [Next.js, cypress](https://nextjs.org/docs/pages/guides/testing/cypress)
- [Next.js, jest](https://nextjs.org/docs/pages/guides/testing/jest)
- [Next.js, playwright](https://nextjs.org/docs/pages/guides/testing/playwright)
- [Next.js, vitest](https://nextjs.org/docs/pages/guides/testing/vitest)

## 관련 문서

- [[NextJS-Testing]]
- [[NextJS-Pages-Server-Props]]
- [[NextJS-Pages-Navigation]]
