---
tags: [istio, envoy, authorization, http2, security]
status: done
verified_at: 2026-11-04
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio HTTP 메서드 인가", "Istio Authorization Method Matching"]
---

# Istio HTTP 메서드 인가와 대소문자 검증

HTTP 메서드 기반 인가는 정책 문자열만 확인해서 끝나지 않는다. 요청이 사용하는 프로토콜, 프록시의 입력 처리와 정책 비교 방식이 함께 결정한다. 인가 규칙을 검증할 때는 실제로 우회가 가능했던 경로를 재현해야 한다.

## HTTP/2 메서드 우회의 조건

ISTIO-SECURITY-2026-007(2026-10-15)과 GHSA-w44g-8m76-8gc5를 2026-11-04 대조했다. 취약한 구현은 `:method`를 대소문자를 구분해 비교했다.

| 정책 형태 | 대소문자만 다른 HTTP/2 메서드가 들어올 때의 취약 동작 |
|---|---|
| `DENY`의 `methods`에 `POST` 지정 | `post`가 거부 조건에 일치하지 않아 해당 거부 규칙을 피할 수 있었다 |
| `ALLOW`의 `notMethods`에 `POST` 지정 | `post`가 제외 목록에 일치하지 않아 허용 조건을 통과할 수 있었다 |
| 명시적 `methods` 허용 목록만 사용하는 `ALLOW` | 이 우회의 영향 대상이 아니다. 대소문자가 다른 값은 허용 목록에 일치하지 않는다 |

이 취약점은 클라이언트가 HTTP/2로 워크로드에 접근할 수 있을 때 문제다. 공지의 HTTP/1.1 경로는 코덱이 대문자가 아닌 메서드를 인가 전에 거부하므로 영향이 없다. 이는 해당 Istio 구현의 설명이며 모든 HTTP 서버의 보편적 처리 규칙이 아니다. 수정 뒤 인가의 메서드 비교는 대소문자를 구분하지 않는다.

## 수정 버전과 임시 대응

| 계열 | 공지에 적힌 영향 버전 | 해당 수정이 포함된 버전 |
|---|---|---|
| 1.31 | 1.31.0~1.31.1 | 1.31.2 |
| 1.30 | 1.30.0~1.30.5 | 1.30.6 |
| 1.29 | 1.29.0~1.29.8 | 1.29.9 |

표는 이 취약점의 수정 경계이며 최신 권장 버전 목록이 아니다. 공지는 1.29가 2026-10-15 지원 종료됐고 1.29.9가 마지막 릴리스라고 명시한다. 실제 업그레이드에서는 지원 계열과 후속 보안 공지를 다시 확인한다.

공지의 임시 대응은 `DENY`나 `notMethods` 대신 명시적 `methods` 허용 목록을 사용하는 것이다. 기존 정책을 바꿀 때는 다른 허용 규칙과 정상 요청의 영향을 함께 검토한다(운영 제안).

## 검증할 요청과 판정 근거

다음은 공지의 실패 조건에서 도출한 점검 절차이며, 이 문서에서 mesh를 실행해 재현한 결과는 아니다.

1. 정책이 붙은 워크로드와 HTTP/2 도달 경로를 확인한다. 중간 프록시가 프로토콜이나 메서드를 바꿀 수 있는지도 본다.
2. 시험 환경에서 같은 경로, 본문과 신원으로 `POST`, `post`, 혼합 대소문자를 보낸다. `DENY methods`와 `ALLOW notMethods`는 따로 확인한다.
3. 응답 코드뿐 아니라 프록시 인가 기록과 백엔드 도달 여부를 비교한다. 백엔드의 미지원 메서드 오류를 프록시 차단으로 오인하지 않는다.
4. 수정 뒤 차단 대상의 대소문자 변형이 같은 인가 결과를 내는지, 원래 허용하던 요청도 정상인지 확인한다.

HTTP/1.1 요청의 차단 성공만으로 HTTP/2 우회가 해소됐다고 판정하지 않는다. 이 점검은 메서드 인가에 한정되며 같은 보안 공지의 다른 취약점까지 검증하지 않는다.

## 출처

- [ISTIO-SECURITY-2026-007 — Istio](https://istio.io/latest/news/security/istio-security-2026-007/) — 영향 조건, 비교 방식 수정, 계열별 패치와 1.29 지원 종료.
- [AuthorizationPolicy method rules are bypassed over HTTP/2 by changing the method case — istio/istio](https://github.com/istio/istio/security/advisories/GHSA-w44g-8m76-8gc5) — 영향 버전과 명시적 허용 목록을 쓰는 임시 대응.

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]]
- [[Istio-Ambient-Upgrade|Istio 컴포넌트 업그레이드]]
- [[Envoy-Upgrade-Behavior-Changes|Envoy 업그레이드와 실제 요청 검증]]
