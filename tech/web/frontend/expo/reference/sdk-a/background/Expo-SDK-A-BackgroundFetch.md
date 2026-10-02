---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["BackgroundFetch legacy background fetch"]
---

# BackgroundFetch legacy background fetch

## 지원과 전환

`expo-background-fetch`는 deprecated이며 새 기능과 수정이 중단되고 제거될 예정이다. 새 작업은 [[Expo-SDK-A-BackgroundTask]]를 사용한다. Android와 iOS에서 `expo-task-manager`의 전역 task와 OS background fetch를 연결한다. iOS Expo Go에서는 지원하지 않으므로 development build가 필요하다. iOS에서 앱이 종료되거나 재부팅된 뒤 실행되는 기능으로 사용하지 않는다.

## 등록과 실행 계약

`TaskManager.defineTask(name, executor)`를 React component 밖의 module scope에 정의한다. JS bundle이 background에서 로드될 때도 정의가 실행되어야 한다. `registerTaskAsync(name, options)` 등록은 persistent 하다. `unregisterTaskAsync(name)`로 해제한다. `minimumInterval`은 초 단위이며 실행 시각을 보장하지 않는 OS advisory 다. Android 기본은 10 분, iOS 기본은 10~15 분이다. Android의 `stopOnTerminate` 기본값은 true, `startOnBoot` 기본값은 false 다.

```ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
const TASK = 'legacy-fetch';
TaskManager.defineTask(TASK, async () => {
  try {
    const changed = await syncPendingChanges();
    return changed ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch { return BackgroundFetch.BackgroundFetchResult.Failed; }
});
await BackgroundFetch.registerTaskAsync(TASK, { minimumInterval: 15 * 60 });
```

Executor가 돌려주는 `NoData=1`, `NewData=2`, `Failed=3`은 OS의 다음 실행 판단에 쓰인다. iOS task는 약 30 초 안에 끝나야 한다. 짧은 interval이 나 성공 응답을 설정해도 일정 주기로 반드시 실행되는 것은 아니다.

## 설정과 상태

iOS native `Info.plist`의 `UIBackgroundModes`에 `fetch`가 필요하다. 원문의 후반에 나오는 Expo.plist 표기는 같은 설정의 실제 위치로 사용하지 않는다. Android는 `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` permission을 추가한다. `getStatusAsync()`는 `Denied=1`, `Restricted=2`, `Available=3` 또는 null을 반환한다. `setMinimumIntervalAsync(seconds)`는 iOS의 전역 advisory이며 Android에 는 효과가 없다. 다른 앱이나 라이브러리에서 마지막 설정한 값이 영향을 줄 수 있다.

iOS는 Instruments의 background fetch trigger로 개발 build를 검사할 수 있다. 원문의 Expo Go 테스트 문구는 iOS 지원 제한과 충돌하므로 지원 확인 없이 적용하지 않는다. 실제 background scheduling과 기기 vendor 정책은 foreground 테스트만으로 검증되지 않는다.

## 출처

- [Expo Documentation, BackgroundFetch](https://docs.expo.dev/versions/latest/sdk/background-fetch)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
