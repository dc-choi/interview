---
tags: [expo, expo-integrations, observability]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Sentry, BugSnag와 LogRocket 연계"]
---

# Expo Sentry, BugSnag와 LogRocket 연계

Sentry와 BugSnag는 exception, stack trace와 breadcrumb로 오류 원인을 찾고 LogRocket은 session replay와 오류 관찰을 연결한다. 개발 환경에서 오류가 보였다는 사실과 production의 minified/native stack을 원본으로 복원할 수 있다는 사실은 별도로 확인한다.

## Sentry 설치와 source map

Sentry project의 organization slug/project/DSN과 Source Map Upload/Release Creation 권한 auth token을 준비한다. `@sentry/wizard -i reactNative`는 dependency, Metro와 초기화를 편집하는 setup 도구다. release build에서 controlled error를 만들어 source map이 올바른 원본 위치로 복원되는지 확인한다. DSN과 upload token의 권한을 구분하고 SENTRY_AUTH_TOKEN을 build environment의 sensitive variable로 둔다.

EAS Build는 wizard/plugin 설정으로 build 중 map을 upload한다. EAS Update는 update export와 같은 dist를 `sentry-expo-upload-sourcemaps dist`로 별도 upload한다. 오래된 다른 export map을 올리면 matching release가 다를 수 있다.

```tsx
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
Sentry.init({ dsn: '<DSN>' });
Sentry.getGlobalScope().setTag('expo-update-id', Updates.updateId);
Sentry.getGlobalScope().setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch);
```

manifest의 metadata.updateGroup과 extra.expoClient의 owner/slug가 존재하는지 검증한 뒤 update group/debug URL tag를 추가한다. embedded launch에는 update group link가 적용되지 않는다. 앱의 native build와 OTA update를 하나의 release로 혼동하지 않는다.

EAS dashboard 연계는 Sentry owner/manager/admin 권한으로 account Connections에서 연결한 뒤 EAS Project Settings에서 Sentry project를 Link한다. Deployments의 release에서 crash, replay와 Sentry detail을 볼 수 있다. 계정 연결이 source map upload 설정을 대신하지 않는다.

## BugSnag

Expo의 BugSnag 문서는 provider 공식 integration으로 JavaScript error와 EAS Update source map upload를 연결한다. release health/stability score로 안정화 시점을 정하고 root cause grouping/business impact/segment/experiment로 우선순위를 잡는 기능을 설명한다. breadcrumb와 stack은 재현 자료이며 Expo 페이지에는 구체적인 config plugin/API 코드가 없어 Sentry의 설정을 동일한 계약으로 복제하지 않는다.

## LogRocket

@logrocket/react-native와 expo-build-properties를 설치하고 app config에 LogRocket plugin을 포함한다. 원문의 Android minSdkVersion=25는 LogRocket 예제 값이며 SDK57 플랫폼 최소 요구를 낮추는 설정으로 쓰지 않는다. native binary를 rebuild해야 한다.

```tsx
useEffect(() => {
  LogRocket.init('<App ID>', {
    updateId: Updates.isEmbeddedLaunch ? null : Updates.updateId,
    expoChannel: Updates.channel,
  });
}, []);
```

root에서 한 번 초기화하며 embedded bundle의 updateId는 null로 표시한다. Expo account Connections에서 LogRocket 계정을 연결하고 project General에서 provider project를 연결하면 Native Deployments/Updates dashboard에 최근 session과 View on LogRocket 링크가 생긴다. replay를 활성화하기 전 입력/민감 화면 masking과 동의를 확인한다. 이 문서 작업에서 provider 계정 생성, 오류 발송, build나 upload를 실행하지 않았다.

## 출처

- [Expo Documentation, Using Sentry](https://docs.expo.dev/guides/using-sentry)
- [Expo Documentation, Using BugSnag](https://docs.expo.dev/guides/using-bugsnag)
- [Expo Documentation, Using LogRocket](https://docs.expo.dev/guides/using-logrocket)

## 관련 문서

- [[Expo-Integrations-Analytics]]
- [[Expo-Integrations-PostHog]]
- [[Expo-Integrations-Privacy]]
