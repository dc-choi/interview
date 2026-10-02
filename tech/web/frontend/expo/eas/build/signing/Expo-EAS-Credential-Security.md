---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS credential 보관과 사고 범위"]
---

# EAS credential 보관과 사고 범위

## 보관 경계

Expo는 저장 credential을 cloud storage 암호화와 KMS로 보호하고 필요한 builder/push process의 메모리에서 사용한다고 설명한다. 이는 서비스 설명이며 이 문서 작성 과정에서 실제 서버 저장 상태를 감사한 결과는 아니다.

서명, 제출, push credential의 역할을 구분해야 유출 범위와 교체 순서를 판단할 수 있다.

| 자료 | 권한과 대응 |
| --- | --- |
| Android keystore와 암호 | binary 서명. Play 제출 권한과 결합될 때 스토어 update 위험. upload key면 reset 검토 |
| Google service account key | 부여된 Play Console 권한 범위의 제출 작업. 폐기/재발급과 접근 권한 축소 |
| iOS certificate와 private key | 해당 앱/팀의 서명. 제출 인증은 별도로 필요 |
| ASC API key | 부여된 App Store Connect 작업. EAS 제출의 권장 인증 경로 |
| APNs/FCM credential | 해당 project/app에 push 전송. target token도 필요 |
| Device/Expo Push Token | 알림 수신 대상 식별. 서명 key나 사용자 로그인 credential이 아님 |

인증서 공개 파일과 실제 서명에 필요한 private key를 구분한다. 공개 인증서를 다시 내려받을 수 있어도 잃어버린 private key를 복구할 수 있다는 뜻은 아니다.

## Apple 로그인과 session

EAS CLI의 Apple ID 암호는 로컬에서 사용하고 macOS에서는 Keychain에 저장할 수 있다. `EXPO_NO_KEYCHAIN=1`로 이를 끌 수 있다. ad hoc profile 작업에는 Apple session token이 잠시 서버에서 사용될 수 있으므로 로그인 암호가 서버에 저장되지 않는다는 설명을 모든 token이 로컬에만 있다는 의미로 확대하지 않는다.

Apple app-specific password는 제출 시점마다 제공하며 Expo 설명상 제출과 재시도를 위한 24시간 보관 뒤 제거한다. ASC API key는 후속 제출에 재사용하도록 저장할 수 있다. 각각의 보관과 revoke 위치가 다르다.

## 사고 대응과 복구

EAS 저장본 삭제와 Apple/Google의 revoke는 별개다. 실제 유출 자료를 공급자에서 폐기하고 새 자료를 EAS/CI에 반영한 뒤 build, submit 또는 push를 기능별로 확인한다. APNs key는 Apple에서 생성 시 한 번만 다운로드 가능하므로 안전한 백업이나 재발급 경로가 필요하다.

Store 배포 앱, ad hoc 설치와 enterprise 설치의 credential 만료 효과를 같은 것으로 취급하지 않는다. FCM 관련 오래된 server key 설명도 최신 HTTP v1 service account 설정과 구분한다.

더 엄격한 요구가 있으면 자체 인프라 build를 선택할 수 있다. 그래도 Expo push 서비스를 사용하면 push credential 제공은 별도 문제로 남는다.

## 출처

- [Expo Documentation, Security](https://docs.expo.dev/app-signing/security)

## 관련 문서

- [[Expo-EAS-Build-Signing]]

- [[Expo]]
