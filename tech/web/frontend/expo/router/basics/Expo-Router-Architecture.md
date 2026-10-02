---
tags: [expo, expo-router, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 파일 기반 라우팅"]
---

# Expo Router 파일 기반 라우팅

Expo Router는 Android, iOS와 웹의 화면 트리를 파일에서 만들고 같은 URL로 탐색하는 프레임워크다. SDK 57 reference를 기준으로 한다. Expo CLI와 Metro의 경로 분석에 의존하므로 기존 React Native 프로젝트도 Expo CLI를 먼저 통합해야 한다.

## 파일과 URL의 계약

| 파일 | 의미와 URL |
| --- | --- |
| `src/app/index.tsx` | `/`의 기본 화면 |
| `src/app/about.tsx` | `/about`의 정적 화면 |
| `src/app/users/[id].tsx` | `/users/123`의 `id` 동적 세그먼트 |
| `src/app/[...rest].tsx` | 남은 경로를 `string[]`으로 받는 catch-all |
| `src/app/(tabs)/settings.tsx` | 그룹 이름을 URL에서 제외한 `/settings` |
| `src/app/_layout.tsx` | 화면이 아니라 자식 화면의 배치와 navigator 정의 |
| `+not-found.tsx` | 일치하는 경로가 없는 경우 |
| `+html.tsx` | 웹 HTML shell |
| `+native-intent.tsx` | 네이티브로 들어온 외부 URL 재작성 |
| `+middleware.ts` | 서버 요청 전 middleware |

일반 route 파일은 화면 컴포넌트를 default export한다. 컴포넌트, hook과 utility를 `src/app`에 놓으면 route로 오인될 수 있으므로 `src/components`, `src/hooks` 등으로 옮긴다. `/`를 여는 기본 화면은 일치하는 `index.tsx`다. 그룹 내부의 `index.tsx`도 `/`가 될 수 있다.

루트 `_layout.tsx`는 기존 `App.tsx`의 provider, 폰트와 splash 초기화를 맡고 자식보다 먼저 렌더링된다. 디렉터리만 만들었다고 navigator가 생기지는 않는다. `_layout`을 추가해 Stack, Tabs, Drawer 또는 Slot으로 관계를 지정한다.

## 유니버설 경로의 이점과 경계

화면 URL은 앱 내부 탐색, 공유 링크, 알림과 테스트의 공통 주소가 된다. 네이티브 scheme과 HTTPS app/universal links 설정은 별도로 필요하다. 웹의 검색 노출은 static rendering 또는 SSR을 구성해야 얻는다. 오프라인 경로 해석과 실제 데이터의 오프라인 가용성은 다른 문제다.

SDK 55 이후 기본 템플릿은 `src/app`을 사용하며 네이티브 탭과 웹 custom tabs를 플랫폼 파일로 분리한다. 각 화면이 같은 URL을 유지하면서 UI는 플랫폼에 맞게 바꿀 수 있다. Expo Router를 쓰지 않고 React Navigation을 직접 선택할 수도 있지만 파일 분석, typed routes와 웹 rendering의 통합은 직접 설계해야 한다.

## src 디렉터리

`src/app`과 `app`이 함께 있으면 `src/app`만 사용한다. `public`, `package.json`, `app.json`, `app.config.ts`, `metro.config.js`, `tsconfig.json`은 프로젝트 루트에 둔다. 이동 후 alias를 `"@/*": ["./src/*"]`로 바꾸고 개발 서버를 재시작한다.

`expo-router` plugin의 `root: "./src/routes"`로 route root를 바꿀 수 있지만 권장되지 않는다. 다른 도구가 `app` 또는 `src/app`을 가정하고, 정확히 대응하는 Expo CLI 버전 외에서는 예기치 않은 동작이 생길 수 있다. 이름을 바꾸기 위해 custom `require.context` entry를 쓰는 것도 다른 경로 설정을 함께 바꾸지 못한다.

## 예약 URL

`/assets/*`는 Metro 번들 자산, `/_expo/*`는 내부 도구와 manifest, `/_flight/*`는 RSC, `/inspector`는 debugger, `/expo-dev-plugins/*`는 개발 plugin, `/manifest`는 앱 manifest 요청과 충돌한다. route와 `public` 파일 모두 이름을 피한다. `public` 디렉터리가 있으면 `/public/*`도 피한다.

`/_sitemap`은 진단 화면이며 같은 route를 만들면 내장 화면을 덮는다. `/favicon.ico`는 예외적으로 `public/favicon.ico` 또는 API route로 교체할 수 있다.

## 출처

- [Expo Documentation, Introduction to Expo Router](https://docs.expo.dev/router/introduction)
- [Expo Documentation, Core concepts of file-based routing in Expo Router](https://docs.expo.dev/router/basics/core-concepts)
- [Expo Documentation, Expo Router notation](https://docs.expo.dev/router/basics/notation)
- [Expo Documentation, Top-level src directory](https://docs.expo.dev/router/reference/src-directory)
- [Expo Documentation, Reserved paths](https://docs.expo.dev/router/reference/reserved-paths)

## 관련 문서

- [[Expo-Router-Installation]]
- [[Expo-Router-Layouts]]
