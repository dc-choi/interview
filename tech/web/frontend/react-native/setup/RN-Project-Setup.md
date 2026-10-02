---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 프로젝트와 프레임워크 선택"]
---

# React Native 프로젝트와 프레임워크 선택

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 새 앱의 기본 선택

React Native는 React를 아는 개발자가 네이티브 앱을 만들거나, 네이티브 개발자가 두 플랫폼의 공통 기능을 재사용하는 데 사용한다. 새 앱에는 Expo 같은 React Native 프레임워크를 사용하는 것이 공식 권장 출발점이다.

프레임워크는 라우팅, 네이티브 API 접근, 의존성 처리와 개발 도구를 미리 구성한 toolbox다. 앱에서 흔히 필요한 기능을 다시 조립하는 초기 비용과 유지보수 비용을 줄인다. 프레임워크 없이 개발하는 것도 가능하지만 해당 구성을 팀이 직접 책임진다.

| 선택 | 책임 |
|---|---|
| Expo 같은 프레임워크 | 제공된 라우팅, 네이티브 모듈과 도구 흐름 위에서 앱 기능 개발 |
| 프레임워크 없이 React Native | navigation, 네이티브 API와 의존성 조합, Android/iOS 빌드 환경 구성 |
| 기존 네이티브 앱에 일부 화면 통합 | 기존 플랫폼 프로젝트와 React Native 런타임, 화면 수명 연결 |

## Expo 프로젝트 시작

```sh
npx create-expo-app@latest
```

Expo는 파일 기반 라우팅, 범용 라이브러리, 네이티브 파일을 직접 관리하지 않고 설정을 변경하는 plugin 등의 기능을 제공한다. Expo Framework는 오픈 소스이며 EAS는 개발, 빌드와 배포를 보완하는 **선택적 서비스**다. 프레임워크 선택과 클라우드 서비스 사용을 같은 결정으로 묶지 않는다.

공식 환경 시작 페이지는 Android, iOS, TV와 Web 지원 경로를 소개한다. 실제 앱의 기능과 지원 플랫폼은 선택한 Expo SDK, 라이브러리와 네이티브 구성을 확인한다. 기존 Expo 문서의 버전 기준일은 이 문서와 다르므로 SDK 조합은 프로젝트 생성 시 다시 대조한다.

## 프레임워크 없이 개발할 조건

프레임워크가 잘 다루지 못하는 특수한 제약이 있거나 팀이 해당 기능을 직접 구성할 이유가 있으면 Android Studio와 Xcode로 네이티브 환경을 설치한다. 해당 선택이 React Native 자체를 더 단순하게 만든다는 뜻은 아니다. 제공받던 빌드와 의존성 책임을 팀으로 가져오는 선택이다.

- 어떤 제약이 프레임워크로 해결되지 않는지 구체적으로 확인한다.
- navigation, 필수 기기 API, 의존성과 빌드 지원의 소유자를 정한다.
- 기존 앱이면 새 전체 앱보다 필요한 화면이나 flow 단위 통합을 검토한다.
- 로컬 네이티브 빌드 여부와 클라우드 빌드 여부를 구분한다. 프레임워크를 사용해도 로컬 네이티브 빌드에는 플랫폼 도구가 필요하다.

프레임워크 없이 새 프로젝트를 만드는 CLI의 현재 명령은 시작 가이드와 사용 버전의 Community CLI 문서를 확인한다. 이 페이지의 핵심은 프레임워크 선택이며 별도 CLI 초기화 절차까지 검증한 문서는 아니다.

## 출처

- [React Native, Environment Setup](https://reactnative.dev/docs/environment-setup)

## 관련 문서

- [[Expo]]
- [[RN-Local-Environment]]
- [[RN-Android-Integration]]
- [[RN-iOS-Integration]]
