---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native의 out-of-tree 플랫폼"]
---

# React Native의 out-of-tree 플랫폼

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Core와 별도 플랫폼 구현

React Native의 Android/iOS 외 플랫폼은 파트너나 커뮤니티가 별도 프로젝트로 유지한다. out-of-tree라는 표현은 Core 저장소와 별개인 플랫폼 구현을 가리킨다. 같은 React 문법을 사용한다고 플랫폼 지원, renderer와 네이티브 API가 같아지는 것은 아니다.

| 유지 주체 구분 | 프로젝트 | 대상 또는 구현 |
|---|---|---|
| 파트너 | React Native macOS | macOS와 Cocoa |
| 파트너 | React Native Windows | Windows/UWP |
| 파트너 | React Native visionOS | visionOS |
| 파트너 | React Native OpenHarmony | OpenHarmony |
| 커뮤니티 | React Native tvOS | Apple TV와 Android TV |
| 커뮤니티 | React Native Web | React DOM을 사용하는 웹 구현 |
| 커뮤니티 | React Native Skia | Skia renderer, 페이지 기준 Linux와 macOS |

이 목록은 0.87 페이지의 프로젝트 분류다. 실제 도입 시 각 구현의 현재 release, React Native 버전 대응과 지원 기능을 확인한다. Core React Native가 이 플랫폼의 모든 API를 직접 보장한다고 읽지 않는다.

## 자신만의 플랫폼과 Fabric

플랫폼을 처음부터 만드는 과정은 충분히 문서화되지 않았다. New Architecture와 Fabric은 별도 플랫폼 유지의 부담을 줄이는 것을 목표로 한다. 목표와 구현 완료 수준을 구분하고 새로운 플랫폼을 간단한 파일 확장자 설정만으로 구현할 수 있다고 가정하지 않는다.

## Metro의 플랫폼 suffix

별도 플랫폼을 등록하면 bundle 명령의 `--platform example`에 따라 `.example.js` 파일을 탐색하는 형태를 사용할 수 있다. 페이지는 0.57부터의 RNPM 등록 규약을 설명한다.

- `react-native-example`: `react-native-`로 시작하는 top-level package.
- `@org/react-native-example`: scope 아래의 `react-native-` package.
- `@react-native-example/module`: scope 이름이 `@react-native-`로 시작하는 package.

```json
{
  "rnpm": {
    "haste": {
      "providesModuleNodeModules": ["react-native-example"],
      "platforms": ["example"]
    }
  }
}
```

`providesModuleNodeModules`는 Haste 검색 경로에 추가할 package, `platforms`는 유효한 플랫폼 suffix 목록을 나타낸다. 이는 원문에 남아 있는 역사적 RNPM 계약이다. 0.87에서 새로운 플랫폼을 등록할 때 이 설정만으로 충분하거나 현행 CLI가 이를 그대로 적용한다고 검증한 것은 아니다. 실제 플랫폼 package, CLI와 Metro의 현재 등록 방식을 함께 확인한다.

## 앱 설계에서 확인할 조건

공통 JavaScript, UI renderer, 네이티브 기능과 번들러 플랫폼 선택을 각각 구분한다. 라이브러리 검색 시 플랫폼 필터와 README를 확인하고, 코드가 달라지면 Platform 분기나 플랫폼 파일 suffix를 사용한다. 웹만 지원하는 React DOM 패키지를 네이티브에서도 동작한다고 가정하지 않는다.

## 출처

- [React Native, Out Of Tree Platforms](https://reactnative.dev/docs/out-of-tree-platforms)

## 관련 문서

- [[RN-TV-Platforms]]
- [[RN-Platform-Code]]
- [[RN-Metro]]
- [[RN-Libraries]]
