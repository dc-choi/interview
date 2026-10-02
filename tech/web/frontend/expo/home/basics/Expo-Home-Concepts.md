---
tags: [expo, react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 구성 요소와 개발 흐름"]
---

# Expo 구성 요소와 개발 흐름

## 프레임워크와 서비스

Expo는 Android, iOS, 웹 앱을 JavaScript/TypeScript와 React Native로 만드는 오픈소스 프레임워크다. `expo` 패키지는 기존 React Native 프로젝트에도 추가할 수 있다. 파일 기반 라우팅, 호환되는 네이티브 모듈, 개발 서버, 네이티브 프로젝트 생성을 조합하되 모든 기능을 한꺼번에 도입할 필요는 없다.

Expo Application Services(EAS)는 클라우드 빌드, 스토어 제출, 업데이트, 웹 호스팅, 자동화와 관측을 제공하는 별도 서비스다. Expo 프레임워크를 사용하지 않는 React Native 앱도 EAS를 이용할 수 있다. 오픈소스 도구의 사용과 EAS 계정/서비스 이용은 구분한다.

| 구성 요소 | 담당하는 일 | 판단할 경계 |
| --- | --- | --- |
| Expo SDK | 카메라, 이미지, 알림 등 네이티브 기능 모듈 | 설치한 SDK와 라이브러리 버전의 호환성 |
| Expo Router | 파일 구조에서 Android/iOS/웹 경로 생성 | 화면 이동, 딥링크, 웹 URL을 함께 설계 |
| Expo Modules API | Swift/Kotlin 기반 네이티브 모듈과 뷰 작성 | JavaScript로 해결하지 못하는 플랫폼 기능 |
| Prebuild/CNG | 설정과 플러그인으로 네이티브 프로젝트 생성 | 생성 파일 직접 수정의 재생성 손실 |
| Expo CLI | 개발 서버, 호환 의존성 설치, 로컬 컴파일 | 로컬 네이티브 컴파일은 플랫폼 도구 필요 |
| Expo Go | 정해진 네이티브 런타임에서 빠른 학습 | 앱별 네이티브 코드와 운영 검증에는 한계 |
| Development build | 앱별 네이티브 런타임과 개발 도구 | 네이티브 구성이 바뀌면 새 바이너리 필요 |

## 개발에서 운영까지

1. `create-expo-app`으로 프로젝트를 만들고 실제 SDK와 패키지를 확인한다.
2. 개발 환경을 선택해 앱을 설치한 뒤 Metro에 연결한다.
3. UI, 라우팅, 데이터, 인증을 구현하고 단위 테스트와 기기 검증을 수행한다.
4. 팀 리뷰에는 preview build나 호환되는 EAS Update를 사용한다.
5. production build를 스토어에 제출한다. 제출 성공과 심사/출시 완료는 다르다.
6. JavaScript와 에셋 변경은 네이티브 호환 조건을 만족하면 EAS Update로 배포한다.
7. 오류, 성능, 사용 패턴을 관측해 다음 변경의 근거로 삼는다.

## 학습과 탐색 수단

Snack은 로컬 환경 없이 브라우저에서 작은 예제를 공유하고 실험하는 수단이다. 공식 예제 저장소의 `with-*` 프로젝트는 특정 통합의 출발점이며 모든 앱의 정답 구조를 의미하지 않는다. 기본 앱부터 스토어 출시까지는 Learn 튜토리얼, API 계약은 Reference, 특정 통합은 Guides를 확인한다.

Expo Launch는 GitHub 프로젝트에서 출시 과정을 안내하는 서비스다. 홈의 `npx testflight`는 iOS TestFlight 업로드 진입점이며 웹 배포는 `npx eas-cli deploy`를 사용한다. 실제 배포 전에 프로젝트 export, 서명, 계정과 스토어 요구사항을 각각 충족해야 한다.

## 기준과 확인 범위

이 문서 묶음의 SDK 기준은 57이다. Expo SDK, React Native, React 버전을 독립적으로 최신으로 올리지 않고 SDK가 지원하는 조합을 확인한다. 공식 문서와 설정 계약을 대조했으며 앱 실행, 클라우드 빌드와 스토어 심사를 검증한 기록은 아니다.

## 출처

- [Expo Documentation, Core concepts](https://docs.expo.dev/core-concepts)
- [Expo Documentation, Expo documentation](https://docs.expo.dev/)

## 관련 문서

- [[Expo-Home-Project]]
- [[Expo-Home-Environment]]
- [[Expo-Home-Development-Builds]]
- [[Expo-Home-Release-Build]]
