---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["수동 native 앱의 expo-updates 통합"]
---

# 수동 native 앱의 expo-updates 통합

## 대상과 준비

이 workflow는 native 폴더를 수동 유지하는 기존 React Native 앱 대상이다. CNG 앱은 EAS Update getting-started/config plugin 경로를 사용한다. 먼저 expo/Expo Modules와 Expo CLI bundling을 설치한다.

```sh
npx expo install expo-updates
npx pod-install
eas update:configure
```

EAS configure는 app config에 updates URL과 projectId를 연결한다. 자기 서버를 쓰면 Expo Updates protocol을 구현한 endpoint를 지정한다. 개발 localhost HTTP 예제는 production updater의 transport/security 설정으로 복사하지 않는다.

## JS config와 native config 일치

app.json만 바꿔도 수동 native Manifest/Expo.plist가 자동 갱신되는 것은 아니다. Android app Gradle의 JS engine 설정, Manifest의 updater enabled/URL/runtime 설정과 strings.xml의 runtime version을 맞춘다. iOS Podfile/Podfile.properties.json의 engine과 Supporting/Expo.plist의 값을 일치시킨다.

| iOS plist key | 의미 |
| --- | --- |
| `EXUpdatesEnabled` | updater 사용 |
| `EXUpdatesURL` | manifest service endpoint |
| `EXUpdatesRuntimeVersion` | native와 OTA 호환 범위 |
| `EXUpdatesCheckOnLaunch` | 예: ALWAYS launch check |
| `EXUpdatesLaunchWaitMs` | 시작 시 기다리는 시간(ms) |
| `EXUpdatesRequestHeaders` | channel 등 요청 header |

예제 runtime `1.0.0`을 앱의 실제 runtime compatibility 확인 없이 사용하지 않는다. localhost custom server는 device 자신의 localhost와 개발 머신 주소가 다르며 Android cleartext 허용은 개발 범위에서 제한한다.

## channel을 binary에 고정

EAS Build는 eas.json build profile의 channel을 native build 직전에 반영한다. local/다른 CI는 native 파일에 직접 넣는다.

```xml
<meta-data
  android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY"
  android:value="{&quot;expo-channel-name&quot;:&quot;preview&quot;}" />
```

XML attribute 안의 JSON quote는 escape한다. iOS는 EXUpdatesRequestHeaders dict에 expo-channel-name/preview를 넣는다. preview update가 production binary로 향하지 않도록 channel과 runtimeVersion을 함께 확인한다.

CNG로 전환하면 `updates.requestHeaders`와 Prebuild로 생성할 수 있다. 설치 뒤 release binary의 embedded fallback, update fetch/launch, native-OTA version mismatch와 rollback 동작은 별도 runtime 검증이 필요하다.

## 출처

- [Expo Documentation, Install expo-updates in an existing React Native project](https://docs.expo.dev/bare/installing-updates)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
