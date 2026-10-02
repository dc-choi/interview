---
tags: [expo, expo-sdk, background]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Background Task 관리"]
---

# Expo SDK Background Task 관리

expo-task-manager는 Location/BackgroundTask/BackgroundFetch/Notifications의 task 정의와 등록 상태를 관리한다. npx expo install expo-task-manager, namespace import한다. 원문 overview의 Expo Go 테스트 가능 문구보다 isAvailableAsync의 제한이 구체적이다. Android Expo Go는 불가, iOS Expo Go는 background 실행 불가, web은 false이며 development build와 개별 module 지원을 확인한다.

## Definition과 registration

defineTask(name, executor):void는 bundle global scope에서 호출한다. background launch에서는 JS를 시작하고 task를 실행한 뒤 종료하며 view를 mount하지 않으므로 effect/컴포넌트 안에 정의하지 않는다. definition은 JS function, registration은 해당 module의 native API이며 둘은 다르다. 등록은 persistent storage로 session 사이 유지된다.

```ts
TaskManager.defineTask('location-tracking', async ({data,error}) => {
  if (error) { recordFailure(error.code); return; }
  if (data) await persistLocations(data.locations);
});
// 권한을 받은 뒤 Location.startLocationUpdatesAsync('location-tracking', options)
```

body는 data(module별 generic), error:{code:string|number, message}|null, executionInfo{eventId, taskName, iosappState?}다. executor는 Promise를 반환할 수 있으므로 작업 완료까지 await한다. unique eventId로 중복 처리를 판단할 수 있지만 exactly-once를 보장하는 표시는 아니다.

## 관리 API와 native 설정

isAvailableAsync():Promise<boolean>, isTaskDefined(name):boolean, isTaskRegisteredAsync(name):Promise<boolean>으로 지원/정의/등록을 각각 검사한다. getRegisteredTasksAsync():Promise<{taskName, taskType, options}[]>는 native 등록 목록, getTaskOptionsAsync(name)는 등록 options 또는 찾지 못하면 null이다(type 표시는 Promise<TaskOptions>와 설명이 불일치하므로 null을 처리).

unregisterTaskAsync(name)/unregisterAllTasksAsync():Promise<void>는 업데이트 수신을 해제한다. 가급적 Location.stopLocationUpdatesAsync처럼 등록 module의 specialized stop을 사용한다. signout 시 소유한 task만 해제할지 전체 해제할지 앱 정책으로 정한다. iOS UIBackgroundModes는 각 background feature에 맞는 key와 rebuild가 필요하며 TaskManager 설치만으로 모든 기능 권한이 생기지 않는다.

## 출처

- [Expo Documentation, TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager)

## 관련 문서

- [[Expo-SDK-Location]]
- [[Expo-SDK-Notifications]]
