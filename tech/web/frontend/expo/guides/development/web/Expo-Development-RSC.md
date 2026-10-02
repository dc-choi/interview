---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router React Server Components preview"]
---

# Expo Router React Server Components preview

## 지원 상태와 설치

Expo의 universal RSC는 experimental/beta preview다. production 채택 권장 기능으로 볼 수 없으며 breaking change가 가능하다. Expo Router와 New Architecture가 필요하다.

```sh
npx expo install react-server-dom-webpack
```

package entry는 `expo-router/entry`, app config는 `experiments.reactServerFunctions:true`로 구성한다. preview는 `web.output:"single"`을 요구하며 origin을 boolean으로 설정하지 않는다.

## 세 실행 경계

| 종류 | 실행과 역할 | 제한 |
| --- | --- | --- |
| Server Component | 서버 async data fetch와 UI 구성 | state/effect/context hook, native/browser API 사용 불가 |
| Client Component | `'use client'` 경계의 interactive UI | 서버 비밀과 server-only code를 포함하지 않음 |
| Server Function | async RPC와 RSC payload 반환 | serializable 인자/결과, 서버 입력 검증 필요 |

`'use server'`는 component를 server로 표시하는 반대 client directive가 아니라 Server Function을 정의한다. 파일 전체 또는 async 함수 안에 적용할 수 있다. 서버가 반환한 React tree는 RSC payload로 stream되고 client renderer가 표시한다.

```tsx
'use server';
import 'server-only';
import { Text } from 'react-native';

export async function renderSummary({ id }: { id: string }) {
  const response = await fetch(`https://api.example.com/items/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.SERVER_API_TOKEN}` },
  });
  if (!response.ok) throw new Error('Item request failed');
  const item = await response.json();
  return <Text>{item.title}</Text>;
}
```

client는 `Suspense` fallback을 두고 promise 결과를 표시한다. 변경 인자에 대한 호출은 memoization/상태 관리로 반복 network call을 제어한다. 서버에서 실제 caller authorization과 validation을 수행하며 token을 받았다는 사실만으로 신뢰하지 않는다.

## Suspense, library와 비밀값

중첩 Suspense boundary를 둬 느린 child를 기다리는 동안 먼저 완료한 UI를 stream할 수 있다. 하나의 boundary만 두면 그룹 전체 완료까지 fallback을 유지한다.

server 최적화가 안 된 library는 `'use client'` wrapper에서 named export로 재노출할 수 있다. `export *`는 client/server interop을 깨뜨릴 수 있다. client module의 `StyleSheet.create`, `Platform.OS` 같은 dot access도 server에서 지원하지 않는 경우가 있어 style은 plain object, platform은 `process.env.EXPO_OS`를 사용한다.

`import 'server-only'`로 secret code가 client에 들어가지 않도록 한다. 서버 변수에는 `EXPO_PUBLIC_`가 필요 없지만 반환 payload에 secret을 포함하면 다시 노출된다. dev server는 요청마다 서버 환경을 다시 읽는다.

## request context와 metadata

`unstable_headers()`는 서버 전용 Promise API이며 read-only Headers를 반환한다. 요청별 동적 정보이므로 build-time static render와 같이 사용할 수 없다. React19 web의 `<meta>`는 component에서 사용할 수 있지만 native에는 HTML metadata를 렌더링하지 않는다.

서버 여부를 `typeof window` 하나로 universal native 환경까지 판정하지 않는다. browser/server global 차이와 Expo native runtime은 다르므로 server-only 경계와 bundler 조건을 사용한다. preview 문서의 canary React 설명은 역사적 구현 맥락이며 SDK57의 React19.2.3 조합을 별도로 대조한다.

## full RSC mode

`experiments.reactServerComponentRoutes:true`를 함께 켜면 route 기본이 Server Component가 된다. 이 mode는 custom layout/Stack/Tabs/Drawer와 많은 Link prop을 아직 지원하지 않는다.

route의 `unstable_settings.render`는 `dynamic`(현재 기본, 요청마다 렌더링) 또는 `static`(build 때 생성, production 재실행 없음)이다. static 결과는 native binary에 포함해 서버 요청 없이 표시할 수 있다. `generateStaticParams`는 부분 지원이다. `router.reload()`는 full mode의 현재 route 재요청용이며 build-time-only code를 production에서 재실행하지 않는다. CSS/CSS module은 server import에서 client bundle로 hoist된다.

## 배포와 알려진 한계

web은 export/serve/EAS server 배포, native는 versioned server 연결이 필요하다. 현재 Snack bundling, EAS Update, DOM production Server Functions, RSC payload의 HTML render, 완전한 static/server output과 form integration은 미지원/제한 상태다. Hermes에서 Server Function이 다른 Server Function을 호출하는 경로도 제한된다. unit test 통과나 개발 preview가 production runtime/배포 호환성을 증명하지 않는다.

## 출처

- [Expo Documentation, Using React Server Components in Expo Router apps](https://docs.expo.dev/guides/server-components)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
