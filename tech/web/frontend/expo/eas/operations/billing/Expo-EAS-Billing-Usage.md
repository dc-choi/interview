---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 사용량 계산과 비용 제어"]
---

# EAS 사용량 계산과 비용 제어

## Build 계산

플랫폼과 resource class별 flat build 비용을 합산하고 해당 기간 credit을 차감한다. 작업 시작 전에 취소된 build는 청구하지 않지만, 작업을 시작한 뒤 실패/취소한 build를 모두 무료라고 가정하지 않는다.

Native runtime이 같으면 development build를 재사용하고 JS/assets 변경은 compatible Update로 전달할 수 있다. Native dependency/config가 바뀌면 새 build가 필요하다. Fingerprint와 테스트로 이 경계를 확인한다.

## Update 계산

MAU는 billing period에 update를 적어도 하나 다운로드한 unique installation이다. 로그인 사용자 수나 update 확인 요청 수와 다르다. 같은 installation이 update를 여러 번 받아도 해당 기간 MAU는 한 번, 추가 다운로드의 bandwidth는 계속 합산된다.

문서 계산식은 기본 MAU 초과 installation마다 40MiB bandwidth를 더 제공한다. 따라서 추가 bandwidth는 전체 전송량에서 plan 포함량과 초과MAU ×40MiB를 빼고 0 미만이면 0으로 둔다. 단가와 포함량은 현재 pricing을 따른다.

예를 들어 5MiB update20개를 installation10,000개가 모두 받으면 약976.56GiB다. 기본100GiB/3,000MAU 조건이라면 추가7,000MAU의273.44GiB를 제외해 약603.13GiB가 남는다. 이는 문서의 계산 예시이며 모든 앱의 cache/download 패턴을 보장하지 않는다.

## 관찰과 절감

Billing Usage 추정치는 최대24시간 지연될 수 있다. Build credit80%/100% email 알림은 비용 차단 장치가 아니다. Owner/Admin이 notification preference와 사용량을 확인한다.

이미 다운로드한 동일 asset은 다시 받지 않아 bandwidth를 줄일 수 있다. Update에서 제외한 asset은 native build에 있어야 한다. assets:verify로 필요한 자산의 제공 여부를 검증하고 단순히 모든 이미지를 제외하지 않는다.

이 Build/Update 문서의 공식만으로 Workflows/Hosting/Observe 등 다른 서비스 총청구액을 계산하지 않는다. 계정 Usage와 현재 상품별 가격을 함께 확인한다.

## 출처

- [Expo Documentation, Usage-based pricing](https://docs.expo.dev/billing/usage-based-pricing)

## 관련 문서

- [[Expo-EAS-Billing]]

- [[Expo]]
