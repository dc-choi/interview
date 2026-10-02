---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["BackgroundTask deferrable 작업과 shared worker"]
---

# BackgroundTask deferrable 작업과 shared worker

## OS scheduler와 조건

`expo-background-task`는 Android WorkManager와 iOS BGTaskScheduler로 미뤄도 되는 작업을 실행한다. 실행 시각을 정하는 timer가 아니다. OS가 전원, network, 자원과 사용 패턴을 판단한다. Android 최소 interval은 15 분이다. iOS는 실제 기기에서만 지원한다. 사용자가 앱을 종료하면 작업이 중단되고 앱을 다시 열어야 재개할 수 있다. OS에 의한 종료와 재부팅 이후에는 재개될 수 있지만 Android vendor의 recent-app 종료 정책은 다를 수 있다.

## 전역 task와 수명

`TaskManager.defineTask(name, async executor)`를 module scope에 둔다. executor는 `BackgroundTaskResult.Success=1` 또는 `Failed=2`를 반환한다. `registerTaskAsync(name, { minimumInterval })`의 interval은 **분 단위**이고 기본값은 12 시간이다. 등록은 persistent 하며 `unregisterTaskAsync(name)`가 해제한다. 여러 JS task가 플랫폼당 하나의 worker를 공유하고 마지막 등록 task의 interval이 worker 주기를 정한다.

```ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
const TASK = 'sync-queue';
TaskManager.defineTask(TASK, async () => {
  try {
    await syncPendingChanges();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});
await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 });
```

원문의 첫 executor 예제는 async 없이 await를 사용한다. 위 예제는 실제 async 함수로 작성했다. 장시간 실행은 만료될 수 있으므로 작업을 idempotent 하게 나누고 중간 상태를 저장한다. iOS expiration listener에서 정리와 상태 저장을 수행하고 subscription을 해제한다. scheduler는 이후 실행을 자동으로 다시 예약한다.

## native 설정과 상태

CNG가 설정을 생성한다. 직접 관리하는 iOS 프로젝트는 `UIBackgroundModes`에 `processing`, `BGTaskSchedulerPermittedIdentifiers`에 `com.expo.modules.backgroundtask.processing`을 넣어야 한다. native 설정 변경 후 새 binary가 필요하다. `getStatusAsync()`의 `Restricted=1`, `Available=2`는 background task 허용 상태다. Web은 restricted이며 native available 응답도 설정 누락이나 platform-specific 실패까지 없음을 보장하지 않는다.

`triggerTaskWorkerForTestingAsync(): Promise<boolean>`는 개발 모드용이다. Android에서는 모든 등록 task를 바로 실행하고 iOS에서는 scheduler에 요청한다. production에서는 사용할 수 없다. Android는 `adb shell dumpsys jobscheduler`로 package의 job ID를 찾고 `adb shell cmd jobscheduler run -f <package> <job-id>`로 검사한다. 이는 원문의 설명에 등장하는 broadcast 명령과 다르다. iOS의 task identifier가 예약되지 않았다는 오류는 native 설정과 실제 등록 순서를 먼저 확인한다.

## 출처

- [Expo Documentation, BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
