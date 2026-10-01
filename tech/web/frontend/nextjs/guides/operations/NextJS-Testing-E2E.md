---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Cypress와 Playwright 실행"]
---

# Next.js Cypress와 Playwright 실행

## 실제 서버와 브라우저

E2E는 실행 중인 Next 앱에 브라우저로 접속한다. production build에서 검증하면 개발 서버와 다른 prerender/bundling 동작도 확인할 수 있다. 예제 프로젝트는 `app/page.tsx`에서 Home 제목과 `/about` 링크를, `app/about/page.tsx`에서 About 제목과 홈 링크를 렌더한다고 가정한다.

새 프로젝트는 `npx create-next-app@latest --example with-cypress with-cypress-app` 또는 `--example with-playwright with-playwright-app`으로 시작할 수 있다. 기존 프로젝트는 아래 수동 구성을 사용한다. 패키지 관리자별 명령 차이는 설치할 패키지와 실행 스크립트가 같은 한 통합할 수 있다.

## Cypress 설치와 E2E

```sh
npm install -D cypress
npx cypress open
```

`"cypress:open": "cypress open"`을 scripts에 두고 `npm run cypress:open`으로 실행해도 된다. GUI에서 E2E Testing을 선택하면 설정 파일과 `cypress` 폴더를 준비한다. TypeScript 5의 `moduleResolution: 'bundler'`와 Cypress 13.6.3 미만을 함께 쓰던 호환 문제는 13.6.3에서 수정됐다.

```ts
// cypress.config.ts
import { defineConfig } from 'cypress'
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // 필요한 Node 이벤트 플러그인을 이곳에서 연결한다.
    },
  },
})
```

JavaScript는 같은 객체를 `require('cypress')`와 `module.exports`로 내보낸다. `baseUrl`이 없으면 `cy.visit()`에 전체 URL을 넣는다.

```ts
// cypress/e2e/app.cy.ts
it('About 페이지로 이동한다', () => {
  cy.visit('/')
  cy.get('a[href*="about"]').click()
  cy.url().should('include', '/about')
  cy.get('h1').contains('About')
})
```

`npm run build` 후 `npm run start`로 서버를 열고 다른 터미널에서 Cypress를 실행한다. 소스가 바뀌면 production build도 다시 만든다. Cypress 자체가 Next 서버를 자동으로 실행하는 것은 아니다.

## Cypress 컴포넌트 테스트

GUI에서 Component Testing을 고르고 프레임워크를 Next.js로 선택한다. E2E 설정과 함께 다음 `component` 설정을 둔다.

```ts
component: {
  devServer: { framework: 'next', bundler: 'webpack' },
}
```

생성된 support 파일이 `cy.mount`를 등록한 구성을 전제한다.

```tsx
// cypress/component/page.cy.tsx
import Page from '../../app/page'
it('홈 제목과 링크를 표시한다', () => {
  cy.mount(<Page />)
  cy.get('h1').contains('Home')
  cy.get('a[href="/about"]').should('be.visible')
})
```

컴포넌트 테스트는 링크의 렌더와 상호작용을 확인한다. 실제 경로 이동은 E2E가 맡는다. `async` Server Component와 Next 서버가 필요한 `next/image` 최적화는 이 격리 환경에서 그대로 지원되지 않는다. Component Testing은 어댑터가 개발 서버를 관리하므로 E2E처럼 별도 앱 서버를 준비하지 않는다.

## Cypress 자동 실행과 CI

```json
{
  "scripts": {
    "e2e": "start-server-and-test dev http://localhost:3000 'cypress open --e2e'",
    "e2e:headless": "start-server-and-test dev http://localhost:3000 'cypress run --e2e'",
    "component": "cypress open --component",
    "component:headless": "cypress run --component"
  }
}
```

이 조합은 `npm install -D start-server-and-test`와 기존 `dev` 스크립트를 전제한다. 서버 readiness를 기다린 후 테스트하고 서버를 정리한다. production 검증에는 먼저 build하고 `dev` 대신 `start` 스크립트를 지정한다. `open`은 대화형 GUI, `run`은 headless 실행이다. CI에서는 Cypress의 공식 CI 가이드와 GitHub Action을 환경에 맞게 적용한다.

## Playwright 설치와 구성

```sh
npm init playwright
```

초기화 질문으로 `playwright.config.ts` 등을 생성한다. 브라우저 binary 설치와 운영체제 의존성을 준비한다. CI 환경에 시스템 의존성이 없으면 `npx playwright install-deps`가 필요할 수 있다. Chromium, Firefox, WebKit은 설정의 browser projects와 설치된 브라우저에 따라 실행되며 단순 설치만으로 테스트 범위를 단정하지 않는다.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
  },
})
```

이 예제는 `npm run build`를 먼저 실행한 상태를 전제한다. `webServer` 없이 앱 서버를 별도 터미널에서 실행해도 된다. `webServer`는 실행과 접속 가능 상태의 대기를 자동화한다.

## Playwright 테스트와 CI

```ts
// tests/navigation.spec.ts
import { test, expect } from '@playwright/test'
test('About 페이지로 이동한다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL('http://localhost:3000/about')
  await expect(page.locator('h1')).toContainText('About')
})
```

`baseURL`이 없으면 `page.goto`에 전체 URL을 넣는다. `npx playwright test`는 기본적으로 headless로 실행한다. CI에서도 앱 서버, 브라우저와 시스템 의존성을 먼저 준비한다. with-playwright 예제와 공식 CI 문서는 runner별 설치 조건을 확인할 때 쓴다. Cypress/Playwright 커뮤니티 링크는 추가 지원 경로이며 테스트 성공의 증거가 아니다.

## 출처

- [Next.js, cypress](https://nextjs.org/docs/app/guides/testing/cypress)
- [Next.js, playwright](https://nextjs.org/docs/app/guides/testing/playwright)

## 관련 문서

- [[NextJS-Testing]]
- [[NextJS-Testing-Unit]]
