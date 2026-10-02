---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 권한의 빌드 설정과 런타임 요청"]
---

# Expo 권한의 빌드 설정과 런타임 요청

## 두 단계 계약

민감 정보 접근은 native 빌드 시 선언과 런타임 사용자 요청을 함께 충족해야 한다. 예를 들어 media library 요청은 `MediaLibrary.requestPermissionsAsync()`로 수행하지만 development/standalone build에 필요한 native 선언이 먼저 있어야 한다. Expo Go에서 요청이 성공해도 자신의 바이너리 구성이 맞다는 증거는 아니다.

## Android 추가와 제거

```json
{
  "expo": {
    "android": {
      "permissions": ["android.permission.SCHEDULE_EXACT_ALARM"],
      "blockedPermissions": ["android.permission.RECORD_AUDIO"]
    }
  }
}
```

라이브러리 config plugin이나 package의 Manifest가 많은 권한을 자동 추가한다. `android.permissions`는 추가 선언용이며 자동 포함 권한을 빼는 목록이 아니다. 제거는 full permission name을 `android.blockedPermissions`에 넣는다.

수동 native 앱은 manifest merger의 제거 지시를 사용한다.

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.RECORD_AUDIO"
                   tools:node="remove" />
</manifest>
```

dangerous/signature permission은 실제 기능과 정당한 이유를 대조한다. 필요 없는 권한은 심사와 사용자 신뢰에 영향을 준다.

## iOS 사용 이유

`ios.infoPlist.NSCameraUsageDescription` 등 usage description을 앱의 실제 기능에 맞게 작성한다. 라이브러리 기본 문구만 유지하면 목적 설명이 불충분할 수 있다. `expo-media-library` plugin의 `photosPermission`, `savePhotosPermission`처럼 전용 plugin 옵션도 사용할 수 있다.

Info.plist 수정은 OTA로 바뀌지 않는다. 메시지를 수정했으면 native 재빌드와 새 바이너리 배포가 필요하다. 수동 native 앱은 Xcode에서 Info.plist를 직접 관리한다.

## web과 거절 흐름

camera/location 등 web permission은 HTTPS 또는 `http://localhost` 같은 secure context에서 요청한다. 모바일 기기가 LAN IP의 HTTP 개발 서버를 여는 경우 localhost 예외와 같지 않다.

사용자가 거절한 뒤에는 OS와 권한 종류에 따라 재요청이 제한될 수 있다. 반복 팝업 대신 denied 상태와 설정 이동 흐름을 처리하고, 초기 허용/거절 시나리오를 다시 검사하려면 앱 삭제와 재설치를 사용할 수 있다. Expo Go 재설치는 앱 내부 프로젝트 하나의 상태만 지우는 것과 다르다.

## 출처

- [Expo Documentation, Permissions](https://docs.expo.dev/guides/permissions)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
