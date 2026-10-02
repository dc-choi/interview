---
tags: [react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 후속 학습과 도구 탐색"]
---

# React Native 후속 학습과 도구 탐색

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 기초 다음에 연결할 주제

입력과 목록을 만들었다면 개발 환경, 반복 개발 흐름, 화면 디자인과 레이아웃, 디버깅, 플랫폼별 구현과 출시로 이동한다. 국제화와 보안도 앱 기능이 생긴 뒤 필요한 별도 주제다. 문서를 읽은 사실과 해당 기능을 직접 구현하거나 운영한 경험은 구분한다.

| 목적 | 탐색 경로 |
|---|---|
| JavaScript 문법과 런타임 기초 | MDN JavaScript guide/reference |
| 컴포넌트, state, 효과와 Hooks | React 공식 문서와 Vault React 문서 |
| 권한, 뷰 수명과 플랫폼 기능 | Android/iOS 공식 문서 |
| 환경과 앱 생성 | React Native 환경 설정, Expo |
| 실제 구현 사례 | Showcase와 공개 example apps |

VS Code와 React Native Tools는 편집, 탐색과 개발 도구의 한 선택지다. 특정 editor가 React Native 앱 개발의 필수 조건은 아니며 네이티브 빌드 도구와 editor를 구분한다.

## Expo와 Ignite의 역할

**Expo**는 React Native 개발, 빌드, 전달과 반복을 돕는 프레임워크다. 프리뷰 배포와 자동화 경로를 제공하고, 일부 워크플로우에서는 Android Studio나 Xcode를 직접 다루지 않고 개발할 수 있다. 필요하면 네이티브 도구를 직접 사용할 수도 있다. Expo Go, Development Build와 선택적 EAS 서비스의 구체적인 경계는 기존 Expo 문서로 연결한다.

**Ignite**는 여러 기본 라이브러리와 구조를 정해 놓은 starter kit CLI다. 문서에 제시된 Maverick은 MobX-State-Tree, React Navigation 등으로 구성하고 화면과 모델 generator, 테마와 테스트 지원을 제공한다. 해당 스택이 현재 프로젝트에 맞는지와 지원 버전은 도입 시 별도로 확인한다. 도구의 예제 조합을 React Native 자체의 필수 스택으로 받아들이지 않는다.

## 예제 앱을 사용하는 방법

Showcase는 React Native로 구현할 수 있는 제품 사례를 찾는 경로다. 공개 example app은 소스를 읽고 simulator나 실제 기기에서 실행해 구조를 확인하는 학습 자료다. 예제의 의존성, 최소 OS와 아키텍처를 확인하지 않고 최신 앱의 출발점으로 복사하지 않는다.

## 커뮤니티 컴포넌트와 모듈

Core Components에 없는 기능은 React Native Directory에서 찾는다. 자신에게 필요한 Native Component나 TurboModule을 구현하고 npm/GitHub로 공유하는 방식도 생태계 확장의 한 경로다.

0.87 More Resources에는 Native Modules와 Native Components의 legacy 링크 경고가 남아 있다. 새 구현은 New Architecture의 Turbo Native Modules, Fabric Native Components와 Codegen 흐름을 기준으로 읽는다. 자료가 legacy인지 현행인지 확인하는 것이 기능 이름보다 먼저다.

라이브러리를 고를 때는 대상 플랫폼, React Native 버전, 실제 네이티브 구현 여부와 유지보수 상태를 확인한다. React Native용으로 소개된 패키지라도 모든 out-of-tree 플랫폼에서 같은 기능을 제공한다고 가정하지 않는다.

## 출처

- [React Native, More Resources](https://reactnative.dev/docs/more-resources)

## 관련 문서

- [[React]]
- [[Expo]]
- [[RN-Libraries]]
- [[RN-Project-Setup]]
- [[RN-Out-of-Tree-Platforms]]
