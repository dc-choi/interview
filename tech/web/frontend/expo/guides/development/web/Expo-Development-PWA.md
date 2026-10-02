---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo PWA manifest와 service worker"]
---

# Expo PWA manifest와 service worker

## 설치 metadata

PWA는 설치 가능한 웹 경험과 offline 지원을 구성한다. favicon은 app config의 `web.favicon`에서 생성하거나 `public/favicon.ico`를 직접 둔다. `public/manifest.json`에는 name/short_name, icons, start_url, display, theme/background color를 지정한다. 192/512px 설치 icon 파일도 public에 둔다.

```json
{
  "name": "Catalog", "short_name": "Catalog",
  "icons": [{ "src": "/logo192.png", "sizes": "192x192", "type": "image/png" }],
  "start_url": ".", "display": "standalone",
  "theme_color": "#ffffff", "background_color": "#ffffff"
}
```

## output별 HTML

single은 `npx expo customize public/index.html`로 template를 만들고 head에 `<link rel="manifest" href="/manifest.json" />`를 넣는다. static/server는 `src/app/+html.tsx`의 head에 넣는다. +html 본문은 Node에서 실행하므로 browser API를 즉시 호출하지 않고 생성할 script 문자열로 넣는다. `ScrollViewStyleReset`은 body scroll을 native와 비슷하게 막으므로 모바일 웹 UX에 맞게 선택한다.

## service worker 생성 순서

1. browser load 시 `navigator.serviceWorker.register('/sw.js')`를 수행하는 bootstrap script를 HTML에 둔다.
2. `npx expo export -p web`으로 dist를 생성한다.
3. Workbox wizard에 root `dist/`, precache file types와 output `dist/sw.js`를 지정한다.
4. `npx workbox-cli generateSW workbox-config.js`로 실제 worker를 만든다.
5. dist와 worker를 배포하고 Chrome Application/Service Workers에서 등록과 scope를 확인한다.

```json
{ "scripts": { "build:web": "expo export -p web && npx workbox-cli generateSW workbox-config.js" } }
```

export 뒤 worker를 만들어야 최신 파일을 cache manifest에 포함한다. 생성 전에 `sw.js`를 등록하는 코드만 추가한 상태는 offline 지원 완료가 아니다. subpath hosting은 manifest/icon/worker URL와 scope를 함께 맞춘다.

## cache 운영 한계

과도한 cache는 새 deploy를 사용자가 받지 못하는 상태를 만들 수 있다. offline 시작, network 실패, 업데이트 후 새 asset/HTML 조합과 worker 교체를 검사한다. PWA를 native 앱과 동일한 offline/update 보장으로 취급하지 않는다. cache 해제와 갱신 정책이 없는 worker를 추가하는 것은 단순 performance 개선이 아니다.

## 출처

- [Expo Documentation, Progressive web apps](https://docs.expo.dev/guides/progressive-web-apps)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
