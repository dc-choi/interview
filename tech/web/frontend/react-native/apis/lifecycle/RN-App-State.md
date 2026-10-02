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

## 출처

- [React Native, appstate](https://reactnative.dev/docs/appstate)

## 관련 문서

- [[RN-App-Registry]]
- [[React-Native-Timers]]
- [[RN-Networking]]
