---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo custom scheme와 incoming URL 처리"]
---

# Expo custom scheme와 incoming URL 처리

## native scheme 등록

```json
{ "expo": { "scheme": "store" } }
```

scheme를 추가한 뒤 새 development build를 설치해야 `store://` URL을 OS가 앱에 전달한다. custom scheme가 없으면 Prebuild가 `android.package`, `ios.bundleIdentifier`를 기본 scheme로 등록한다. 앱 내부 path를 처리하는 routing은 별도로 필요하며 Expo Router에서는 route deep linking이 기본 연결된다.

## 초기 URL과 실행 중 event

```tsx
import { Text } from 'react-native';
import * as Linking from 'expo-linking';

export default function IncomingURL() {
  const url = Linking.useLinkingURL();
  const path = url ? Linking.parse(url).path : null;
  return <Text>{path ?? 'No incoming URL'}</Text>;
}
```

`useLinkingURL()`은 앱을 시작한 URL을 `getInitialURL()`로 읽고 이미 실행 중인 앱의 새 링크를 `addEventListener('url', callback)`로 관찰한다. `Linking.parse()`는 hostname, path와 queryParams를 추출하며 Expo Go 같은 비표준 URL도 고려한다. 수동 event subscription을 쓰면 화면/앱 lifecycle에 맞게 제거한다.

## 링크 실행 예제

```sh
npx uri-scheme open store://product/42 --android
npx uri-scheme open store://product/42 --ios
```

기기 브라우저의 anchor 클릭으로도 검사한다. 주소창에 custom scheme를 입력하는 것과 링크 클릭은 동일한 UX를 보장하지 않는다.

Expo Go는 `exp://<host>:8081/--/product/42` 형태다. `/--/` 뒤가 앱 deep-link 경로이며 앞은 개발 bundle 주소다. `exp`는 HTTP, `exps`는 HTTPS로 연결하지만 insecure TLS certificate를 지원하는 우회 수단은 아니다.

## 한계

앱이 미설치된 기기에서는 custom scheme가 콘텐츠 web fallback을 제공하지 않는다. HTTP(S) 주소의 설치/미설치 전환을 원하면 App Links와 Universal Links를 구성한다. 인증 또는 결제 callback에서는 URL이 있다고 성공으로 처리하지 말고 workflow 상태와 서버 검증을 연결한다.

## 출처

- [Expo Documentation, Linking into your app](https://docs.expo.dev/linking/into-your-app)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
