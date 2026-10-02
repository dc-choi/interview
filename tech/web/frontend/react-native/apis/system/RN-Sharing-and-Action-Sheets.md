---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 공유와 iOS action sheet

React Native 0.87 기준이다.

## Share의 완료 의미

Share.share는 message 또는 iOS url을 받아 OS share UI를 연다. Android title/dialogTitle과 iOS subject/excludedActivityTypes/tintColor/anchor의 지원을 구분한다. iPad는 anchor 위치를 함께 고려한다.

Promise는 iOS에서 sharedAction/dismissedAction과 optional activityType을 반환한다. Android는 sharedAction으로 resolve하므로 이 값만으로 사용자가 최종 공유를 완료했는지 구분하지 못한다. 일부 iOS 기능은 simulator에서 동작하지 않을 수 있다. 공유 dialog를 열었다는 사실을 외부 수신자의 도착/읽음으로 기록하지 않는다.

## ActionSheetIOS

showActionSheetWithOptions는 필수 options 문자열 배열과 zero-based 선택 index callback을 사용한다. cancel/destructive/disabled index, title/message, tint/취소 tint와 theme를 지정한다. index와 실제 업무 action을 명확하게 연결하고, 배열 순서를 바꿀 때 취소/삭제 의미도 같이 확인한다.

dismissActionSheet는 가장 위 sheet를 닫으며 sheet가 없으면 warning을 낸다. showShareActionSheetWithOptions는 success와 method callback 또는 failure callback을 받는다. local file/base64 uri는 파일 내용을 공유하고 remote URL은 올바른 scheme 형식을 갖춰야 한다.

앱의 navigation route 이동, OS link 열기와 share sheet를 여는 동작은 서로 다른 기능이다.

## 출처

- [React Native, share](https://reactnative.dev/docs/share)
- [React Native, actionsheetios](https://reactnative.dev/docs/actionsheetios)

## 관련 문서

- [[RN-Alerts]]
- [[RN-Linking-API]]
- [[RN-Platform-Identity]]
