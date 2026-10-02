---
tags: [react-native, mobile, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Linking과 deep link 수신

React Native 0.87 `Linking`은 다른 앱으로 URL을 열고 우리 앱으로 들어온 URL을 전달받는 API다. URL 수신, navigation 경로 변환, 사용자의 접근 권한은 각각 처리한다. https 링크를 Android deep link 또는 iOS Universal Link로 앱에 연결하면 웹에서도 사용할 수 있다.

## 외부 URL과 설정 열기

| 메서드 | 결과와 조건 |
|---|---|
| canOpenURL(url) | 설치 앱이 처리 가능한지 Promise<boolean>, 조회 실패는 reject 가능 |
| openURL(url) | 사용자가 열기를 승인하거나 자동 열기 시 resolve, 취소/처리 앱 없음은 reject |
| openSettings() | 앱의 설정 화면 열기, Promise<void> |
| sendIntent(action, extras?) | Android intent 실행, Promise<void> |

일반 scheme은 mailto, tel, sms, http, https다. 웹 URL은 protocol을 포함한다. custom scheme은 canOpenURL로 확인해도 실제 openURL 실패를 처리한다. simulator에는 전화 앱처럼 scheme을 처리할 앱이 없을 수 있다. openURL 성공은 상대 앱에서 업무가 완료됐다는 결과가 아니다.

Android 11(target SDK 30) 이상의 canOpenURL 조회에는 manifest의 관련 `<queries><intent>`가 필요하다. 앱이 해당 URL을 **수신하는 intent filter**와 상대 앱 조회 설정을 구분한다. iOS에는 `LSApplicationQueriesSchemes`를 등록한다. Reference의 50회 제한은 이전 iOS SDK로 링크한 앱이 iOS 9 이상에서 실행되는 역사적 조건이며 모든 현재 앱의 공통 한도로 쓰지 않는다.

sendIntent의 extras는 `{key, value}` 배열이며 value는 문자열, 숫자 또는 boolean이다. action과 extra key는 실제 OS intent 계약에 맞춘다. 다른 앱 package를 하드코딩한 공식 예를 우리 앱 설정의 package로 그대로 사용하지 않는다.

## 시작 URL과 실행 중 URL

이미 열린 앱은 `addEventListener('url', ({url}) => ...)` 이벤트를 받고 종료 정리에서 subscription.remove()를 호출한다. 시작 링크는 `getInitialURL(): Promise<string | null>`로 읽는다. 초기 URL이 없으면 null이며 실행 중 이벤트만 구독하면 cold start를 놓친다.

원문의 initialURL 예제에 있는 1초 setTimeout은 테스트 표시용이다. 실제 앱의 링크 수신에 지연이 필요하다는 조건이 아니다. 두 수신 경로를 navigation 준비 이후 같은 검증/변환 함수에 연결하고 중복 실행도 다룬다. URL의 scheme, host, path와 parameter를 확인하며 URL의 존재만으로 로그인 또는 권한을 인정하지 않는다.

Reference의 Remote JS Debugging에서 initialURL이 null일 수 있다는 설명은 구버전 debugger 조건이다. 현재 DevTools 전체의 동일한 제한으로 확대하지 않는다.

## native 등록과 환경

Android는 앱의 intent filter와 launchMode를 구성한다. 기존 MainActivity 인스턴스로 intent를 받는 경로로 `singleTask`를 문서가 제안하며 실제 navigation/back stack 요구와 함께 결정한다.

iOS는 openURL과 continueUserActivity를 `RCTLinkingManager`에 전달한다. Objective-C/Swift AppDelegate의 전달 메서드와 Universal Link 설정은 실제 template에 맞춘다. 오래된 header search path/LinkingIOS 폴더 설명을 현재 template에 일괄 추가하지 않는다.

native 파일이 노출되지 않은 Expo 프로젝트는 Expo의 linking 설정을 따른다. navigation framework의 linking 기능을 사용하는 경우 수신 listener를 이중 등록하지 않고 해당 framework의 초기 URL과 구독 계약을 확인한다. 앱 실행이나 실제 링크 전달을 수행한 기록은 아니다.

## 출처

- [React Native 0.87, linking](https://reactnative.dev/docs/linking)

## 관련 문서

- [[RN-Navigation]]
- [[RN-Android-Permissions]]
- [[RN-Sharing-and-Action-Sheets]]
- [[Expo]]
