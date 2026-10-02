---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native iOS Settings와 외부 변경 감지

React Native 0.87 기준이다.

Settings는 iOS NSUserDefaults의 지속 key/value 저장 wrapper다. Android 공통 저장 API나 credential 보호 저장소가 아니다.

get(key)은 현재 값을 읽고 set(record)은 하나 이상의 값을 기록한다. watchKeys는 key 하나나 배열의 **RN 밖에서 발생한 변경**을 구독하고 watch id를 반환한다. 내부 Settings.set 호출은 watch callback을 발생시키지 않는다.

앱에서 set한 직후 화면 state를 바꾸려면 직접 React state를 갱신한다. watch가 자동으로 다시 렌더한다고 기대하지 않는다. 구독이 끝나면 clearWatch(watchId)로 해제한다. 민감정보는 별도의 OS secure storage와 앱 보안 정책을 따른다.

## 출처

- [React Native, settings](https://reactnative.dev/docs/settings)

## 관련 문서

- [[RN-Security-Storage]]
- [[RN-App-State]]
