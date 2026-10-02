---
tags: [react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 환경 문제 진단"]
---

# React Native 환경 문제 진단

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 진단 순서와 역사적 처방

문제를 포트, 권한, 의존성, 헤더 검색, 기기 연결과 파일 감시 중 어느 경계에서 발생하는지 나눈다. 0.87 Troubleshooting 페이지에도 오래된 수동 Xcode 프로젝트 연결, React CocoaPods subspec와 polyfill 설명이 남아 있다. 아래 처방은 해당 구성을 실제로 사용하는 경우에만 적용하며 현행 템플릿 설정을 과거 예제로 바꾸지 않는다.

## Metro 포트 충돌

Metro의 기본 포트는 8081이다. 다른 프로세스가 사용 중이면 먼저 소유 프로세스를 확인한다.

```sh
lsof -i :8081
npm start -- --port=8088
# 또는 yarn start --port 8088
```

포트를 바꾸면 앱이 번들을 요청하는 주소도 같은 포트로 맞춘다. 페이지는 Xcode 프로젝트의 `project.pbxproj`에서 8081 사용 위치를 변경하는 예를 제시한다. 실제 프로젝트가 포트를 어디서 결정하는지 확인한 뒤 수정한다.

페이지에는 `kill -9 <PID>`가 나오지만 강제 종료는 해당 PID의 정체와 정상 종료 가능성을 확인한 뒤 선택한다. Windows에서는 Resource Monitor로 점유 프로세스를 확인하고 Task Manager에서 처리한다.

## npm 권한 오류

`npm WARN locking Error: EACCES`는 npm 캐시나 전역 설치 경로의 소유권 문제일 수 있다. 과거 처방은 `~/.npm`과 `/usr/local/lib/node_modules`의 소유권을 사용자에게 돌리는 `chown`이다. 현재 Node 설치 방식과 실제 경로를 먼저 확인하고, 필요한 경로만 수정한다. `/usr/local` 경로를 모든 장비에 가정하지 않는다.

## iOS 링크와 CocoaPods

| 증상 | 확인할 경계 |
|---|---|
| 수동 통합에서 Text/Image 등의 네이티브 구현 누락 | 필요한 네이티브 의존성과 앱 바이너리 연결 |
| Pods 설치 후 모듈을 찾지 못함 | `pod install` 결과와 생성된 `.xcworkspace` 사용 여부 |
| 재귀 헤더 확장 실패, Argument list too long | `User Search Header Paths`, `Header Search Paths`의 과도한 재귀 검색 |

과거 `RCTText.xcodeproj`, `RCTImage.xcodeproj`, `pod 'React', :subspecs => [...]` 방식은 legacy 통합 자료다. 현재 앱은 사용 버전의 Community Template과 Podfile에 맞춰 통합한다. 페이지에 나오는 `cocoapods-fix-react-native` 플러그인도 과거 CocoaPod 소스 후처리 처방이며, 새 의존성으로 바로 추가할 근거가 되지는 않는다.

헤더 검색 범위가 큰 폴더로 덮어써졌다면 Xcode Build Settings에서 사용자 override를 삭제해 CocoaPods의 기본 검색 경로로 돌아간다. 검색 경로를 더 넓히는 방식은 원인을 키울 수 있다.

## polyfill 초기화와 WebSocket

`No transports available`의 과거 설명은 WebSocket을 사용하는 라이브러리보다 React Native 환경 초기화가 먼저 수행돼야 한다는 문제다. 페이지에 남은 `import React from 'react'`가 React Native polyfill을 초기화한다는 문장은 현재 초기화 계약으로 사용하지 않는다. 0.87에서 초기화 side-effect 진입점이 필요한 custom entry/Jest setup은 `react-native/setup-env`를 확인한다.

## Android 설치와 실행 권한

```sh
adb kill-server
adb start-server
chmod +x android/gradlew
```

`ShellCommandUnresponsiveException`은 ADB 서버 재시작을 진단 수단으로 사용할 수 있다. `spawnSync ./gradlew EACCES`는 Gradle wrapper 파일의 실행 권한을 확인한다. 권한 변경에는 현재 파일의 소유권과 상태를 확인하며 불필요한 관리자 권한을 기본값으로 사용하지 않는다.

## Linux 파일 감시 제한

Metro 시작 중 `ENOSPC`가 발생하면 디스크 공간만 보지 말고 inotify watch 수 제한도 확인한다. 페이지의 `fs.inotify.max_user_watches=582222`는 예시 값이며 보편적인 최적값이 아니다. 실제 watch 사용량과 운영체제 설정을 확인하고 필요한 경우 `/etc/sysctl.conf` 또는 해당 배포판의 sysctl 설정에 값을 적용한다. 프로젝트 문제를 해결하기 전에 시스템 전역 값을 무조건 바꾸지는 않는다.

## 출처

- [React Native, Troubleshooting](https://reactnative.dev/docs/troubleshooting)

## 관련 문서

- [[RN-Metro]]
- [[RN-Local-Environment]]
- [[RN-Strict-TypeScript-API]]
