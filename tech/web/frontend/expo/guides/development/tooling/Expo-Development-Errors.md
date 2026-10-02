---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 개발 오류의 원인별 조사"]
---

# Expo 개발 오류의 원인별 조사

## 오류를 층별로 좁히기

| 증상 | 먼저 확인할 원인 | 확인 방법 |
| --- | --- | --- |
| Metro ECONNREFUSED | 서버 중단, 잘못된 host/port, firewall/proxy | 실행 process와 기기 network 확인 |
| AppRegistry not callable | bundle 초기 실행 exception | 첫 native/JS error, Babel, production JS 재현 |
| No git binary in PATH | Git 설치/실행 경로 | shell의 git path 확인 |
| invalid SDK version | 앱/runtime의 SDK 지원 mismatch | package SDK와 Expo Go 지원 버전 확인 |
| React Native version mismatch | binary native RN과 Metro JS RN 불일치 | 설치 앱, 연결 서버와 package 버전 대조 |
| Application not registered | 초기 exception 또는 native/JS AppKey mismatch | 첫 오류 후 registration name 대조 |
| 변경 미반영 | cache/서버/설치 앱 혼동 | 현재 연결 대상을 확인한 뒤 해당 cache 제거 |

과거 ECONNREFUSED 예제의 19001 port를 현재 Metro 기본 8081로 고정 치환하거나 모든 실패를 port 하나로 설명하지 않는다. 실제 terminal URL과 기기의 요청 주소를 사용한다.

## 조사 순서

`expo start --no-dev --minify`로 release-only JS 오류를 확인하고 Android Studio/Xcode device stack을 연결한다. registration 오류는 결과 메시지일 수 있으므로 맨 처음 발생한 import/module error를 먼저 해결한다.

`.expo`는 local state를 보관하므로 잘못된 개발 state가 원인일 때 삭제 후 재생성할 수 있다. dependency/Metro cache clear는 stale 상태를 확인한 뒤 수행하며 unrelated native source와 credential을 삭제하는 해결책으로 확장하지 않는다. invalid SDK 메시지만 보고 source 프로젝트의 모든 버전이 지원 종료됐다고 단정하지 않는다.

## 출처

- [Expo Documentation, Common development errors](https://docs.expo.dev/workflow/common-development-errors)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
