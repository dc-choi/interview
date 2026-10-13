---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-14
category: "웹&네트워크(Web&Network)"
aliases: ["EAS build 실패와 runtime crash 진단"]
---

# EAS build 실패와 runtime crash 진단

## 실패 단계를 먼저 구분한다

Build가 실패하는 경우와 성공한 바이너리가 실행 중 crash/hang하는 경우는 다른 경로다. Build detail에서 가장 먼저 실패한 단계와 직접적인 오류를 읽는다. stderr는 warning/진단에도 사용되므로 stderr 표시만으로 원인이라고 판단하지 않는다.

iOS 화면에는 축약 로그만 보일 수 있다. Xcode 전체 로그에서 실제 compile, bundle 또는 signing 오류를 확인한다. 성공 build와 실패 build를 Compare로 대조할 때 source SHA, SDK/image, lockfile, 환경 변수와 처음 달라진 단계를 함께 본다.

## JavaScript bundle

`bundleReleaseJsAndAssets FAILED`, `Metro encountered an error`이면 먼저 `npx expo export`로 production bundle을 로컬에서 확인한다. 모듈 경로의 대소문자, 생성 파일의 선행 작업, .gitignore/.easignore로 제외된 파일과 monorepo 의존성을 조사한다.

비밀 파일이 누락됐다고 무조건 소스에 포함하지 않는다. 앱이 읽는 bundle은 공개될 수 있으므로 client에 필요한 공개 설정과 서버 secret을 분리한다. build에만 필요한 파일은 안전하게 복원하고 최종 bundle 포함 여부를 확인한다.

## Native와 메모리

Native 오류는 새로 추가한 dependency/config plugin, SDK 호환성과 native 출력부터 본다. `npx expo-doctor` 결과와 실제 dependency version을 확인한다.

`Gradle build daemon disappeared unexpectedly`는 process 종료 징후이며 그것만으로 Node OOM을 확정할 수 없다. 메모리 로그, heap dump와 실패 단계를 추가로 확인한다. 대형 문자열/JSON이 source로 들어간 경우 Atlas로 bundle 기여도를 조사하고 필요하면 자원 등급을 조정한다.

## 로컬 재현 조건

Android release variant 또는 iOS Release 구성으로 compile/run한다. expo start의 production JS 옵션은 native release build와 같지 않다. EAS local build로 절차를 좁힐 수도 있다.

로컬만 성공하면 새 checkout에서도 같은지 확인하고 toolchain, 환경 변수와 업로드 archive를 비교한다. 로컬 환경의 설치 도구나 cache가 숨겨진 전제일 수 있다. 오류 보고에는 build ID, 최초 오류, 재현 source와 기대/실제 결과를 포함하고 credential과 개인정보는 제거한다.

## 빌드는 성공했지만 실행 중 종료될 때

Expo Go에서 정상 동작해도 설치한 release 앱이 시작 직후 종료되거나 splash 화면에 멈출 수 있다. 이 경우 빌드 로그와 별도로 실행 중 오류를 수집한다.

1. 스토어에 배포한 Android 앱은 Google Play Console의 crash 보고서를, TestFlight 또는 App Store의 iOS 앱은 Xcode Crashes Organizer를 확인한다.
2. 재현 기기를 연결해 Android는 `adb logcat`, iOS는 macOS Console에서 native 로그를 수집한다. JavaScript 오류 출력만으로 드러나지 않는 native module 오류와 종료 원인을 함께 찾는다.
3. `npx expo start --no-dev --minify`로 production JavaScript 조건을 확인한다. native release 재현은 별도로 `npx expo run:android --variant release` 또는 `npx expo run:ios --configuration Release`로 수행한다.
4. 원인이 좁혀지지 않으면 최소 재현 프로젝트에 변경을 하나씩 적용해 실패를 일으키는 부분을 분리한다. 기존 오류 수집 도구가 있으면 stack trace와 기기 정보도 대조한다.

## 출처

- [Expo Documentation, Troubleshoot build errors and crashes](https://docs.expo.dev/build-reference/troubleshooting)
- [Expo Documentation, Debugging runtime issues](https://docs.expo.dev/debugging/runtime-issues/)

## 관련 문서

- [[Expo-EAS-Build-Execution]]

- [[Expo]]
