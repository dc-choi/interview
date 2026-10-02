---
tags: [react-native, mobile, quality]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 테스트 계층과 검증 한계"]
---

# React Native 테스트 계층과 검증 한계

React Native 0.87 문서 기준이다.

React Native 앱은 JavaScript 로직, React UI, 네이티브 구현과 운영체제가 함께 동작한다. 각 테스트가 어느 계층을 실행하는지 알아야 통과 결과를 해석할 수 있다.

## 검증 계층

| 계층 | 확인하는 것 | 남는 한계 |
|---|---|---|
| ESLint, TypeScript | 코드 규칙과 타입 계약 | 실행 결과, 실제 API 응답은 검증하지 않음 |
| 단위 테스트 | 함수와 작은 모듈의 입력/출력 | 대체한 의존성의 실제 동작은 미확인 |
| 통합 테스트 | 실제 모듈 사이 협력, I/O 경계 | mocking과 실행 환경에 따라 범위가 달라짐 |
| component 테스트 | 사용자 입력에 따른 React 출력과 상호작용 | Node.js에서 실제 Android/iOS 구현은 실행하지 않음 |
| E2E | 기기 또는 emulator/simulator에서 앱 흐름 | 실행 비용, 시간과 간헐적 실패 관리 필요 |

기본 React Native template에는 Jest와 React Native용 preset이 있다. 사용하는 프레임워크의 template이 다르면 실제 package 설정을 확인한다. 테스트 용어보다 실제 실행한 의존성과 경계를 기록하는 편이 정확하다.

## 테스트하기 쉬운 책임 구분

업무 규칙을 UI에서 분리하면 native UI 없이 빠르게 확인할 수 있다. 모든 state를 무조건 component 밖으로 옮기는 것은 아니다. 시각적 상태는 화면에 두고 업무 계산과 외부 I/O 경계를 식별한다.

테스트는 Given/When/Then 또는 Arrange/Act/Assert로 입력, 동작, 기대 결과를 드러낸다. `describe`로 관련 사례를 묶되 각 테스트는 독립 실행 가능해야 한다. 한 테스트가 남긴 state와 mock 설정이 다음 테스트의 전제가 되지 않게 한다.

## Mock의 경계

외부 날씨 API처럼 응답이 변하거나 네트워크에 의존하는 부분은 제어 가능한 대역을 사용한다. Node.js에서 실행할 수 없는 native module도 대역이 필요할 수 있다.

가능한 범위에서는 실제 모듈을 함께 사용한다. mock이 예상대로 호출됐다는 결과는 실제 모듈의 API 호환성이나 기기 권한 처리를 증명하지 않는다. 실패 응답, 비어 있는 결과, timeout 등의 계약도 독립적으로 확인한다.

## Component 테스트

사용자가 읽거나 접근성 도구로 찾을 수 있는 text와 role을 우선한다. 내부 state, props와 event handler를 직접 확인하면 이름 변경이나 구현 교체에도 쉽게 깨진다. `testID`는 사용자에게 보이는 기준으로 찾기 어려울 때 보조적으로 쓴다.

예를 들어 입력값을 적고 추가 버튼을 누른 뒤 목록에 새 항목이 나타나는지 확인한다. setter 호출 횟수만 확인하는 테스트는 같은 의미가 아니다. React Native Testing Library의 query와 event API로 이 흐름을 표현할 수 있다.

`react-test-renderer`는 deprecated 상태다. 새 설정을 만들 때는 설치할 Testing Library와 React 버전의 호환 문서를 확인한다. component 테스트는 네이티브 keyboard, layout, 권한 dialog와 화면 reader의 실제 동작을 보증하지 않는다.

## Snapshot

snapshot은 저장한 render 결과와 이후 결과의 차이를 탐지한다. 최초 snapshot이 잘못됐어도 기준으로 저장될 수 있다. 큰 snapshot은 reviewer가 의미 있는 변화를 놓치기 쉽다.

작은 안정적 출력에 제한하고, 기능 기대는 명시적 assertion으로 표현한다. `--updateSnapshot`을 실행하기 전에 변경이 의도인지 확인한다. snapshot 통과는 시각적 정확성이나 전체 render 논리의 정답 판정이 아니다.

## E2E와 실기기

release 구성의 앱에서 입력, 버튼, 화면 이동과 표시 결과를 검증한다. 인증, 핵심 업무, 결제처럼 실패 영향이 큰 경로부터 선택한다. Detox, Appium, Maestro는 후보 도구이며 프로젝트 플랫폼과 실제 테스트 요구에 맞춰 고른다.

빠른 JS 테스트와 소수의 핵심 E2E를 함께 운영한다. flaky test가 나오면 네트워크, animation, app state와 대기 조건을 조사한다. 통과율을 높이려고 실패 조건을 숨기는 재시도만 늘리지 않는다.

## 이해 확인

- component 테스트가 통과한 뒤 Android 권한 오류가 발생할 수 있는 이유는 무엇인가?
- 새 snapshot 승인 전에 어떤 동작을 직접 확인할 것인가?
- 실제 서비스 장애를 mock이 가리고 있다면 어떤 통합 또는 E2E 확인이 필요한가?

## 출처

- [React Native, Testing](https://reactnative.dev/docs/testing-overview)

## 관련 문서

- [[React-Native-Debugging]]
- [[React-Native-Profiling]]
- [[React-Core-Mental-Model]]
