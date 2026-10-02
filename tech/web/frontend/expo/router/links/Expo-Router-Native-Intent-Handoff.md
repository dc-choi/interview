---
tags: [expo, expo-router, links]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 외부 URL 재작성과 Apple Handoff"]
---

# Expo Router 외부 URL 재작성과 Apple Handoff

외부 링크를 파일 경로에 맞추는 작업은 OS에서 들어온 native intent, 웹 서버 redirect, 앱 내부 redirect를 구분한다. `+native-intent.tsx`는 네이티브 진입점이며 서버 요청 middleware나 인증 hook이 아니다.

## redirectSystemPath

route root의 `+native-intent.tsx`에서 `redirectSystemPath({ path, initial })`을 export한다. path가 올바른 URL이라는 보장은 없다. cold start는 initial=true다. string 또는 string Promise를 반환해 새 route를 지정하고 null은 현재 경로를 유지한다. 잘못된 URL, 외부 provider의 opaque identifier, 이전 버전 링크를 처리할 때 synchronous와 asynchronous 실패를 모두 catch한다.

```tsx
export async function redirectSystemPath({ path, initial }) {
  try {
    const url = new URL(path, 'myapp://app');
    if (url.hostname === 'legacy-provider') {
      return await resolveLegacyLink(url, initial);
    }
    return path;
  } catch {
    return '/unexpected-error';
  }
}
```

native-intent는 React context를 사용할 수 없다. 세션이 필요한 redirect는 mounted layout에서 처리한다. 웹에는 native intent와 같은 단일 interception 지점이 없으므로 HTTP server redirect 또는 앱 layout의 `usePathname` 기반 redirect를 선택한다. root layout은 전역 정책, nested layout은 해당 subtree 정책을 맡는다. 완전한 외부 도메인 링크는 브라우저에서 열 수 있다.

`legacy_subscribe`는 SDK 52부터의 alpha compatibility API로 오래된 linking subscription을 연결한다. 새로운 코드에는 권장하지 않으며 SSR/SSG나 오프라인 진입을 지원하는 대안으로 볼 수 없다.

## Apple Handoff의 연결 대상

Apple Handoff는 native iOS 앱에서 웹, 웹에서 iOS 앱으로 작업 중인 URL을 넘긴다. NSUserActivity의 webpageUrl이 기준이고 Expo Go에서는 사용할 수 없다. Associated Domains entitlement와 HTTPS 사이트의 AASA file을 준비해 native build에 포함한다.

AASA의 `activitycontinuation.apps`는 Team ID와 bundle identifier로 앱을 식별한다. `applinks`는 universal link, optional `webcredentials`는 자격 증명 연계를 위한 별도 영역이다. app config의 `ios.associatedDomains`에는 `applinks:example.com`, `activitycontinuation:example.com` 등을 쓰며 scheme, path, query를 붙이지 않는다. `headOrigin`은 native에서 상대 webpage URL을 HTTPS origin에 연결하고 생략하면 origin을 사용한다.

```tsx
import Head from 'expo-router/head';
<Head><meta property="expo:handoff" content="true" /></Head>
```

위 meta를 root 또는 route에 넣어 opt in한다. `og:url`은 공유 URL을 override할 수 있고 상대값은 headOrigin을 기준으로 한다. title/description metadata는 이 Handoff URL 결정에 사용되지 않는다.

## 개발과 운영에서 확인할 조건

AASA를 제공하는 HTTPS 사이트가 앱 설치 전에 살아 있어야 Apple의 서버가 association을 가져올 수 있다. 로컬 개발은 HTTPS tunnel을 먼저 준비한 뒤 앱을 설치하는 흐름이다. localhost는 쓸 수 없고 universal link 디버깅의 `?mode=developer`를 native Handoff에도 적용할 수 있다고 가정하지 않는다.

웹에서 시작한 Handoff URL은 처음 로드하거나 새로고침한 페이지의 URL일 수 있으며 client navigation을 즉시 반영하지 않는 제한이 있다. 원문의 특정 OS와 bundle 조합 관찰은 역사적 troubleshooting 자료이며 모든 OS의 일반 규칙이 아니다. URL 재작성 코드만으로 AASA 검증, entitlement 설치 또는 physical device Handoff까지 확인한 것은 아니다.

## 출처

- [Expo Documentation, Customizing links](https://docs.expo.dev/router/advanced/native-intent)
- [Expo Documentation, Apple Handoff](https://docs.expo.dev/router/advanced/apple-handoff)

## 관련 문서

- [[Expo-Router-Navigation]]
- [[Expo-Router-Authentication]]
- [[Expo-Router-Middleware]]
