---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["instant 설정과 navigation validation"]
---

# instant 설정과 navigation validation

## instant는 실제 navigation의 검증 기대다

Cache Components의 direct-load shell과 client transition의 즉시 UI는 경계 조건이 다르다. shared layout이 유지되는 transition에서 필요한 Suspense가 없어지면 direct load는 되지만 이동은 막힐 수 있다. instant는 그 blocking component를 찾아 cache/Suspense/읽기 위치 변경을 안내한다.

cacheComponents에서만 동작하고 Client Component segment에 선언하면 오류다. 개발의 검증은 production prefetch 상태를 모델링한다. dev에서 prefetch 자체를 하지 않으므로 실제 클릭 속도는 production과 다를 수 있다.

## 설정과 범위

```tsx
export const instant = true
// 또는 false, { level: 'warning' }
```

true는 global validation level을 따르고 false는 해당 segment를 opt-out한다. warning은 dev overlay에서 검증하며 build는 영향을 받지 않는다. 현재 일반 공개 level은 warning이며 미래 build level을 현재 지원으로 단정하지 않는다.

```js
module.exports = {
  cacheComponents: true,
  experimental: { instantInsights: { validationLevel: 'manual-warning' } },
}
```

기본 warning은 모든 Page/Default를 implicit validation하고 manual-warning은 명시 instant segment만 검증한다. 합성 global error/not-found route는 implicit 검증에서 제외되어 필요하면 명시 opt-in한다. 실험적 기본값이 바뀔 수 있어 고정 정책이 필요하면 level을 config에 명시한다.

상위 true가 모든 descendant를 opt-in하지는 않는다. blocking layout에서 false, deeper tab page에서 true라면 외부→tab은 layout block을 허용하고 tab 간 이동은 즉시 UI를 검증한다. 불필요하게 모든 ancestor에 false를 넣지 않는다.

static shell 검증은 다른 우선순위가 있다. route tree에서 가장 높은 instant 설정이 false면 하위 true보다 우선해 shell check가 opt-out된다. root false는 앱 전체 static-shell 검증을 끄므로 필요한 가장 낮은 경계에 둔다. navigation segment 검증과 shell 검증을 구분한다.

## loading UI를 실제로 검사하기

Next DevTools Navigation Inspector의 Pause on navigations는 refresh 때 initial static UI, Link 클릭 때 prefetched destination UI를 동결한다. Resume으로 진행하며 toggle은 다음 navigation까지 유지된다. 직접 load와 Link 양쪽으로 fallback의 정보/공간/상호작용을 확인한다.

@next/playwright의 instant helper는 dynamic content를 잡아 둔 상태에서 callback으로 instant UI를 검증한다. build가 통과했다는 사실만으로 UX가 instant임을 증명하지 않는다.

DevTools의 next-instant-navigation-testing cookie는 domain 기준이고 port로 나뉘지 않는다. localhost 여러 프로젝트에서 공유되어 멈춤이 이상하면 cookie를 지우거나 inspector를 닫는다.

## 검증 실행 시점과 타입

instant는 route의 shared layout boundary마다 navigation block을 검사하고 dev page load와 HMR update에서 blocking component를 overlay에 표시한다. 해결은 해당 data를 use cache로 재사용하거나 Suspense를 두는 것이다. static shell이 비어 있는지 검사하는 build 조건과 client navigation 경계 검증의 opt-out 범위를 따로 확인한다.

```ts
type InstantConfig = true | false | { level?: 'warning' }
export const instant: InstantConfig = true
```

16.x에서 Cache Components용 export가 도입됐다. object의 level은 선택이고 생략하면 global 값을 쓴다. 일반 warning은 build에 영향을 주지 않는다. `import { instant } from '@next/playwright'`는 callback 실행 동안 dynamic content를 잡아 두는 테스트 helper이며 segment export와 다른 API다.

## 이해 확인

1. direct load에 loading이 보여도 client 이동이 blocking일 수 있는 이유는?
2. root instant false가 descendant true와 shell 검증에 어떤 영향을 주는가?
3. 두 localhost 프로젝트가 함께 멈출 때 먼저 볼 cookie는?

## 출처

- [Next.js, instant](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/instant)

## 관련 문서

- [[NextJS-App-Prefetch-Config]]
- [[NextJS-App-Cache-Components]]
- [[NextJS-App-Streaming]]
