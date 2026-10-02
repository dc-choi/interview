---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Android permission의 선언과 요청

React Native 0.87 기준이다.

PermissionsAndroid는 native 설정을 관리하는 Android 앱의 위험 권한을 확인/요청한다. Expo managed 환경에서는 해당 framework의 permission 흐름을 먼저 사용한다.

## 선언과 runtime 결과

normal permission은 Manifest 선언을, dangerous permission은 해당 OS의 runtime 요청을 확인한다. permission 상수가 존재한다고 모든 Android version에서 같은 요청과 의미를 갖는 것은 아니다. camera/microphone/location, calendar/contacts/phone/SMS, sensor/media/storage, bluetooth/nearby device/notification 권한은 사용 기능과 OS version에 맞춰 최소로 선택한다.

check는 boolean Promise, request는 granted/denied/never_ask_again을 반환한다. requestMultiple은 permission별 result mapping을 반환하므로 한 권한 승인만 보고 전체 성공으로 처리하지 않는다.

```tsx
const result = await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.CAMERA,
);
if (result !== PermissionsAndroid.RESULTS.GRANTED) {
  return;
}
// 승인된 camera 기능으로 진행한다.
```

설명 조각이며 native build나 실제 dialog를 검증하지 않았다. denied와 never_ask_again을 분리해 재요청/설정 이동과 제한 기능을 안내한다. OS의 재요청 정책을 무시하고 반복 prompt하지 않는다.

## rationale과 경계

rationale은 OS가 설명이 필요하다고 판단할 때 title/message/buttonPositive 등을 먼저 보여 주는 선택값이다. 앱의 문구만으로 permission을 승인하는 API가 아니다. request 성공 이후에도 권한이 취소될 수 있으므로 실제 기능 진입 시 현재 상태를 확인한다.

구형 SDK 23 이전 동작 설명은 이력이며 현재 지원 OS 전체의 정책으로 확대하지 않는다. storage/media/background location과 notification은 target SDK와 OS 조건을 별도로 확인한다.

## 출처

- [React Native, permissionsandroid](https://reactnative.dev/docs/permissionsandroid)

## 관련 문서

- [[RN-Platform-Identity]]
- [[RN-Linking-API]]
- [[RN-Security-Storage]]
