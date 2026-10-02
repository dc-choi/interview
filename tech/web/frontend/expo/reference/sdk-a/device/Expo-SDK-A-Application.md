---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Application native binary 식별과 설치 정보"]
---

# Application native binary 식별과 설치 정보

## 설치와 binary 정보

`npx expo install expo-application`, `import * as Application from 'expo-application'`. Android/iOS/tvOS/web/Expo Go에서 API를 제공하지만 platform 별 결과가 다르다.

applicationId는 Android application ID/iOS bundle ID, applicationName은 home screen이 름이다. nativeApplicationVersion은 Android versionName/iOS CFBundleShortVersionString, nativeBuildVersion은 Android versionCode/iOS CFBundleVersion이다. build version 반환은 string이다. web에서는 이 값들이 null이다.

native 값은 설치된 binary 기준이며 OTA app config의 version/buildNumber와 달라질 수 있다. app UI와 server compatibility 진단에는 둘을 구분한다.

## 플랫폼 method

| API | 조건/결과 |
|---|---|
| getAndroidId | Android synchronous string, signing key/user/device 조합, reset/signing 변경 시 바뀔 수 있음 |
| getIosIdForVendorAsync | iOS IDFV string/null, vendor 앱 모두 제거 시 변경 가능 |
| getInstallationTimeAsync | native install Date, reinstall 시 갱신, web null 설명 있음 |
| getLastUpdateTimeAsync | Android package update Date |
| getInstallReferrerAsync | Android Play Store referrer string, 완전 URL 아닐 수 있음 |
| getIosApplicationReleaseTypeAsync | UNKNOWN/SIMULATOR/ENTERPRISE/DEVELOPMENT/AD_HOC/APP_STORE |
| getIosPushNotificationServiceEnvironmentAsync | development/production/null entitlement 값 |

IDFV는 reboot 후 unlock 전 null 일 수 있으므로 재조회한다. Android ID/IDFV는 영구 사용자 계정 ID 나 인증 자격이 아니다. APNs environment reference의 simulator null 설명은 최신 setup guide의 지원 simulator 조건과 다를 수 있으므로 실제 entitlement/provider 지원을 확인한다.

```ts
console.log({
  id: Application.applicationId,
  version: Application.nativeApplicationVersion,
  build: Application.nativeBuildVersion,
});
```

## Install referrer 실패

ERR_APPLICATION_PACKAGE_NAME_NOT_FOUND는 package 조회 실패다. INSTALL_REFERRER_UNAVAILABLE은 Play Store/API 미지원, CONNECTION은 연결 실패, REMOTE_EXCEPTION은 remote process 문제, SERVICE_DISCONNECTED는 서비스 연결 끊김이다. 일반 INSTALL_REFERRER 오류는 responseCode를 확인한다. Play 없는 emulator에서는 unavailable이 정상일 수 있다. attribution 조회 실패 때문에 app 시작 전체를 중단하지 않는다.

## 출처

- [Expo Documentation, Application](https://docs.expo.dev/versions/latest/sdk/application)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
