---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 앱 서명 자료의 역할"]
---

# EAS 앱 서명 자료의 역할

## Android keystore

Android 설치/업데이트 바이너리는 서명이 필요하다. keystore는 개인키와 공개 인증서를 보관한다. Play App Signing에서는 Google이 배포용 app signing key를 관리하고 개발자의 upload key로 제출 파일을 인증한다. EAS는 연결된 keystore로 APK/AAB를 서명하며 두 key의 운영 책임까지 같게 만들지는 않는다.

Upload key를 잃으면 Play의 reset 절차로 교체할 수 있지만 app signing key 자체를 잃은 기존 구성은 같은 복구를 보장하지 않는다. 기존 앱 업데이트에는 등록된 서명 연속성이 필요하므로 새 keystore를 임의로 만들어 대체하지 않는다. release keystore, 암호와 credentials.json은 저장소에서 제외하고 별도로 백업한다.

## iOS 서명과 push

Distribution certificate는 개발팀의 서명 자격, provisioning profile은 앱/서명/권한 및 배포 방식의 연결이다. APNs key는 push 송신용이며 앱 코드 서명용이 아니다. 인증서/profile 만료와 APNs key 폐기가 일으키는 영향은 다르다.

App Store에서 이미 배포된 앱은 인증서/profile 만료만으로 동일한 방식으로 중단되는 것은 아니지만 새 제출에는 유효한 자료가 필요하다. ad hoc/enterprise 설치의 만료와 배포 조건은 별도다. APNs key 폐기는 이를 사용하는 push 송신에 영향을 준다. 새 key로 교체해도 Expo Push Token이 그 이유만으로 바뀌는 것은 아니다.

공식 app-credentials 본문은 distribution certificate 한도에 서로 다른 수치를 적고 있다. 이 문서에서 계정 전체 한도를 확정하지 않으며 Apple 계정 종류와 현재 Portal의 인증서 정책을 확인한다.

## 삭제와 재서명

`eas credentials`에서 삭제하면 EAS 저장본을 제거한다. Apple/Google의 실제 자격을 폐기하는 것과 다르다. 유출 대응에는 해당 공급자에서의 revoke/reset도 필요하다.

`eas build:resign`은 기존 iOS IPA artifact를 새 ad hoc profile로 서명하는 데 사용한다. 새 기기를 포함할 때 전체 compile을 반복하지 않을 수 있다. 결과는 새 서명의 별도 artifact이며 기존 공유 파일이 자동 갱신되는 것은 아니다.

## 출처

- [Expo Documentation, App credentials](https://docs.expo.dev/app-signing/app-credentials)

## 관련 문서

- [[Expo-EAS-Build-Signing]]

- [[Expo]]
