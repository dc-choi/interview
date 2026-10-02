---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Android 뒤로 가기 처리

React Native 0.87 기준이다.

BackHandler는 Android hardware back을 구독한다. 마지막에 등록한 listener부터 호출하며 true를 반환한 listener가 처리를 끝내면 이전 listener는 실행되지 않는다. 아무도 처리하지 않으면 기본 back 동작을 따른다.

## 화면 수명에 맞추기

navigation이 이미 back을 처리하는지 확인하고 현재 화면이 책임질 때만 listener를 등록한다. addEventListener(hardwareBackPress, handler)의 subscription은 화면 수명이 끝나면 remove한다.

```tsx
const handler = () => {
  if (!editing) return false;
  setEditing(false);
  return true;
};
```

설명 조각은 편집 모드 종료를 처리하며 실제 앱 navigation과의 실행 검증은 하지 않았다. true/false는 저장 성공이 아니라 back event를 소비했는지의 결과다. exitApp은 앱 종료의 명령형 호출이므로 단순 화면 이동 대신 쓰지 않는다.

Modal이 열려 있으면 BackHandler event가 나오지 않는다. 이때는 Modal.onRequestClose에서 닫기 정책을 처리한다. asynchronous 확인 dialog를 띄우면 handler에서 즉시 소비 여부를 정하고 dialog 결과는 별도로 반영한다.

## 출처

- [React Native, backhandler](https://reactnative.dev/docs/backhandler)

## 관련 문서

- [[RN-Modal]]
- [[RN-Navigation]]
- [[RN-App-State]]
