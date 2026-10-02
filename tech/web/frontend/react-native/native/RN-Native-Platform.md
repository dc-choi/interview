---
tags: [react-native, native, architecture]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 네이티브 플랫폼 확장"]
---

# React Native 네이티브 플랫폼 확장

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 네이티브 확장이 필요한 조건

React Native 코어와 현재 사용하는 라이브러리에서 필요한 플랫폼 기능을 제공하지 않거나 기존 Objective-C, Swift, Java, Kotlin, C++ 코드를 재사용할 때 네이티브 확장을 사용한다. 기존 기능을 찾은 다음 새 코드를 만들지 결정한다.

| 확장 종류 | 책임 | JavaScript에서 사용하는 형태 |
| --- | --- | --- |
| Native Module | UI 없는 저장소, 알림, 네트워크 이벤트, 플랫폼 서비스 | 함수와 객체 |
| Native Component | 플랫폼 View, 위젯과 컨트롤러 | React 컴포넌트 |
| C++ TurboModule | Android/iOS에 공유할 플랫폼 독립 로직 | typed Spec과 모듈 함수 |

화면에 직접 배치할 위젯을 일반 모듈 함수로만 노출하면 View 생명주기, props와 이벤트를 따로 연결해야 한다. UI는 Fabric Native Component, UI 없는 API는 Turbo Native Module을 기본 경로로 구분한다.

## 확장 개발 흐름

1. JavaScript와 네이티브가 주고받을 API를 Flow 또는 TypeScript Spec으로 선언한다.
2. 앱 또는 라이브러리의 `package.json`에서 Codegen 탐색 경로와 생성 유형을 설정한다.
3. Codegen으로 C++, Java 또는 Objective-C++ 인터페이스를 만든다.
4. 생성된 계약에 맞게 플랫폼 구현을 작성한다.
5. 플랫폼의 모듈 제공자 또는 ViewManager에 구현을 등록한다.
6. JavaScript에서 Spec을 통해 가져오거나 React 컴포넌트로 렌더링한다.

네이티브 코드와 등록 정보를 바꾸면 JavaScript Fast Refresh만으로 반영되지 않는다. 해당 플랫폼의 의존성 설치와 네이티브 재빌드가 필요하다.

## 현재 API와 레거시 경계

0.87의 Native Platform 가이드는 Legacy Native Module과 Legacy Native Component API를 deprecated로 분류한다. 일부 기존 라이브러리는 New Architecture의 interop layer로 계속 사용할 수 있지만, 모든 라이브러리의 기능과 성능이 보장된다는 뜻은 아니다.

기존 라이브러리는 대안 확인, New Architecture를 직접 지원하는 버전으로 업그레이드, TurboModule/Fabric으로 이식하는 순서로 검토한다. 레거시 문서의 New Architecture가 안정화되면 나중에 deprecated가 된다는 문구는 과거 문맥이며 현재 권장 상태로 읽지 않는다.

## 용어

- **Spec**: 모듈 함수나 컴포넌트 props, 이벤트를 기술하는 Flow/TypeScript 선언이다.
- **Codegen**: Spec을 읽어 플랫폼 연결 코드와 인터페이스를 생성한다. 업무 로직까지 구현하지 않는다.
- **Turbo Native Module**: typed Spec, 생성 인터페이스와 네이티브 구현을 합친 UI 없는 확장이다.
- **Fabric Native Component**: 플랫폼 View를 React의 props, 이벤트와 렌더러 계약에 연결하는 확장이다.
- **Legacy Module/Component**: 이전 아키텍처의 네이티브 확장 API로 작성한 구현이다.

## 출처

- [React Native, Native Platform](https://reactnative.dev/docs/native-platform)
- [React Native, Appendix](https://reactnative.dev/docs/appendix)

## 관련 문서

- [[RN-Codegen-Index]]
- [[RN-Native-Modules]]
- [[RN-Native-Components]]
- [[RN-Legacy]]
- [[React]]
