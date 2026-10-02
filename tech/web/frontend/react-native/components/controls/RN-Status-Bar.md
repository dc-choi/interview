---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native StatusBar의 화면별 설정

React Native 0.87 기준이다.

StatusBar는 시각 표시와 숨김 상태를 제어한다. 여러 component가 동시에 mount되면 mount 순서에 따라 props가 합쳐지므로 navigation 화면의 수명과 연결한다.

## 선언형과 명령형

barStyle은 default/auto/light-content/dark-content다. auto는 현재 color scheme 변화를 따라가며 Android dark-content는 API 23 이상 조건을 갖는다. hidden은 표시 여부, animated는 style/hidden 변화의 애니메이션이며 iOS showHideTransition은 fade/slide/none이다.

같은 prop을 component와 setBarStyle/setHidden 호출로 동시에 관리하면 다음 render에서 component가 명령형 값을 덮을 수 있다. 하나의 소유자를 정한다.

pushStackEntry는 설정 entry를 반환하며 종료 시 같은 entry로 popStackEntry를 호출한다. replaceStackEntry는 기존 entry를 바꾼다. 임시 표시 정책을 만들면 cleanup에서 해제한다.

## 크기와 UI 경계

Android currentHeight는 notch를 포함할 수 있다. safe area inset, header 높이와 같은 수치로 취급하지 않는다. 상태 표시줄을 숨겨도 콘텐츠의 안전 영역과 navigation bar 처리까지 해결되는 것은 아니다.

0.87 reference에는 barStyle/hidden 중심 계약이 남아 있다. 과거 backgroundColor/translucent 예제를 새 Android edge-to-edge 정책에 그대로 적용하지 않고 현재 사용하는 framework와 OS 조건을 확인한다.

## 출처

- [React Native, statusbar](https://reactnative.dev/docs/statusbar)

## 관련 문서

- [[RN-Modal]]
- [[RN-Deprecated-Components]]
- [[RN-Navigation]]
