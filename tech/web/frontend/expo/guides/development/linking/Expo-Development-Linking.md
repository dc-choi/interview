---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo linking 전략과 URL 경계"]
---

# Expo linking 전략과 URL 경계

## 들어오는 링크와 나가는 링크

Linking은 URL로 앱을 열고 특정 화면으로 이동하거나 앱에서 다른 앱과 웹을 여는 기능이다. scheme은 처리할 프로토콜/앱을, host는 도메인이나 URL host를, path는 콘텐츠 경로를 식별한다.

| 전략 | 예 | 설치되지 않은 경우 | 필요한 구성 |
| --- | --- | --- | --- |
| custom scheme | `store://product/42` | 기본적으로 앱을 열 수 없음 | 앱 native scheme 등록, JS routing |
| Android App Links | `https://example.com/product/42` | 웹으로 이동 | intent filter, domain association |
| iOS Universal Links | 같은 HTTPS URL | 웹으로 이동 | associated domain, AASA |
| outgoing link | 다른 앱 scheme, HTTPS | handler 유무에 따라 실패/웹 | target scheme, query visibility |

App Links와 Universal Links는 통제하는 웹 도메인에 검증 파일을 호스팅해야 한다. URL을 받을 권한과 앱 내부 라우팅은 서로 다른 단계다.

## Router와 수동 routing

Expo Router는 화면별 deep link routing을 자동 제공한다. native domain 검증 설정까지 대신하지는 않는다. 외부 앱으로 나가는 링크는 Router `Link`로 표현할 수 있으며 제3자 URL 형식을 앱 경로로 바꾸려면 native-intent 설정을 적용한다.

Router를 사용하지 않으면 초기 URL과 실행 중 URL event를 받아 navigation 상태에 반영한다. callback URL query는 외부 입력으로 취급하고 앱이 실제 허용하는 경로와 parameter를 확인한다.

## 검증 환경

Expo Go의 incoming linking은 제한적이며 고유 scheme와 entitlements를 검증할 수 없다. 실제 development build에서 종료 상태의 앱 시작, 실행 중 링크, 미설치 web fallback을 각각 확인한다. 인증 callback처럼 안정적인 URL이 필요한 경우 앱의 custom scheme를 사용한다.

## 출처

- [Expo Documentation, Overview of linking, deep links, Android App Links, and iOS Universal Links](https://docs.expo.dev/linking/overview)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
