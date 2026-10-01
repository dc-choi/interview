---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js View Transition 설계"]
---

# Next.js View Transition 설계

## 사용 조건

현재 App Router는 번들된 React Canary의 ViewTransition을 사용할 수 있다. 별도로 모든 앱의 React 패키지를 canary로 바꾸어야 한다는 뜻은 아니며 Pages Router 지원과 구분한다. 브라우저가 필요한 View Transitions API를 지원하지 않으면 화면은 정상 변경되고 애니메이션만 생략될 수 있다.

ViewTransition은 React Transition, Suspense reveal, deferred update에 반응한다. 일반 urgent setState가 모두 애니메이션을 만드는 것은 아니다. route navigation은 transition과 통합된다.

## 네 가지 패턴

| 패턴 | 구성 | 주의점 |
|---|---|---|
| 공유 이미지 이동 | 이전/다음 요소의 같은 고유 name | 같은 commit에서 pair가 있어야 하며 먼저 fallback으로 가면 enter로 나타날 수 있음 |
| loading에서 본문으로 교체 | fallback exit, content enter | 시간과 크기 차이가 사용자 읽기를 방해하지 않게 함 |
| 방향 있는 페이지 전환 | Link transitionTypes와 enter/exit map | 앱이 forward/back 의미를 부여하며 브라우저 back의 자동 type을 가정하지 않음 |
| 같은 영역의 내용 교체 | 고정 name과 변경되는 key | route transition이 trigger, key는 old/new identity 구분 |

`default='none'`으로 무관한 전환을 끄면서 shared morph를 유지하려면 share를 명시한다. CSS pseudo-element에서 group, old, new의 duration과 easing을 조정한다. 여러 live 요소가 같은 name으로 충돌하지 않게 한다.

## navigation과 layout

page의 enter/exit를 원하면 실제로 교체되는 page 경계를 감싼다. 공통 layout은 유지되어 enter/exit가 기대처럼 발생하지 않을 수 있다. 헤더를 고정된 시각 기준으로 남길 때는 별도 name과 animation 정책을 주되 named participant의 hit testing 제한도 확인한다.

`::view-transition { pointer-events: none; }`은 overlay가 unnamed live UI의 클릭을 가로채는 문제를 줄일 수 있다. 모든 named participant의 즉각 상호작용까지 보장하는 해법은 아니다. animation은 짧게 하고 빠른 연속 클릭과 취소를 확인한다.

## 접근성과 성능

prefers-reduced-motion에서 큰 이동을 제거하거나 duration/delay를 0으로 줄인다. 모션은 정보 관계를 돕는 수단이며 로딩 성공이나 필수 안내를 애니메이션에만 맡기지 않는다. 느린 목적지, prefetch miss, Suspense reveal, back/forward와 지원하지 않는 브라우저를 확인한다.

## 지원과 적용 도구

현재 App Router의 내장 React canary에서 `import { ViewTransition } from 'react'`로 사용한다. 별도 framework flag나 react@canary 설치를 요구하지 않는 가이드 기준이다. transition types와 view-transition-class 같은 browser 기능은 Chromium 125+ 및 최근 Safari/Firefox에 제공되지만 Safari 동작 차이와 실제 target 버전은 확인한다. 미지원 브라우저는 일반 화면 전환으로 동작한다.

공식 적용 skill은 `npx skills add vercel-labs/agent-skills --skill vercel-react-view-transitions`로 설치하는 절차를 제공하며 morph, 방향 이동, 같은 영역 crossfade와 CSS 문제 해결을 다룬다. 이 vault에서는 설치/적용을 실행하지 않는다. Frames gallery의 공식 demo와 CSS 저장소가 통합 예제다.

## 공유 이미지와 morph CSS

```tsx
// grid thumbnail과 detail hero 양쪽에 동일한 name/share/default를 둔다.
<ViewTransition name={`photo-${photo.id}`} share="morph" default="none">
  <div style={{ position: 'relative', aspectRatio: '3 / 2' }}>
    <Image src={photo.src} alt={photo.title} fill sizes="100vw" />
  </div>
</ViewTransition>
```

Image/ViewTransition은 next/image와 react에서 import하고 photo 데이터는 별도로 제공한다. thumbnail의 sizes는 실제 grid 크기로 조정한다. 기본 morph는 추가 CSS 없이도 같은 name의 위치/크기를 이어주며 뒤로 돌아가면 반대 방향으로 이어진다. destination이 같은 navigation commit에 준비돼야 pair가 생긴다. 먼저 Suspense fallback이 나오면 나중 콘텐츠는 enter로 나타날 수 있다.

```css
::view-transition-group(.morph) { animation-duration: 400ms; }
::view-transition-image-pair(.morph) { animation-name: via-blur; }
@keyframes via-blur { 30% { filter: blur(3px); } }
```

