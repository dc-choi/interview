---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router modal과 form sheet"]
---

# Expo Router modal과 form sheet

route 기반 modal은 URL과 history가 필요한 multi-step flow에 적합하다. 일시 확인이나 독립 interaction에는 React Native Modal을 사용할 수 있다. Stack.Screen의 `presentation`으로 route 표현을 바꾸며 화면 파일은 일반 route와 같다.

```tsx
export const unstable_settings = { anchor: 'index' };
<Stack.Screen name="modal" options={{ presentation: 'modal' }} />;
```

deep-linked modal에는 anchor가 필요하다. anchor가 없으면 배경 screen과 back 맥락을 잃을 수 있으며 중첩 Stack에는 해당 Stack의 anchor를 정의한다. Android는 back, iOS는 아래로 swipe하는 native 표현이 기본이며 웹 modal/formSheet는 일반 Stack route로 렌더링된다. 웹에는 dismiss 버튼과 history가 없을 때 이동할 fallback을 제공한다.

## presentation 선택

| 값 | 용도와 플랫폼 차이 |
| --- | --- |
| `card` | 일반 Stack push |
| `modal` | native modal, 내부 Stack 가능 |
| `transparentModal` | 이전 route를 보이는 overlay |
| `containedModal` | iOS current-context, Android modal fallback |
| `containedTransparentModal` | iOS over-current-context, Android transparent fallback |
| `fullScreenModal` | iOS full-screen, Android modal fallback |
| `formSheet` | detent 기반 bottom sheet |

modal의 StatusBar는 화면 배경에 맞춰 설정한다. iOS의 light 콘텐츠를 원하면 `expo-status-bar`의 `style="light"` 등을 지정한다.

## formSheet options

`sheetAllowedDetents`는 오름차순 0~1 fraction 배열 또는 `'fitToContents'`다. Android는 최대 세 detent, iOS는 그 이상을 받는다. fitToContents는 명시적인 content size가 필요하며 `flex: 1`에 의존할 수 없다. SDK 55 이후 iOS numeric detent에서는 flex:1 사용이 가능하다.

| option | 의미 |
| --- | --- |
| `sheetInitialDetentIndex` | 시작 index, 기본 0, `'last'` 가능 |
| `sheetGrabberVisible` | iOS grabber 표시 |
| `sheetCornerRadius` | 모서리 반경 |
| `sheetLargestUndimmedDetentIndex` | 배경을 dim하지 않을 최대 index, `'none'`/`'last'` 가능 |
| `unstable_sheetFooter` | Android 전용 실험적 고정 footer component |

Android formSheet 내부의 native Stack header와 nested Stack은 지원하지 않는다. title과 action은 content 안에 직접 렌더링한다.

## 웹 overlay

`EXPO_UNSTABLE_WEB_MODAL`, `webModalStyle`과 `--expo-router-modal-*` CSS 변수가 제거되었다. 웹에서는 `transparentModal`, `headerShown: false`, `animation: 'none'`을 사용하고 backdrop, Escape, dialog semantics와 dismiss를 route component가 구현한다.

```tsx
const dismiss = () => router.canGoBack() ? router.back() : router.replace('/');
```

플랫폼별 WebModal은 웹에서 overlay를, native에서 children을 그대로 반환할 수 있다. 여러 modal을 겹치는 custom Stack은 마지막 non-modal route까지 base를 그리고 modal들을 layer로 올린다. guide의 `NativeStackView` 기반 custom navigator 예제는 SDK 58 이후에만 해당한다.

## 출처

- [Expo Documentation, Modals](https://docs.expo.dev/router/advanced/modals)
- [Expo Documentation, Build custom web modals](https://docs.expo.dev/router/advanced/web-modals)

## 관련 문서

- [[Expo-Router]]
