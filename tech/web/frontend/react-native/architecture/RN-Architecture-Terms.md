---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 내부 구조의 용어

| 용어 | 의미와 경계 |
|---|---|
| Host platform | React Native를 담는 Android, iOS 등의 플랫폼 |
| Host view | 해당 플랫폼의 실제 UI view |
| React component | React element를 만들어 낼 함수나 class |
| Composite component | 다른 composite/host component로 펼쳐지는 사용자 component |
| Host component | View/Text처럼 실제 platform view 구현을 갖는 component |
| React element | props, children과 화면 표현을 기술하는 JS 객체 |
| Shadow node | host component의 props와 layout 정보를 가진 C++ 객체 |
| JSI | C++ 애플리케이션과 JS engine을 연결하는 인터페이스 |
| JNI | C++와 Android Java 코드가 연결되는 인터페이스 |
| Yoga node | layout 계산에 참여하는 node |
| Fabric | React와 C++ renderer/platform view를 연결하는 렌더링 시스템 |
| Dev Menu | 개발 build에서 debugging 작업을 여는 앱 내 메뉴 |
| React Native framework | navigation, build와 배포 등 앱 제작 도구를 일관된 흐름으로 묶은 상위 구성. Expo가 한 예다 |

## tree를 같은 것으로 보지 않기

React element tree는 앱의 선언, shadow tree는 renderer의 props/layout 표현, host view tree는 native 화면의 계층이다. composite component 펼치기와 view flattening 때문에 각 tree의 node 수와 깊이가 다를 수 있다.

shadow node마다 Yoga node를 반드시 갖는 것은 아니다. host component 구현이 layout 계산 방식을 결정할 수 있다. JSI와 JNI도 대상 경계가 다르므로 둘 다 bridge라는 말로 뭉뚱그리지 않는다.

## 출처

- [React Native, Glossary](https://reactnative.dev/architecture/glossary)

## 관련 문서

- [[RN-Render-Pipeline]]
- [[RN-Fabric-Renderer]]
- [[Expo]]
