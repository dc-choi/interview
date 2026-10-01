---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 테스트 경계와 도구 선택"]
---

# Next.js 테스트 경계와 도구 선택

## 어떤 경계를 검증하는가

단위 테스트는 순수 함수와 작은 컴포넌트 계약을, 통합 테스트는 함께 동작하는 모듈을, E2E는 실제 서버와 브라우저를 지난 사용자 흐름을 확인한다. 스냅샷은 예상 출력의 변경을 알려주지만 인증, 데이터 갱신, 탐색이 성공했다는 증거를 대신하지 않는다.

| 도구 | 적합한 범위 | 설정과 제한 |
| --- | --- | --- |
| Jest | 동기 React 컴포넌트, 로직 | `next/jest.js`, jsdom, Testing Library. async Server Component는 지원 범위 밖 |
| Vitest | Vite 기반 단위/컴포넌트 | React 플러그인, tsconfig 경로 플러그인, jsdom. async Server Component는 E2E로 |
| Cypress Component | 격리된 상호작용 | Next.js/webpack 어댑터. 실제 Next 서버의 이미지 최적화/API를 그대로 재현하지 않음 |
| Cypress E2E | 실제 앱의 사용자 흐름 | 앱 서버를 먼저 준비하고 `baseUrl`, headless 실행을 구성 |
| Playwright | 여러 브라우저의 실제 흐름 | Chromium/Firefox/WebKit 프로젝트와 브라우저 의존성, `webServer` 구성 |

## 실행 환경을 맞추기

Jest의 `next/jest`는 SWC 변환, 스타일/이미지/폰트 모킹, 환경 파일과 Next 설정 로딩을 묶는다. 테스트 환경과 `@testing-library/jest-dom` setup은 따로 설정하고, TypeScript alias도 `moduleNameMapper`로 맞춘다. DOM이 필요한 테스트는 jsdom을 쓴다.

Vitest는 Next 빌드를 실행하는 도구가 아니다. `@vitejs/plugin-react`, `vite-tsconfig-paths`, `test.environment: 'jsdom'` 같은 테스트용 설정으로 컴포넌트를 실행한다. 로컬 watch와 CI의 `vitest run`을 구분한다.

비동기 Server Component, 서버 전용 import, 라우트 캐시, Server Action, 실제 이미지 처리의 결합은 실제 Next 서버를 올린 E2E가 적절하다. 개발 서버만 통과하면 prerender와 production bundling 문제를 놓칠 수 있어 중요한 배포 흐름은 `next build`와 production server에서 검증한다.

## 행동을 확인하는 예

```ts
import { test, expect } from '@playwright/test'

test('상품 링크가 상세 페이지로 이동한다', async ({ page }) => {
  await page.goto('/products')
  await page.getByRole('link', { name: '상품 A', exact: true }).click()
  await expect(page).toHaveURL(/\/products\/a$/)
  await expect(page.getByRole('heading', { name: '상품 A' })).toBeVisible()
})
```

`baseURL`과 서버 readiness를 설정한 앱을 전제한 예시다. 저장소에 이 앱이나 테스트 실행 결과가 있다는 뜻은 아니다. 인증 후 데이터를 바꾸는 흐름이라면 화면 갱신뿐 아니라 재방문/새로고침 후 지속성과 권한 거부도 검증한다. 보존된 숨김 페이지가 존재할 수 있으므로 DOM 존재만으로 현재 화면을 판정하지 않는다.

## 이해 확인

- 비동기 서버 페이지를 jsdom에 렌더하는 테스트와 실제 서버 E2E는 무엇을 다르게 검증하는가?
- 스냅샷이 같아도 로그인 사용자가 다른 사람의 데이터를 읽는 결함을 놓칠 수 있는 이유는 무엇인가?

## 도구별 설정과 실행

컴포넌트 테스트는 렌더, props와 사용자 이벤트에 초점을 맞춘 단위 테스트다. 설치, 설정 파일과 실제 assertion은 [[NextJS-Testing-Unit]], 서버 준비와 브라우저 실행은 [[NextJS-Testing-E2E]]에서 연결한다.

## 출처

- [Next.js, testing](https://nextjs.org/docs/app/guides/testing)
- [Next.js, cypress](https://nextjs.org/docs/app/guides/testing/cypress)
- [Next.js, jest](https://nextjs.org/docs/app/guides/testing/jest)
- [Next.js, playwright](https://nextjs.org/docs/app/guides/testing/playwright)
- [Next.js, vitest](https://nextjs.org/docs/app/guides/testing/vitest)

## 관련 문서

- [[NextJS-State-and-Hydration]]
- [[NextJS-Authentication]]
