---
tags: [nextjs, app-router, metadata]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["viewport의 initial UI 계약"]
---

# viewport의 initial UI 계약

## static viewport와 generateViewport

Server Component page/layout에서 viewport object 또는 generateViewport 함수를 export한다. 둘을 같은 segment에서 함께 export하지 않는다. TypeScript Viewport type을 사용할 수 있다. 기본 width=device-width, initialScale=1이 제공되어 일반 page는 따로 설정할 필요가 없다.

```ts
import type { Viewport } from 'next'
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff' },
    { media: '(prefers-color-scheme: dark)', color: '#111' },
  ],
  colorScheme: 'light dark',
}
```

themeColor는 color string 또는 media별 color array, colorScheme은 browser color-scheme hint다. width, initialScale, maximumScale, userScalable, interactiveWidget 같은 viewport fields도 지원한다. zoom을 무조건 막으면 접근성을 해칠 수 있어 실제 필요와 browser 동작을 먼저 검토한다.

## 동적 값과 Cache Components

generateViewport는 async일 수 있지만 metadata처럼 ready 뒤 body에 streaming하는 계약이 아니다. initial UI에 viewport가 필요하므로 request data를 기다리면 초기 렌더링을 막는다. cache 가능한 외부 설정은 use cache로 가져와 prerender 가능하게 한다.

cookies/headers 등 request에 의존하는 viewport라면 Cache Components의 explicit Suspense/document 경계 또는 instant=false와 관련 검증 기대를 확인한다. source 예시는 html을 Suspense로 감싸는 document 구조를 보여 주므로 body 내부의 작은 fallback만 추가하면 같은 계약이 된다고 단정하지 않는다. viewport를 dynamic으로 해야 하는 요구가 정말 있는지 먼저 판단한다.

여러 root layout을 가진 경우 서로 다른 문서 viewport를 분리할 수 있다. root 간 navigation은 full page load라는 layout 계약도 함께 고려한다. theme cookie 하나 때문에 모든 route의 initial UI가 blocking되는지 확인한다.

## 오류 진단과 이해 확인

metadata의 deprecated viewport/themeColor/colorScheme field를 썼다면 viewport export로 옮긴다. browser의 raw initial viewport tag와 hydration 뒤 state를 나누어 확인한다. 중복 tag와 request-time block, unsupported field를 점검한다.

1. viewport는 generateMetadata처럼 늦게 streaming해도 동일한 initial rendering인가?
2. 기본 device-width 설정만 필요할 때 별도 export가 필요한가?
3. per-user themeColor의 비용이 모든 route의 initial render에 미칠 수 있는 이유는?

## viewport 입력과 dynamic 경계 예

viewport 정적 예는 themeColor:'black'을 name=theme-color로 출력한다. media array의 light cyan/dark black은 각각 media 태그가 된다. colorScheme:'dark'는 name=color-scheme이다. width:'device-width'/initialScale:1/maximumScale:1/userScalable:false는 viewport content의 width/initial-scale/maximum-scale/user-scalable=no를 구성한다. interactiveWidget:'resizes-visual'도 지원한다. 기본 viewport가 대부분 충분하며 zoom 제한은 별도 접근성 검토가 필요하다.

generateViewport는 Viewport object를 반환하며 request 정보가 필요 없으면 정적 object를 선택한다. params는 PageProps/LayoutProps helper, 직접 Props는 Promise<{id:string}>와 Page의 query Promise<string|string[]|undefined> map으로 typed할 수 있다. `generateViewport(): Viewport`, async 함수와 object 타입을 지원하며 JS는 `@type {import('next').Viewport}`를 쓴다. metadata-to-viewport-export codemod로 구형 field를 옮길 수 있다. 14.0에 object/function이 도입되었다.

외부 viewport-size DB query는 generateViewport의 use cache에서 width/initialScale을 반환한다. runtime cookies.theme-color를 쓰는 root 예는 **Suspense가 html/body 전체를 감싼 코드**다. 원문 prose는 body를 감싸라고 설명하므로 문서 안의 구조가 일치하지 않는다. viewport 자체는 late stream할 수 없으며 document를 defer하려는 의도다. 다른 대안은 dashboard layout의 instant=false와 cookies viewport로 해당 segment navigation이 완료까지 block되게 한다. descendant는 전역 기본 validation을 계속 받으며 multiple root layout으로 이 비용을 특정 route에 한정할 수 있다.

## 출처

- [Next.js, generate-viewport](https://nextjs.org/docs/app/api-reference/functions/generate-viewport)

## 관련 문서

- [[NextJS-App-Metadata-Contract]]
- [[NextJS-App-Layouts]]
- [[NextJS-App-Instant-Validation]]
- [[NextJS-App-Cache-Functions]]
