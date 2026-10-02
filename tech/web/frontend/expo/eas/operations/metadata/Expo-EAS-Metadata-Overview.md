---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Metadata 스토어 정보 관리"]
---

# EAS Metadata 스토어 정보 관리

## 지원 범위

EAS Metadata는 beta이며 현재 Apple App Store 정보만 관리한다. Google Play listing과 screenshot upload는 지원하지 않는다. store.config.json으로 설명, 언어와 review/release 정보를 검증하고 동기화한다. Metadata 검증 통과가 App Review 승인을 보장하지는 않는다.

기존 App Store 앱은 eas metadata:pull로 설정을 가져온다. 아직 store 정보가 없으면 파일을 직접 만든다. 새 binary를 업로드하고 처리가 끝난 뒤 eas metadata:push로 metadata를 전송한다. 일부 항목만 실패하면 수정한 뒤 다시 push할 수 있다.

## Dashboard와 동기화

지원하지 않는 기능은 App Store Connect에서 편집한다. Dashboard 변경 뒤 pull하지 않고 오래된 파일을 push하면 변경을 덮을 수 있다. 로컬 설정과 원격 현재 상태를 비교한 뒤 publish한다.

Restricted Apple account에서는 일부 metadata 접근이 실패할 수 있다. Expo account 권한과 Apple account 권한을 별도로 확인한다. metadata push, binary upload, review 제출과 실제 공개는 서로 다른 상태다.

## 출처

- [Expo Documentation, EAS Metadata](https://docs.expo.dev/eas/metadata)
- [Expo Documentation, Get started with EAS Metadata](https://docs.expo.dev/eas/metadata/getting-started)

## 관련 문서

- [[Expo-EAS-Metadata]]

- [[Expo]]
