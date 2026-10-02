---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 서비스의 역할"]
---

# EAS 서비스의 역할

## 서비스 경계

Expo Application Services는 Expo/React Native 앱의 개발, 배포와 관찰을 지원하는 cloud 서비스다. Expo SDK와 함께 쓰기 쉽지만 프레임워크의 로컬 실행과 cloud 서비스 사용은 별개 선택이다.

| 서비스 | 맡는 작업 |
| --- | --- |
| Build | Android/iOS native compile와 signing |
| Submit | 스토어 배포 시스템에 바이너리 업로드 |
| Update | 호환 native runtime에 JavaScript/assets 전달 |
| Hosting | Expo Router web 앱과 API route 배포 |
| Workflows | 여러 build/test/update/deploy job의 실행 순서 자동화 |
| Observe | 운영 앱 성능과 오류 관찰 |
| Metadata | 스토어 정보 관리, 현재 preview |
| Insights | 프로젝트 사용/실행 지표, 현재 preview |

Build 성공, Submit 성공, App Review 승인과 사용자 업데이트 적용을 각각 기록한다. SDK 변경이나 native module 추가를 Update만으로 배포할 수 있다고 가정하지 않는다.

## 도입 기준

기본 mobile 배포 절차와 EAS artifact를 한 곳에서 관리하려면 EAS가 유리하다. Docker나 자체 runner, 비모바일 작업 중심의 복잡한 pipeline은 범용 CI와 비교한다. 필요한 서비스부터 연결하고 프로젝트 계정, 환경 변수, credential과 요금 범위를 함께 정한다.

## 출처

- [Expo Documentation, Expo Application Services](https://docs.expo.dev/eas)

## 관련 문서

- [[Expo-EAS-Configuration]]

- [[Expo]]