default none은 무관한 전환의 crossfade를 막는다. shared pair에 share를 빼고 default none만 두면 morph도 꺼진다. blur는 보간 과정의 작은 차이를 완화하는 선택이며 400ms는 예시 값이다.

## Suspense의 나감과 들어옴

```tsx
<Suspense fallback={<ViewTransition exit="slide-down" default="none">
  <PhotoSkeleton />
</ViewTransition>}>
  <ViewTransition enter="slide-up" default="none">
    <PhotoContent id={id} />
  </ViewTransition>
</Suspense>
```

PhotoContent는 비동기 데이터를 읽고 두 UI 컴포넌트는 앱에서 제공한다. URL params는 Cache Components 조건에 맞게 이 경계 안에서 읽는다. 나가는 placeholder는 빠르게, 들어오는 콘텐츠는 더 천천히 보여주는 비대칭 예다.

```css
::view-transition-old(.slide-down) {
  animation: 150ms ease-out both fade reverse, 150ms ease-out both slide-y reverse;
}
::view-transition-new(.slide-up) {
  animation: 210ms ease-in 150ms both fade, 400ms ease-in both slide-y;
}
@keyframes fade {
  from { filter: blur(3px); opacity: 0; }
  to { filter: blur(0); opacity: 1; }
}
@keyframes slide-y { from { transform: translateY(10px); } to { transform: translateY(0); } }
```

enter fade의 150ms 지연은 exit 종료를 기다린다. 방향/길이는 제품 언어/공간 구조에 맞추며 위아래/좌우의 의미가 모든 사용자에게 동일하다고 가정하지 않는다.

## 방향 type과 CSS

`<Link transitionTypes={['nav-forward']}>`와 돌아가는 링크의 nav-back을 앱의 hierarchy에 맞춰 지정한다. router.push/replace도 transitionTypes를 지원한다. 브라우저 back/swipe에 같은 type이 자동 부여된다고 가정하지 않는다.

```tsx
const motion = { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }
<ViewTransition enter={motion} exit={motion} default="none">
  {/* 교체되는 page 콘텐츠 */}
</ViewTransition>
```

gallery와 detail의 page 양쪽을 감싼다. 유지되는 공통 layout에만 wrapper를 두면 page의 enter/exit가 발생하지 않는다. type이 없는 refresh/Suspense reveal/browser history에는 방향 이동을 생략하고 같은 name pair의 morph는 별개로 적용할 수 있다.

```css
::view-transition-old(.nav-forward) { --offset: -60px; }
::view-transition-new(.nav-forward) { --offset: 60px; }
::view-transition-old(.nav-back) { --offset: 60px; }
::view-transition-new(.nav-back) { --offset: -60px; }
::view-transition-old(.nav-forward), ::view-transition-old(.nav-back) {
  animation: 150ms ease-in both fade reverse, 400ms ease-in-out both slide reverse;
}
::view-transition-new(.nav-forward), ::view-transition-new(.nav-back) {
  animation: 210ms ease-out 150ms both fade, 400ms ease-in-out both slide;
}
@keyframes slide { from { translate: var(--offset); } to { translate: 0; } }
```

60px는 화면 전체를 빠르게 이동시키지 않고 방향만 전달하는 예다. 앞 절의 fade keyframes를 재사용한다.

## 고정 헤더, 입력과 reduced motion

```tsx
<header style={{ viewTransitionName: 'site-header' }}>{/* navigation */}</header>
```

```css
::view-transition-group(site-header) { animation: none; z-index: 100; }
::view-transition-old(site-header) { display: none; }
::view-transition-new(site-header) { animation: none; }
::view-transition { pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

old header snapshot을 숨겨 겹쳐 보이는 flash를 막고 z-index로 이동 콘텐츠 위에 둔다. overlay pointer-events none은 이름 없는 live 콘텐츠의 클릭을 통과시키지만 named participant의 hit-testing 제한은 남는다. 자주 누르는 요소를 과도하게 name으로 지정하지 않는다. reduced motion에서는 duration/delay를 0으로 끄거나 위치 이동만 없애고 opacity를 남기는 정책을 선택한다.

## 같은 route 패턴 안의 crossfade

`/collection/[slug]`의 탭 전환은 장소 이동보다 같은 container 내용 교체에 가깝다. `<ViewTransition key={slug} name="collection-content" share="auto" enter="auto" default="none">`로 grid만 감싸고 Suspense 바깥의 tab bar/layout은 유지한다. navigation이 transition을 시작하고 key 변화가 exit/enter pair를 만들며 name이 old/new container를 연결한다. share/enter auto는 기본 crossfade를 선택한다. shared morph는 같은 대상의 연속성, reveal은 데이터 도착, slide는 계층 이동, crossfade는 같은 위치의 내용 교체를 표현한다.

## 출처

- [Next.js, view-transitions](https://nextjs.org/docs/app/guides/view-transitions)

## 관련 문서

- [[NextJS-Prefetching]]
- [[NextJS-Streaming]]
