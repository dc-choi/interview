---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Linking과 Android Intent"]
---

# Expo SDK Linking과 Android Intent

expo-linking은 Android/iOS/tvOS/web의 URL 생성, 시작 URL과 runtime URL event를 다룬다. expo-intent-launcher는 Android activity 실행과 결과를 다룬다. 각각 npx expo install로 설치하고 namespace import한다. 화면 routing은 [[Expo-Router-Link]]와 [[Expo-Router-Native-Intent-Handoff]]를 연결해 사용한다.

## Linking URL과 구독

useLinkingURL()은 initial URL을 synchronous로 읽고 새 URL/reload에 반응한다. useURL은 deprecated다. getInitialURL():Promise<string|null>, getLinkingURL():string|null, parseInitialURLAsync():Promise<ParsedURL>은 초기값 조회용이다. parse(url)의 scheme/hostname/path/queryParams는 nullable이며 query 값은 string/string[]/undefined다. URL이 없으면 parseInitialURLAsync 결과 필드가 null, web은 현재 window URL이다. clearInitialURL()은 초기값을 null로 지우고 web에서는 no-op다. addEventListener('url', ({url})=>...)은 remove 가능한 subscription을 반환한다.

createURL(path,{scheme, isTripleSlashed, queryParams})은 build에서 scheme://path, web에서 origin/path, Expo Go에서 exp://host:8081/--/path를 생성한다. triple slash를 요청할 수 있으며 platform-specific scheme이 공통 scheme보다 우선한다. Expo Go의 published update URL은 안정적 callback 계약이 아니므로 OAuth callback은 development build로 확인한다. collectManifestSchemes()는 구성된 schemes/package/bundleID 목록, hasCustomScheme()/hasConstantsManifest()는 boolean, resolveScheme({scheme, isSilent})은 선택된 scheme 문자열이다.

```ts
import * as Linking from 'expo-linking';
const url = Linking.createURL('account', {queryParams:{tab:'billing'}});
const parsed = Linking.parse(url);
if (await Linking.canOpenURL(url)) await Linking.openURL(url);
```

canOpenURL():Promise<boolean>은 web에서 항상 true이며 iOS LSApplicationQueriesSchemes/Android query 제한 때문에 거부될 수 있다. openURL():Promise<true>는 OS launch/사용자 확인의 성공을 뜻하고 취소/처리 앱 없음은 reject할 수 있다. 상대 앱의 실제 작업 완료를 뜻하지 않는다. openSettings():Promise<void>는 앱 설정을 연다. Linking.sendIntent는 RN 호환용이며 Android 전용 intent는 아래 모듈을 사용한다.

## IntentLauncher 계약

startActivityAsync(action:string, params={}):Promise<IntentLauncherResult>는 사용자가 activity에서 돌아오면 resolve한다. params는 category, explicit packageName/className, data URI, MIME type, flags bitmask, extra record다. Android URI scheme은 소문자로 쓰고 extra key는 package prefix를 붙인다. result는 resultCode, 선택적 data URI와 extra를 포함한다. ResultCode.Success=-1, Canceled=0, FirstUser=1부터 custom code다.

```ts
import * as IntentLauncher from 'expo-intent-launcher';
const result = await IntentLauncher.startActivityAsync(
  IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
);
```

ActivityAction은 LOCATION_SOURCE_SETTINGS, WIRELESS_SETTINGS, APPLICATION_DETAILS_SETTINGS, APP_NOTIFICATION_SETTINGS, CHANNEL_NOTIFICATION_SETTINGS, BIOMETRIC_ENROLL, MANAGE_OVERLAY_PERMISSION, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, REQUEST_SCHEDULE_EXACT_ALARM, APP_LOCALE_SETTINGS, ACCESSIBILITY_SETTINGS 등 설정/activity action 문자열을 제공한다. 목록에 있다고 모든 Android OS/vendor가 handler를 제공하는 것은 아니므로 failure 경로가 필요하다. source의 BLUTOOTH_FIND_BROADCASTS_ACTIVITY처럼 철자가 특이한 상수도 임의로 교정하면 API 이름이 바뀐다.

openApplication(packageName):void는 설치 앱을 실행한다. getApplicationIconAsync(packageName):Promise<string>은 data:image/png; base64,... 또는 icon이 없을 때 빈 문자열을 반환하며 expo-image 등에 표시할 수 있다.

## 출처

- [Expo Documentation, Linking](https://docs.expo.dev/versions/latest/sdk/linking)
- [Expo Documentation, IntentLauncher](https://docs.expo.dev/versions/latest/sdk/intent-launcher)

## 관련 문서

- [[Expo-Router-Link]]
- [[Expo-Router-Native-Intent-Handoff]]
