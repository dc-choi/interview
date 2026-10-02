---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router SSR과 HTML document"]
---

# Expo Router SSR과 HTML document

SDK 55~57은 plugin `unstable_useServerRendering: true` opt-in이고 SDK 58부터 server rendering이 stable이다. `web.output: 'server'`만 설정한 SDK 57의 이전 결과는 prerendered HTML+API일 수 있으므로 버전 의미를 분리한다. SDK 58에서 이전 동작을 유지하려면 static+apiRoutes=true로 옮긴다.

SSR은 Request마다 HTML을 stream하고 loader 결과를 포함한다. client JavaScript/CSS와 server manifest/render module을 export하며 요청 시 runtime이 실행해야 한다. 정적 host에 server artifact만 올려도 render하지 않는다. dynamic route는 실제 URL param으로 render하며 generateStaticParams가 필요하지 않다.

## HTML shell의 필수 문맥

+html.tsx에서 useServerDocumentContext의 htmlAttributes/bodyAttributes/headNodes/bodyNodes와 children을 전부 넣어야 metadata, CSS/fonts와 hydration scripts가 유지된다.

```tsx
import { useServerDocumentContext } from 'expo-router/html';
export default function Root({ children }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return <html lang="ko" {...htmlAttributes}>
    <head><meta charSet="utf-8" />{headNodes}</head>
    <body {...bodyAttributes}>{children}{bodyNodes}</body>
  </html>;
}
```

bodyNodes를 빠뜨리면 client가 interactive하게 hydrate하지 못한다. 이 shell은 server에서만 실행되고 자체를 client hydrate하지 않으며 다른 일반 React hook/browser API/global CSS를 넣지 않는다. CSS/provider는 root layout에 둔다.

## metadata

route의 generateMetadata(request, params)는 server에서 render 시작 전 Metadata object를 반환한다. title/description/openGraph images 등의 값을 headNodes에 넣어 early response bytes에 포함한다. secret-dependent fetch는 가능하지만 공개 metadata로 반환하는 값을 구분한다. function export는 client에서 제거된다.

Head component와 공존할 수 있으나 server stream 이전 metadata 확보에는 generateMetadata가 권장되고 Head는 hydration 후 동적 갱신에도 쓸 수 있다. 실제 metadata field는 expo-server Metadata 계약을 따른다.

## 배포와 선택

export → expo serve로 production runtime을 로컬 점검하고 EAS Hosting 또는 해당 runtime의 expo-server adapter에 배포한다. cache는 server/CDN에서 URL, 사용자별 응답과 header를 고려해 구성한다. static의 빠른 cached HTML과 SSR의 request별 personalization/streaming을 비교한다. 현재 guide는 프로젝트 안에서 static와 SSR mode 혼합을 지원하지 않는다고 명시한다.

Introduction/authentication의 SSR/middleware 미지원 잔여문장보다 이 직접 guide의 버전/opt-in 계약이 구체적이다. 실서비스 runtime이 실제로 배포되었다는 증거는 별도 확인해야 한다.

## 출처

- [Expo Documentation, Server rendering](https://docs.expo.dev/router/web/server-rendering)

## 관련 문서

- [[Expo-Router-Server-Deployment]]
- [[Expo-Router-Data-Loaders]]
