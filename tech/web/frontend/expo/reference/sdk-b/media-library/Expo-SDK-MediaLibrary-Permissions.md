---
tags: [expo, expo-sdk, media-library]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK MediaLibrary 권한과 변경 구독"]
---

# Expo SDK MediaLibrary 권한과 변경 구독

current/legacy MediaLibrary는 같은 native library permission 설정을 사용한다. broad media access는 Android Play Photo/Video policy에 맞는 앱 목적에서 사용하고 단일 사용자 선택이면 picker 경로를 검토한다. 설치/plugin이 runtime access grant를 뜻하지 않는다.

## Plugin과 permission API

photosPermission은 iOS NSPhotoLibraryUsageDescription, savePhotosPermission은 NSPhotoLibraryAddUsageDescription, preventAutomaticLimitedAccessAlert=false는 iOS limited alert 자동 표시를 제어한다. Android isAccessMediaLocationEnabled=false는 location metadata 권한, granularPermissions 기본 photo/video/audio는 READ_MEDIA_IMAGES/VIDEO/AUDIO native 선언을 제한한다. 변경 시 binary rebuild가 필요하다. legacy requestLegacyExternalStorage 설명은 오래된 scoped-storage migration 문맥이며 Android 최신 target의 broad storage bypass로 취급하지 않는다.

getPermissionsAsync(writeOnly=false, granularPermissions?)와 requestPermissionsAsync(...):Promise<PermissionResponse>, usePermissions({writeOnly, granularPermissions})의[response|null, request, get]를 제공한다. Android13+ granular 값은 native plugin에 포함된 것만 요청한다. status/granted/canAskAgain/expires와 accessPrivileges(all/limited/none)를 확인한다. granted=true라도 전체 library를 읽을 수 있는 것은 아니다. 원문의 Android API14+는 Android14 OS 선택적 media access 문맥과 혼동되는 표현이므로 APIlevel14로 해석하지 않는다.

## Limited selection과 change events

current presentPermissionsPicker(mediaTypes?:['photo'|'video']):Promise<void>는 limited 사용자에게 selection modal을 열고 그 외 no-op다. unavailable이면 reject할 수 있다. legacy 함수명은 presentPermissionsPickerAsync다. 호출 result만으로 selection 변경 여부를 알 수 없다.

addListener(callback)→subscription.remove()로 구독한다. iOS hasIncrementalChanges=true이면 current event insertedAssets/deletedAssets/updatedAssets는 ph:// ID string 배열이다. false는 full reload 필요이며 permission selection 변경도 원인일 수 있다. permission만 유일한 원인으로 단정하지 않는다. legacy event 배열은 Asset objects라 current event와 shape가 다르다. Android callback은 emptyobject라고 설명하고 type은 hasIncrementalChanges=false라고 정의하므로 missing field도 full reload로 처리한다. removeAllListeners는 다른 consumer도 제거하므로 자기 subscription cleanup을 우선한다.

## 출처

- [Expo Documentation, MediaLibrary](https://docs.expo.dev/versions/latest/sdk/media-library)

## 관련 문서

- [[Expo-SDK-MediaLibrary]]
- [[Expo-SDK-MediaLibrary-Legacy]]
