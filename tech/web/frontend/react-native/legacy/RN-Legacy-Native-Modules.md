---
tags: [react-native, native, legacy, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 네이티브 모듈의 범위"]
---

# React Native 레거시 네이티브 모듈의 범위

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 레거시 API를 읽는 기준

레거시 NativeModule은 Java/Objective-C/C++ 클래스 instance를 JavaScript 객체로 노출한다. JS에서 제공되지 않는 플랫폼 API, 기존 native library, 이미지 처리와 같은 구현을 연결하는 데 사용된다.

0.87 Native Platform 가이드는 이 API를 deprecated로 분류한다. 이 문서는 기존 코드 이해와 이식 판단을 위한 레퍼런스다. 레거시 페이지의 New Architecture가 안정화되면 나중에 deprecated가 된다는 안내는 현재 권장 상태와 맞지 않는 과거 문맥이다.

새 UI 없는 확장은 [[RN-Turbo-Native-Modules]], 새 native View는 [[RN-Fabric-Native-Components]]를 먼저 사용한다. 일부 기존 library는 interop로 동작할 수 있지만 개별 기능과 버전 지원을 확인해야 한다.

## 구성 방법

| 방법 | 책임 경계 |
| --- | --- |
| 앱 내부 `android/ios`에 직접 작성 | 앱에 종속되는 native 구현과 등록 |
| 앱의 로컬 library | native 코드와 API를 앱 구조에서 분리하고 autolink |
| npm package | 플랫폼 native 구현과 JS API를 배포하여 재사용 |

local library는 앱 native 폴더 밖에 두어 RN 업그레이드와 다른 앱으로 복사할 때 변경 범위를 줄인다. npm package는 JS뿐 아니라 플랫폼 소스와 build/link 설정도 포함한다.

## Calendar 예제의 실제 범위

입문은 JS에서 `createCalendarEvent(name, location)`를 호출하여 native method로 전달하는 예제다. Android Calendar API와 iOS Calendar API에 접근하는 연결 흐름을 설명하지만 제시된 초기 native 코드는 log만 남긴다.

method 호출 log가 나온다고 실제 일정이 생성되거나 권한 처리가 완료된 것은 아니다. 실제 Calendar 연동에는 플랫폼 권한, API 호출과 실패/성공 결과 처리가 추가되어야 한다.

## 유지보수와 이식 확인

native 구현을 수정하면 Metro만 갱신해서 반영되지 않는다. Android/iOS 앱을 다시 빌드한다. JS wrapper의 TypeScript 선언은 JS 호출부를 도울 뿐 legacy bridge의 모든 native 타입 계약을 자동으로 검증하지 않는다.

이식 시에는 exported module 이름, 메서드 인자와 nullable, callback/Promise completion, events, queue와 생명주기를 먼저 나열한 뒤 typed Spec과 생성 인터페이스로 옮긴다.

## 출처

- [React Native, Native Modules Intro](https://reactnative.dev/docs/legacy/native-modules-intro)
- [React Native, Native Platform](https://reactnative.dev/docs/native-platform)

## 관련 문서

- [[RN-Legacy-Libraries]]
- [[RN-Legacy-Android-Modules]]
- [[RN-Legacy-iOS-Modules]]
- [[RN-Turbo-Native-Modules]]
