---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 외부 앱 링크와 브라우저 열기"]
---

# Expo 외부 앱 링크와 브라우저 열기

## URL 열기

```ts
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

await Linking.openURL('https://example.com');
await WebBrowser.openBrowserAsync('https://example.com');
```

`openURL`은 OS의 default handler로 URL을 전달한다. `openBrowserAsync`는 앱 내부 browser 경험을 제공하며 인증 흐름에서도 쓰인다. Router의 `<Link href="https://example.com">`은 native에서 interactive Text, web에서 anchor로 렌더링해 hover, context menu와 링크 복사를 보존한다. `@expo/html-elements`의 `A`도 같은 범주의 universal anchor를 제공한다.

| scheme | 대상 |
| --- | --- |
| `https`, `http` | 웹 브라우저 |
| `mailto` | 메일 앱 |
| `tel` | 전화 앱 |
| `sms` | 메시지 앱 |

custom scheme은 서비스의 URL 계약에 맞게 path/query를 구성한다. target 앱이 없으면 handler 실패를 처리하고 필요하면 web/store fallback을 제공한다. fallback 라이브러리는 선택지이며 모든 outgoing link에 새 패키지가 필수인 것은 아니다.

## Android intent query

Android 11/API30 이상에서는 package visibility를 고려해 Manifest `queries`에 필요한 intent를 선언한다. config plugin에서 `withAndroidManifest`를 사용해 `SENDTO`와 `mailto`, `DIAL` 등을 설정할 수 있다. 기존 queries를 의도치 않게 덮어쓰지 않도록 plugin 병합 결과를 확인한다. 기기 설정 화면을 열려면 URL scheme 대신 `expo-intent-launcher`의 platform intent를 검토한다.

## iOS canOpenURL

`Linking.canOpenURL`로 타 앱 설치 여부를 조회하려면 `ios.infoPlist.LSApplicationQueriesSchemes`에 조회할 custom scheme를 선언한다. 선언이 없으면 앱이 설치돼도 false일 수 있다. 예를 들어 `{"LSApplicationQueriesSchemes":["targetapp"]}`를 설정하고 바이너리를 다시 만든다. Expo Go로 이 앱별 native 설정을 검사할 수 없다.

## 자신의 callback URL 생성

```ts
const redirect = Linking.createURL('callback', {
  queryParams: { flow: 'checkout' },
});
```

앱 build에서는 설정한 scheme를 사용해 `store://callback?flow=checkout`을, Expo Go에서는 `exp://<host>:8081/--/callback?flow=checkout`을 만든다. `createURL`을 사용하면 환경별 host를 hardcode하지 않아도 된다. Expo Go 주소는 고정 인증 redirect용으로 적합하지 않으므로 development build의 scheme를 등록한다.

## 출처

- [Expo Documentation, Linking into other apps](https://docs.expo.dev/linking/into-other-apps)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
