---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 관리형 자격 증명과 팀 권한"]
---

# EAS 관리형 자격 증명과 팀 권한

## 관리형 credentials

처음 `eas build`를 실행할 때 필요한 keystore/certificate/profile을 생성하거나 기존 자료를 제공할 수 있다. EAS 관리형 자료는 이후 build에 재사용하며 `eas credentials`로 확인/변경/다운로드한다.

서명 자료와 push credentials는 서로 다른 용도다. Android push는 현재 FCM 구성, iOS push는 APNs key를 별도로 확인한다. 오래된 FCM server key 설명을 현재 HTTP v1 설정으로 그대로 해석하지 않는다.

## Apple 권한과 Expo 권한

Apple에서 credential을 생성할 권한과 EAS에서 저장된 credential로 build할 권한은 다르다. 권한 있는 담당자가 유효한 자료를 EAS에 준비하면 다른 개발자는 자신의 Apple 계정 없이 Expo 조직 권한으로 build를 요청할 수 있다.

개인 Apple 계정은 Account Holder가 생성 작업을 담당한다. 조직은 Account Holder/Admin, 그리고 Certificates, Identifiers & Profiles 접근이 허용된 App Manager 등의 역할 조건을 확인한다. 실제 Apple 역할별 작업 가능 범위는 Portal의 현재 권한을 대조한다.

기존 조직 자료를 사용할 때 개인 Apple 계정으로 잘못 생성하지 않는다. CLI의 Apple 로그인 질문을 건너뛰면 마지막 저장 자료를 사용하지만 Apple 측 최신 상태 검증도 생략될 수 있다. entitlement 변경, profile 만료 또는 등록 기기 추가 때는 담당자가 갱신해야 한다.

## 미리 생성한 자료와 federated 계정

EAS Developer 이상 권한 사용자는 .p12, .mobileprovision과 인증서 암호로 미리 생성한 자료를 올릴 수 있다. Federated Apple 계정의 대화형 EAS 로그인은 제한되므로 기존 credential 재사용 또는 적절한 권한의 ASC API token 경로를 검토한다. EAS Submit은 ASC API key를 사용하므로 build credential 생성과 제출 인증을 분리할 수 있다.

## 출처

- [Expo Documentation, Using automatically managed credentials](https://docs.expo.dev/app-signing/managed-credentials)
- [Expo Documentation, Apple Developer Program roles and permissions for EAS Build](https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions)

## 관련 문서

- [[Expo-EAS-Build-Signing]]

- [[Expo]]
