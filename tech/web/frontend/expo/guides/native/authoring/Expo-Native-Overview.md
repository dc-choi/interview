---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Modules API 선택과 설계"]
---

# Expo Modules API 선택과 설계

## API가 해결하는 문제

Expo Modules API는 JSI와 React Native native primitives 위에 Swift/Kotlin DSL을 제공한다. 네이티브 함수, 속성, 이벤트, 뷰와 오래 살아 있는 객체를 JavaScript에 노출하면서 플랫폼별 선언 형식을 비슷하게 유지한다. 별도 모듈을 만들기 전에 기존 Expo SDK 또는 React Native 라이브러리가 필요한 기능을 제공하는지 확인한다.

| 조건 | 선택 기준 |
|---|---|
| 앱 하나에서 필요한 Swift/Kotlin 기능 | local Expo module |
| 여러 앱이나 외부 개발자가 쓰는 기능 | standalone Expo module, workspace 또는 npm 배포 |
| C++ 구현이 중심인 라이브러리 | React Native Turbo Modules 검토 |
| native SDK나 플랫폼 전용 뷰를 감싸기 | Expo Modules API로 플랫폼 구현을 공통 JS 계약에 맞춤 |
| macOS/tvOS | 추가 플랫폼 설정과 플랫폼 API 검토가 필요 |

Expo Modules는 New Architecture와 해당 Expo/RN 조합에서 지원하는 아키텍처에 맞춰 통합된다. SDK 57의 React Native 0.86 동작을 과거 bridge/Fabric interop 설명과 혼동하지 않는다. JSI 사용만으로 모든 함수가 비동기이거나 모든 작업이 빠르다는 뜻은 아니다. 동기 함수는 JS 실행을 막는다.

## 설계 원리와 책임

- Swift/Kotlin의 타입, optional, enum과 Record를 사용해 입력 변환과 검증을 공통 계층으로 모은다. JS 객체를 매번 `Any`로 읽고 수동 casting하는 부담을 줄인다.
- native view의 등록과 이벤트를 renderer 세부사항에서 분리한다. UIKit/Android SDK가 요구하는 UI thread, layout, 자원 해제는 작성자의 책임이다.
- SharedObject는 native 상태를 단일 객체에 보관하고 JS 참조와 연결한다. ID 문자열과 전역 native map을 직접 관리하는 대안이 된다.
- Android lifecycle listeners와 iOS AppDelegate subscribers는 앱 진입점 파일에 설치 코드를 복사하는 일을 줄인다. callback의 플랫폼 차이와 반환값 합성은 남아 있다.
- `expo`는 Expo Modules 기반 인프라를 제공한다. Expo Go에 포함되지 않은 새 native 모듈은 development build나 직접 native build로 실행해야 한다.

API 선택은 native dependency 추가, 앱 크기, 플랫폼 유지보수와 SDK 호환 범위를 함께 고려한다. 원문의 과거 설계 설명에 있는 예정 기능은 현재 API reference와 대조한다. Shared objects는 이미 별도 공식 문서가 있으므로 미문서화 기능으로 취급하지 않는다.

## 출처

- [Expo Documentation, Expo Modules API: Overview](https://docs.expo.dev/modules/overview)
- [Expo Documentation, Expo Modules API: Design considerations](https://docs.expo.dev/modules/design)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
