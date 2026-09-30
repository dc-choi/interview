---
tags: [business, marketing, aso, localization, global, app-store]
status: done
verified_at: 2026-09-29
category: "비즈니스&제품(Business&Product)"
aliases: ["App Store Listing Localization", "앱스토어 등록 정보 현지화", "앱스토어 기본 언어"]
---

# 앱스토어 등록 정보의 기본 언어와 현지화

앱스토어의 앱 이름, 부제, 설명, 스크린샷 같은 등록 정보는 국가별 스토어와 사용자 언어에 맞는 현지화가 있으면 그 언어로, 없으면 기본 언어로 보인다. 그래서 기본 언어를 한국어로 두고 한국어만 입력하면 해외 스토어에서도 한국어 소개가 뜬다. 해외 사용자를 받을 생각이 있다면 등록 단계에서 기본 언어와 현지화 구성을 먼저 정해야 한다. 스토어 페이지는 설치 전 마지막 설득 지점이라, 읽을 수 없는 언어로 뜨면 검색에 걸려도 전환이 거의 일어나지 않는다.

## 동작 방식

### Apple App Store

- App Store Connect에서 앱마다 기본 언어(Primary Language)를 하나 정하고 언어별 현지화를 추가한다.
- 사용자의 언어 설정과 맞는 현지화가 있으면 그 현지화를 보여 준다. 맞는 것이 없으면 다음으로 관련성이 높은 현지화를 쓰고, 그것도 없는 국가나 지역에서는 기본 언어로 보여 준다.
- 국가별 스토어마다 기본 언어와 추가 지원 언어가 정해져 있다. 비영어권 스토어 상당수가 영어(영국 또는 미국)를 추가 지원 언어로 둔다(2026-09-29 기준 예: 한국은 한국어와 영어(영국), 일본은 일본어와 영어(미국), 독일, 프랑스, 브라질은 각 현지어와 영어(영국)).
- 기본 언어가 영어이고 영어만 입력하면 모든 국가와 지역에서 영어로 보인다. 여기에 한국어 현지화를 더하면 한국어 설정 사용자에게는 한국어가 보인다.
- 기본 언어는 나중에 바꿀 수 있지만 조건이 있다. 바꿀 언어가 이미 버전에 추가돼 있어야 하고, 그 언어의 스크린샷이 지원 플랫폼마다 올라가 심사 승인을 받아야 한다.

### Google Play

- 스토어 등록 정보에 기본 언어와 언어별 번역을 둔다.
- 번역하지 않은 언어의 사용자는 자동 번역본을 볼 수 있고, 페이지 상단에 자동 번역이라는 안내와 기본 언어로 보기 선택지가 붙는다. 일부 언어는 자동 번역을 지원하지 않는다.
- 자동 번역은 품질과 검색 키워드를 통제할 수 없으므로, 주력 시장은 직접 번역한 등록 정보를 두는 편이 낫다.

## 권장 구성

| 목표 | 구성 |
|---|---|
| 한국 전용 | 기본 언어 한국어. 해외 노출을 원하지 않으면 판매 국가도 한국으로 제한한다. |
| 한국 우선, 해외는 열어 둠 | 기본 언어 영어, 현지화에 한국어를 추가한다. 한국 사용자는 한국어로, 나머지 스토어는 영어로 보게 된다. |
| 특정 해외 시장 공략 | 위 구성에 주력 시장 언어를 현지화로 더하고, 앱 이름, 부제, 키워드를 그 언어의 검색어로 따로 쓴다. |

## 트레이드오프와 주의점

- 기본 언어를 영어로 두면 영어 스크린샷과 설명을 계속 함께 관리해야 한다. 한국어만 갱신하고 영어를 방치하면 해외 페이지가 오래된 정보로 남는다.
- 등록 정보만 영어로 바꾸고 앱 안이 한국어뿐이면 설치 뒤 바로 이탈한다. 스토어 현지화와 앱 내부 현지화, 결제, 고객 응대 언어의 범위를 함께 정한다.
- 판매 국가를 넓히면 국가별 세금, 결제, 개인정보, 콘텐츠 규제를 확인해야 한다. 노출 범위는 운영할 수 있는 범위와 맞춘다.
- 번역문을 그대로 옮기면 검색 노출이 약하다. 앱 이름, 부제, 키워드는 현지 사용자가 실제로 검색하는 단어로 다시 고른다.

## 적용 점검

- 기본 언어가 무엇이고, 현지화가 없는 스토어에서 어떤 언어로 보이는지 알고 있는가.
- 판매 국가 설정과 등록 정보 언어가 해외 진출 의도와 맞는가.
- 영어 등록 정보를 누가, 어떤 주기로 갱신하는가.
- 스토어 언어와 앱 내부 언어가 어긋나지 않는가.

## 출처

- [Apple Developer, App Store Connect Help, Localize app information](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/)
- [Apple Developer, App Store Connect Help, App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations/)
- [Google Play Console Help, Translate and localize your app](https://support.google.com/googleplay/android-developer/answer/9844778)
- [앱스토어 등록 기본 언어 — Threads, goseene](https://www.threads.com/@goseene/post/Dd0r3XSk2AK)

## 관련 문서

- [[GTM-Strategy|Go-to-Market 전략]]
- [[Marketing-Fundamentals|마케팅, 브랜딩, 광고 기초]]
- [[Expansion-Strategy|성장과 확장 전략]]
- [[In-App-Purchase|인앱결제]]
