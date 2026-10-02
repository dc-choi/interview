---
tags: [react-native, android, background, headless]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Android Headless JS"]
---

# React Native Android Headless JS

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Headless JS 실행 모델

Headless JS는 앱이 background에 있을 때 UI 없이 JavaScript 작업을 실행한다. 데이터 동기화, 알림 처리와 같은 작업에 사용할 수 있다. UI를 렌더링하거나 UI state를 직접 조작하는 경로로 사용하지 않는다.

작업은 async 함수이며 Promise가 완료되면 다른 작업이나 foreground 앱이 없는 경우 RN runtime이 paused 상태로 돌아간다. 지속 실행이나 OS 제한 회피를 보장하는 장치가 아니다.

## JavaScript 등록

```js
import {AppRegistry} from 'react-native';

AppRegistry.registerHeadlessTask('SyncTask', () =>
  require('./SyncTask'),
);
```

```js
// SyncTask.js
module.exports = async taskData => {
  // UI 없이 필요한 작업을 수행하고 Promise를 완료한다.
};
```

등록명은 native의 `HeadlessJsTaskConfig` 이름과 일치해야 한다. registry에는 실행 함수 그 자체보다 함수 module을 반환하는 provider를 등록한다.

## native Service 구성

1. Android 클래스를 `HeadlessJsTaskService`에서 상속한다.
2. `getTaskConfig(intent)`에서 extras를 읽는다.
3. 이름, JS 전달 data, timeout(ms), foreground 허용 여부를 지정한 `HeadlessJsTaskConfig`를 반환한다.
4. 실행할 데이터가 없거나 실행하지 않을 조건이면 `null`을 반환한다.
5. AndroidManifest의 `<application>` 안에 Service를 등록한다.

예제 구성은 task name, `Arguments.fromBundle(extras)`, timeout 5000ms와 foreground 허용 `false`다. timeout과 foreground 여부는 제품 작업에 맞춰 명시한다.

```xml
<service android:name="com.example.SyncTaskService" />
```

native에서 Intent extras로 data를 준비하고 service를 시작하면 JS가 올라와 등록된 작업을 실행한다. Intent Bundle에는 parcelable로 전달 가능한 값만 넣는다.

## foreground와 WakeLock

기본 foreground 허용값은 `false`다. 허용하지 않은 task를 앱 foreground에서 실행하면 crash할 수 있다. 무거운 background 작업이 UI를 느리게 하지 않도록 실행 조건을 정한다.

BroadcastReceiver에서 시작한다면 `onReceive`가 반환되기 전에 `HeadlessJsTaskService.acquireWakeLockNow(context)`를 호출한다. native service의 생명주기와 task 종료를 함께 관리한다.

RN 가이드에는 `startForegroundService`와 connectivity broadcast 예제가 있다. 이 예제만으로 대상 Android SDK의 foreground service 시작 제한, notification과 permission 요구를 충족했다고 간주하지 않는다. 해당 SDK 정책은 Android 공식 문서에서 별도 확인한다.

## 재시도 계약

기본 Headless task는 재시도하지 않는다. native의 retry policy와 JS의 특정 오류가 함께 있어야 한다.

- `LinearCountingRetryPolicy(maxRetries, delayMs)`는 고정 간격과 최대 횟수를 지정한다.
- 다른 정책은 `HeadlessJsRetryPolicy` 계약을 구현한다.
- policy를 `HeadlessJsTaskConfig`의 추가 인자로 전달한다.
- task가 retry 대상 `HeadlessJsTaskError`를 던졌을 때만 retry를 수행한다.
- 일반 오류도 retry하려면 분류한 오류를 잡아 해당 retry 오류로 변환한다.

재시도해도 안전한 작업인지 확인한다. 이미 반영된 저장/전송을 다시 수행할 수 있으므로 idempotency, timeout과 최대 횟수를 작업 계약에 포함한다.

## 실행 조건과 완료 확인

OS event를 받는 것과 인터넷 요청이 성공하는 것은 별개다. 예제의 네트워크 transport 검사는 실제 서비스 연결 가능성까지 보장하지 않는다.

확인 항목은 background 진입, foreground 허용/거부, data 전달, timeout, 지정 오류의 retry와 일반 오류의 종료다. receiver/service 등록만 확인하지 않고 실제 target 기기의 OS 정책에서 작업 시작과 종료를 확인한다.

## 출처

- [React Native, Headless JS](https://reactnative.dev/docs/headless-js-android)

## 관련 문서

- [[RN-Android]]
- [[RN-Native-Module-Advanced]]
