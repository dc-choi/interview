---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native TV 지원의 위치"]
---

# React Native TV 지원의 위치

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## TV는 별도 구현을 확인한다

기존 React Native TV 지원은 Android TV와 Apple TV에서 기존 앱의 JavaScript 코드를 가능한 한 재사용하려는 목적이었다. 0.87 Guides의 Building For TV Devices는 **deprecated 이동 안내**이며 TV 구현과 프로젝트 안내는 별도 React Native for TV 저장소로 이동했다.

이 페이지를 현재 Core React Native의 TV 설정 절차로 해석하지 않는다. TV 앱을 시작하거나 기존 앱을 확장할 때는 해당 TV 구현의 README에서 사용 버전, 앱 생성 방식과 네이티브 설정을 확인한다.

## 모바일 코드 재사용의 경계

모바일 앱의 React 컴포넌트와 공통 로직을 재사용할 수 있다는 목표와, 특정 모바일 앱을 TV에서 변경 없이 사용할 수 있다는 보장은 다르다. TV 지원 구현, 라이브러리 지원과 입력 UI 요구를 별도로 확인한다.

- Apple TV와 Android TV 중 실제 목표 플랫폼을 정한다.
- React Native for TV의 버전과 원래 React Native 버전 관계를 확인한다.
- 사용하는 네이티브 라이브러리가 해당 TV 플랫폼을 지원하는지 확인한다.
- TV 프로젝트 생성과 빌드는 TV 저장소의 현행 가이드를 따른다.

리모컨 포커스, 화면 거리와 플랫폼별 배포는 실제 제품 설계에서 따로 검증할 요소다. 이 이동 안내 페이지는 해당 기능의 API나 동작 계약을 제공하지 않는다.

## 출처

- [React Native, Building For Tv](https://reactnative.dev/docs/building-for-tv)

## 관련 문서

- [[RN-Out-of-Tree-Platforms]]
- [[RN-Platform-Code]]
- [[RN-Libraries]]
