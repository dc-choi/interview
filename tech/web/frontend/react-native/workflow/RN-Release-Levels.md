---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native release level과 feature flags"]
---

# React Native release level과 feature flags

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## package 버전과 feature level 구분

release level은 같은 React Native 코드에서 초기화할 feature flags 집합을 선택하는 기능이다. 아직 stable 기본값에 들어가지 않은 기능을 제한적으로 평가하는 경로다. `STABLE`, `CANARY`, `EXPERIMENTAL` 중 하나를 선택한다.

React의 Canary/Experimental 배포와 이름은 비슷하지만 **사용하는 React JS/React Native package 버전은 그대로**다. React Native는 이 기능을 npm `@canary`/`@experimental` tag 선택으로 제공하지 않는다. stable과 nightly release 모두 release level을 사용할 수 있고 CANARY를 설정했다고 React의 nightly/canary package를 가져오지는 않는다.

## level 선택

| level | 용도 | production 판단 |
|---|---|---|
| STABLE | 안정적인 기본 기능 | 일반 앱과 library 기본값, nightly에서도 기본 |
| CANARY | framework 저자와 숙련 개발자의 조기 기능 평가 | 사용자 대상 production에는 권장하지 않음 |
| EXPERIMENTAL | 초기 개발 기능 테스트와 피드백 | 사용자 대상 production에는 권장하지 않음 |

앱 package가 nightly인지와 초기 feature level이 무엇인지 기록을 분리한다. 새로운 flag가 필요하지 않은 일반 앱은 STABLE을 유지한다.

## Android 초기화

```kotlin
DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.CANARY
DefaultNewArchitectureEntryPoint.load()
```

`DefaultNewArchitectureEntryPoint.releaseLevel`의 기본값은 STABLE이다. 초기화 전에 선택하면 해당 level의 feature flag override가 적용된다. build system은 level별 override class를 생성한다.

## iOS factory 초기화

```swift
let factory = RCTReactNativeFactory(
  delegate: delegate,
  releaseLevel: RCTReleaseLevel.Canary
)
```

Objective-C에서는 `initWithDelegate:releaseLevel:` initializer를 사용한다. feature flags 초기화가 factory의 release level을 기준으로 이뤄진다.

**한 앱 instance에서 하나의 release level만 활성화해야 한다.** 서로 다른 level의 factory를 여러 개 생성하면 crash한다. 기존 iOS 앱에 여러 React Native 화면을 통합할 때 각 화면이 다른 level을 따로 고르지 않도록 초기화 정책을 공통으로 둔다.

## 실험과 검증 경계

새 기능을 평가할 때 사용 RN 버전, 선택 level과 테스트 대상 기능을 함께 기록한다. CANARY/EXPERIMENTAL에서 성공한 결과를 STABLE의 기능 지원 증거로 확대하지 않는다. production 적용은 해당 기능의 안정화와 앱의 실제 호환성 검증을 다시 확인한다.

## 출처

- [React Native, Release Levels](https://reactnative.dev/docs/release-levels)

## 관련 문서

- [[RN-iOS-Integration]]
- [[RN-Android-Integration]]
- [[RN-Upgrading]]
