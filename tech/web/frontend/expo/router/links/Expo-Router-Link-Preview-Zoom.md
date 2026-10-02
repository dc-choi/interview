---
tags: [expo, expo-router, links]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 링크 미리보기와 zoom 전환"]
---

# Expo Router 링크 미리보기와 zoom 전환

Link preview는 SDK 54부터 iOS에서 제공한다. 길게 누르면 destination의 preview와 context menu를 표시한다. SDK 55부터 Apple zoom transition은 iOS 18 이상에서 제공하는 alpha API다. Android, 웹과 구형 iOS는 일반 탐색으로 fallback하므로 핵심 기능을 이 전환에만 의존하지 않는다.

## Preview 화면과 navigation

`Link.Trigger`는 누를 UI, `Link.Preview`는 preview다. Preview에 children을 주면 custom preview이고 children을 생략하면 destination 화면을 preview한다. preferred width/height는 native 시스템이 최종 크기를 조절할 수 있다. 전체 화면 snapshot 형태도 사용할 수 있다. `useIsPreview()`는 preview 안에서 true를 반환하므로 preview용 UI와 실제 화면을 구분할 수 있다.

현재 preview navigation은 default push에 맞춘 기능이며 replace와 함께 쓰는 동작은 지원하지 않는다. native Stack에 맞춰 설계되었고 JS Tabs나 Slot은 presentation이 매끄럽지 않을 수 있다. 메뉴가 열린 동안 href pathname을 바꾸지 않는다. query parameter 변경은 허용한다. Link에 Trigger가 없거나 Link.*가 직접 자식이 아니면 오류가 날 수 있다.

## Source와 target의 zoom 연결

출발 이미지나 카드에는 `Link.AppleZoom`, 도착 화면의 대응 요소에는 `Link.AppleZoomTarget`을 둔다. 각각 단일 자식을 받는다. Link에는 asChild를 사용하고 native Stack 내부에서 탐색한다.

```tsx
// 출발 화면
<Link href="/photo/42" asChild>
  <Link.AppleZoom><Pressable><Image source={photo} style={thumbnail} /></Pressable></Link.AppleZoom>
</Link>
// 도착 화면
<Link.AppleZoomTarget><Image source={photo} style={fullPhoto} /></Link.AppleZoomTarget>
```

`alignmentRect`는 destination 요소 좌표 안에서 확대 정렬 영역을 지정한다. 이미지 종횡비와 fit 방식이 달라지면 화면 전체가 아니라 실제 이미지 영역을 맞춘다. 이미지 크기는 첫 render부터 알고 있는 편이 좋다. 늦게 얻은 크기로 target을 움직이면 전환이 어긋날 수 있다.

## Dismiss gesture와 modal

`usePreventZoomTransitionDismissal()`을 인수 없이 호출하면 zoom dismiss gesture를 막는다. bounds `{ minX, maxX, minY, maxY }`를 주면 그 영역 안에서 gesture 시작을 허용한다. 여러 instance가 있으면 마지막 instance 설정을 사용하므로 여러 자식이 충돌하는 설정을 등록하지 않는다. 이 hook은 modal dismissal에 적용되지 않는다.

Preview와 zoom을 함께 쓰면 destination을 fullscreen modal presentation으로 구성해야 한다. modal에서는 zoom dismissal prevention hook이 무시된다. 헤더가 함께 전환될 때 시각적 문제가 생길 수 있고 빠른 연속 탐색에서 native timing 제약이 드러날 수 있다. 가이드의 약 1초 간격 관찰은 보장된 debounce 계약이 아니다. 실제 iOS 화면과 gesture는 실기기로 별도 확인해야 한다.

## 출처

- [Expo Documentation, Link preview](https://docs.expo.dev/router/reference/link-preview)
- [Expo Documentation, Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition)

## 관련 문서

- [[Expo-Router-Link]]
- [[Expo-Router-Stack]]
- [[Expo-Router-Modals]]
