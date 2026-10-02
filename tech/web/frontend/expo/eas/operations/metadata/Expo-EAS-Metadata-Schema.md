---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Metadata schema와 release 계약"]
---

# Metadata schema와 release 계약

## Root와 apple 필드

Root는 configVersion:0과 apple이다. version/copyright/advisory/categories/info/release/review는 apple 내부다. version을 생략하면 store의 최신 available version을 선택한다. 설정을 다른 version에 적용하지 않도록 명시값과 원격 대상을 확인한다.

info는 locale별 map이며 한국어는 ko, 미국 영어는 en-US다. title은 2~30자, description은 10~4000자, releaseNotes 최대4000자, promoText 최대170자, URL은 최대255자라는 schema 제한을 둔다. subtitle은 30자 제한이다. keywords는 unique string 배열이며 store의 실제 keyword 제한도 확인한다.

privacyPolicyUrl은 개인정보 처리방침, privacyChoicesUrl은 데이터 관리/삭제 선택 경로, privacyPolicyText는 Apple TV용이다. marketingUrl과 supportUrl을 같은 목적이라고 취급하지 않는다.

## 연령과 카테고리

advisory는 콘텐츠의 약물/폭력/성적 표현/의료 정보/도박/웹 접근 등을 답한다. 빈 설정의 가장 덜 제한적인 기본값이 앱에 맞는다고 가정하지 않는다. NONE/INFREQUENT_OR_MILD/FREQUENT_OR_INTENSE와 boolean, kidsAgeBand를 구분한다.

Schema의 override는 SEVENTEEN_PLUS/UNRATED, 한국은 FIFTEEN_PLUS/NINETEEN_PLUS 등의 enum이다. 연령 정책이 바뀔 수 있으므로 2026-04 schema의 enum을 현재 Apple 심사 기준 전체로 해석하지 않고 제출 시 App Store Connect와 맞춘다.

categories는 primary/secondary 순서다. GAMES/STICKERS는 각 최대2개 subcategory를 내부 배열로 표현할 수 있다. 임의 문자열 대신 schema enum을 사용한다.

## 공개와 심사

release.automaticRelease는 false(기본 수동), true(승인 후 자동), RFC3339 시각이다. 예약 날짜의 공개를 Apple이 보장하지 않는다. phasedRelease는 자동 업데이트를 7일에 걸쳐 배포하지만 사용자의 수동 update를 막지 않는다. pause는 최대30일이다.

review에는 연락 담당 firstName/lastName/email/phone, demoUsername/demoPassword/demoRequired와 notes가 있다. review용 계정은 심사 기간에 작동해야 한다. 실제 연락처/비밀번호를 공개 Vault나 Git에 넣지 않고 보안 경로로 설정한다. notes에 login secret을 섞지 않는다.

## 출처

- [Expo Documentation, Schema for EAS Metadata](https://docs.expo.dev/eas/metadata/schema)

## 관련 문서

- [[Expo-EAS-Metadata]]

- [[Expo]]
