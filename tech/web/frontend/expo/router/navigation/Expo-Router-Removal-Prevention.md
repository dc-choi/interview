---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 화면 이탈 방지"]
---

# Expo Router 화면 이탈 방지

`usePreventRemove`는 SDK 58 이후 기능이다. SDK 57 baseline 앱에서 바로 import 가능한 API로 취급하지 않는다. 저장되지 않은 입력 때문에 route가 제거되는 것을 확인하고 허용할 때 blocked action을 재실행한다.

```tsx
const disablePrevention = usePreventRemove(hasUnsavedChanges, ({ repeat }) => {
  Alert.alert('변경을 버릴까요?', '저장되지 않은 변경이 있습니다.', [
    { text: '계속 편집', style: 'cancel' },
    { text: '버리기', style: 'destructive', onPress: () => {
      setHasUnsavedChanges(false);
      repeat();
    } },
  ]);
});
```

`repeat()` 전에 prevention 조건을 false로 맞춘다. 원래 action을 취소하고 다른 주소로 가려면 반환된 disable 함수를 호출한 후 `router.replace` 등을 실행한다. 단순 state 변경만 기다리지 않아도 차단을 해제할 수 있다.

웹에서는 refresh, tab 종료와 외부 navigation의 browser confirmation도 요청한다. 실제 dialog 표시와 문구는 브라우저가 결정한다. 앱 내부 callback에서 window.confirm 또는 native Alert를 선택할 수 있지만 두 방식의 확인 UI가 완전히 같다고 기대하지 않는다.

## 출처

- [Expo Documentation, Prevent screen removal](https://docs.expo.dev/router/advanced/prevent-screen-removal)

## 관련 문서

- [[Expo-Router]]
