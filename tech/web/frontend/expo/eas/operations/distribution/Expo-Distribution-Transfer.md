---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["앱 소유권 이전의 두 경계"]
---

# 앱 소유권 이전의 두 경계

## EAS와 store record

앱 인계에는 Expo 프로젝트와 Apple/Google store record라는 별도 자산이 있다. EAS project transfer만으로 Apple Developer team이나 Google Play 소유자가 바뀌지 않는다. 반대로 store 이전이 EAS Build/Update 소유권을 자동 이전하지 않는다.

각 경로에서 계정 권한, 앱 식별자, signing credential, push key, update project ID/URL, CI token과 billing account를 점검한다. 변경 전후 앱의 업데이트/알림/로그인 같은 실제 흐름을 검증한다.

## 권한과 인계 절차

EAS 일반 이전은 source/destination 양쪽 Owner/Admin 권한을 요구한다. 원문 caveat는 source Owner라고 더 좁게 표현하므로 중요한 인계는 Owner가 UI 요구를 확인한다. 상대 조직의 관리 권한을 받을 수 없으면 임시 Organization을 중간 소유자로 두고 상대를 Owner로 초대하는 escrow 방식을 사용할 수 있다.

Store별 이전 가능 조건과 credential 후속 작업은 Apple/Google 이전 문서를 따른다. 이 문서는 이전 요청이나 실행 기록이 아니다.

## 출처

- [Expo Documentation, App transfers](https://docs.expo.dev/distribution/app-transfers)

## 관련 문서

- [[Expo-Distribution]]

- [[Expo]]
