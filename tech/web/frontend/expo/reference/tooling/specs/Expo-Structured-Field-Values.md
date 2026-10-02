---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Structured Field Values v0"]
---

# Expo Structured Field Values v0

## SFV 범위

Expo SFV v0는 HTTP 헤더에 구조화된 값을 싣기 위한 형식이다. Expo Updates의 필터, 서버 지정 헤더와 서명 메타데이터에서 쓰이며 JSON 문자열을 그대로 헤더에 넣는 규약이 아니다.

Expo 명세는 RFC 8941의 일부만 지원한다고 설명하며 key values, string/integer/decimal item과 dictionary를 범위로 열거한다. RFC 전체 구현과 Expo subset의 호환성을 같은 것으로 취급하지 않는다.

## 다른 규약과의 경계

Updates 응답은 `expo-sfv-version: 0`으로 형식을 식별한다. 구체적인 헤더별 key와 값의 의미는 Updates v1 규약이 정한다. 특히 서명 협상에는 boolean `sig` 예제가 있으므로 짧은 SFV subset 열거만으로 해당 헤더 값을 배제하지 않는다. parser 구현은 사용하려는 실제 헤더 계약과 함께 대조한다.

이 문서는 Expo v0의 범위를 설명한다. HTTP structured fields 표준의 최신 상태나 RFC 8941 전체 문법을 설명하는 문서가 아니다.

## 출처

- [Expo Documentation, Expo Structured Field Values](https://docs.expo.dev/technical-specs/expo-sfv-0)

## 관련 문서

- [[Expo-Specifications]]

- [[Expo]]
