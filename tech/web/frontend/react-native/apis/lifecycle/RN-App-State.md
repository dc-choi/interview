---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native foreground, background와 focus

React Native 0.87 기준이다.

AppState는 앱이 foreground인지 background인지 알리고 변경을 구독하게 한다. active는 전면, background는 다른 앱/home이나 Android의 다른 Activity, iOS inactive는 전환/일시 비활성 상태다.

## 앱 state와 사용자 focus

Android notification drawer를 열면 AppState는 active로 남아도 blur가 발생할 수 있다. focus/blur는 사용자의 현재 상호작용을, change는 앱 수명 상태를 나타낸다. iOS memoryWarning은 OS의 메모리 압력을 알린다.

```tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', next => {
    setAppState(next);
  });
  return () => subscription.remove();
}, []);
```

설명용 조각이며 실제 기기 background 동작은 검증하지 않았다. currentState는 현재 state를 읽는 값이고 React 표시 state는 구독으로 갱신한다. 웹 내 preview에서 foreground만 보이는 것을 background callback의 실패 증거로 삼지 않는다.

background 진입과 프로세스 종료는 다른 사건이다. timer 정지/재개, network refresh나 push 표시 정책은 앱 요구에 맞게 정하고 AppState만으로 OS background 실행 권한을 보장하지 않는다. legacy 초기 null 설명은 이전 아키텍처 조건이며 0.87의 일반 startup 조건으로 확대하지 않는다.

## 사용자 자원을 저장할 시점

재화, 누적 보상, 진행 상태처럼 사용자가 잃으면 안 되는 값은 종료 콜백을 기다리지 않고 저장한다. 2026-11-17 대조한 각 플랫폼 문서 기준이다.

- Android는 메모리가 필요하면 background 앱의 프로세스를 죽일 수 있고, 이때 `onDestroy` 호출은 보장되지 않는다. activity가 stopped인 background 프로세스는 foreground나 visible 프로세스보다 종료될 가능성이 높다.
- Android는 영구 데이터를 foreground에서 적절한 시점에 저장하고, 그런 시점이 없으면 `onStop`에서 저장하라고 안내한다. `onPause`는 매우 짧아 사용자 데이터 저장, 네트워크 호출이나 DB transaction에 쓰지 말라고 한다. instance state는 적은 양의 일시 UI 상태용이며 영구 저장소가 아니다.
- iOS UIKit은 foreground-active 상태를 떠날 때 데이터를 저장하고, background에 들어갈 때 중요한 작업을 마치라고 안내한다. UIKit은 background나 suspended scene을 언제든 분리해 자원을 회수할 수 있다.

React Native에서 AppState의 `background` 전환은 앱이 foreground를 떠났다는 신호다. 위 문서들만으로 이 이벤트가 Android의 `onStop` 시점과 같다고 볼 수 없고, 전환 직후 JS 저장 작업이 끝날 시간이 보장된다고 말하지도 않는다. 그래서 서버나 로컬 저장소에 값이 바뀔 때 바로 기록하고 background 전환은 보조 저장 시점으로 두는 편이 안전하다(설계 제안).

보상형 광고가 Android에서 별도 Activity로 뜨면 AppState가 background로 바뀔 수 있다(RN AppState 문서의 다른 Activity 조건). iOS나 앱 안의 화면 이동은 AppState 전환 없이도 일어날 수 있으므로, 광고에서 돌아온 뒤 화면이 메모리의 이전 상태가 아니라 저장된 최신 상태로 복원되는지는 화면 상태 복원 문제로 따로 시험한다(설계 제안).

실제 기기에서 프로세스 종료와 광고 SDK 흐름은 시험하지 않았다.

## 출처

- [React Native, appstate](https://reactnative.dev/docs/appstate)
- [Android Developers, The activity lifecycle](https://developer.android.com/guide/components/activities/activity-lifecycle)
- [Android Developers, Activity state changes](https://developer.android.com/guide/components/activities/state-changes)
- [Apple Developer, Managing your app's life cycle](https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle)

## 관련 문서

- [[RN-App-Registry]]
- [[React-Native-Timers]]
- [[RN-Networking]]
