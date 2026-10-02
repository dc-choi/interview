---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 정적 HTML 생성"]
---

# Expo Router 정적 HTML 생성

`web.output: 'static'`은 export할 때 route별 HTML/CSS를 생성한다. data loader도 build-time에 실행된다. API를 끈 static 결과는 HTML 파일 묶음이며 SPA fallback redirect를 넣는 배포와 다르다. SDK 58의 static+apiRoutes=true는 dist/server HTML/API와 dist/client assets를 만들고 runtime server가 필요하다.

```sh
npx expo export --platform web
```

순수 static은 serve dist로, API 포함 결과는 expo serve로 점검한다. public 파일은 export에 복사되며 `/assets` 등 예약 URL은 피한다. 웹에서 public/logo.png는 /logo.png로 접근하지만 native asset import와 같은 계약이 아니다.

## dynamic 경로 생성

```tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ id: String(post.id) }));
}
```

`blog/[id].tsx`에서 alpha/beta parameter를 반환하면 blog/alpha.html와 beta.html이 생성된다. 알려지지 않은 모든 ID가 자동 작동하는 것은 아니므로 동적 content에는 SSR 또는 fallback infrastructure가 필요하다. parent dynamic layout의 params가 child generateStaticParams로 전달되며 각 parent 조합을 모두 계산한다.

함수는 Node build-time server code다. process.cwd/env와 filesystem을 사용하지만 browser localStorage/document나 camera/location native API는 없다. compile 위치가 달라지는 __dirname보다 project cwd로 file path를 만든다. source guide의 readdir/filter 예시는 문법과 반환값이 불완전해 그대로 복제하지 않는다. params는 route에 맞는 serializable 문자열 record로 반환한다.

## root HTML과 metadata

src/app/+html.tsx는 Node에서만 실행되는 HTML shell이다. children에는 root div가 들어 있고 render 뒤 script가 추가되며 RN Web styles를 static inject한다. provider와 global CSS는 `_layout.tsx`에 두고 +html에 import하지 않는다. root document는 client에서 hydrate하지 않는다.

```tsx
import { ScrollViewStyleReset } from 'expo-router/html';
export default function Root({ children }) {
  return <html lang="ko"><head><meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <ScrollViewStyleReset />
  </head><body>{children}</body></html>;
}
```

ScrollViewStyleReset은 full-screen native scroll parity를 위해 body scroll을 제한한다. 모바일 웹의 body scroll을 원하면 제거할 수 있다. route metadata는 expo-router/head의 Head에 title/meta를 넣어 static HTML에 포함하고 hydration 이후에도 바꿀 수 있다.

## 폰트와 배포

expo-font useFonts/Font.loadAsync의 동기적인 선언 경로는 resource를 추출해 preload/font-face를 HTML에 넣을 수 있다. effect, deferred component나 async wrapper에서 늦게 로딩하면 최적화가 빠질 수 있다. 동기 wrapper는 지원된다.

HTML generation은 build-time이므로 요청별 개인화를 직접 처리하지 못한다. SSR과 static을 route별 섞는 hybrid rendering은 현재 guide 기준 지원하지 않는다. static output을 요청마다 render하는 기능으로 설명하지 않는다.

## 출처

- [Expo Documentation, Static rendering](https://docs.expo.dev/router/web/static-rendering)

## 관련 문서

- [[Expo-Router]]
