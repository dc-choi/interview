---
tags: [infrastructure, service-mesh, istio, envoy, reliability, retry]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Envoy Retry Buffer", "507 Insufficient Storage", "Retry Buffer Limit"]
---

# Envoy Retry Buffer와 507

프록시에 retry를 켜는 순간, retry가 가능하려면 request body를 **다시 보낼 수 있어야 한다**는 전제가 따라온다. Envoy는 이를 위해 body를 버퍼에 보관하는데, 버퍼 한도를 넘는 큰 payload는 retry가 필요한 순간 replay가 불가능해 507로 실패한다. retry 정책이 만든 보이지 않는 payload 크기 제한이다.

## 507 vs 413

| 코드 | 의미 |
| --- | --- |
| 413 Content Too Large | 서버가 정의한 request body 크기 제한 초과 — 항상 실패 |
| 507 Insufficient Storage (Envoy) | body 자체는 통과 가능하지만, **retry를 위한 replay 버퍼**가 부족 — retry가 필요해진 순간에만 실패 |

같은 대용량 요청이 평소에는 성공하다가 upstream reset이 겹칠 때만 507로 실패하는 간헐성이 이 구별에서 나온다.

## 발생 메커니즘

1. Envoy는 request body를 streaming으로 upstream에 전달하면서, retry 대비로 일부를 버퍼에 보관한다.
2. 버퍼 한도(`per_connection_buffer_limit_bytes`, 기본 **1MB**)를 넘으면 buffering을 포기한다.
3. 이후 upstream reset 등으로 retry가 필요해지면 body를 replay할 수 없다.
4. Envoy가 507 local reply를 반환한다 — `response_code_details: request_payload_exceeded_retry_buffer_limit`, 본문 exceeded request buffer limit while retrying upstream.

로그에서 이 details 문자열이 보이면 payload 크기와 retry 정책의 충돌이지, 스토리지나 애플리케이션 문제가 아니다.

## 대응 선택지

| 방안 | 효과 | 대가 |
| --- | --- | --- |
| buffer limit 증가 | 직접적 해결 | 프록시 메모리 사용 증가, 전체 vs 서비스별 적용 결정 필요 |
| retry 제거 | 507 소멸 | 프록시가 흡수하던 일시 오류(503)가 사용자에게 노출 |
| **클라이언트 레벨 retry** | large payload 요청만 앱에서 재시도 | idempotency key 등 중복 처리 방어를 앱이 구현 |

- retry 제거가 어려운 맥락: [[Istio-Ambient-Stale-Connection|stale connection 503]]처럼 프록시 retry가 완화책으로 이미 필요한 환경이라면, retry를 끄는 건 다른 장애를 다시 여는 것.
- 클라이언트 retry가 명시적이고 안전한 이유: 어떤 요청을 재시도해도 되는지(멱등성)를 아는 것은 프록시가 아니라 애플리케이션이다. 대용량 요청의 재시도 판단을 앱으로 올리면 버퍼 한도와 무관해진다.

## 면접 체크포인트

- 간헐적으로만 나는 507의 원인은? → retry buffer 한도. 평소엔 streaming으로 통과하고, retry가 필요한 순간에만 replay 불가로 실패. 413(항상 실패)과의 간헐성 차이로 구별.
- 프록시 retry의 숨은 비용은? → body replay를 위한 버퍼링. retry 정책은 latency 재시도만이 아니라 메모리와 payload 크기 제약을 함께 가져온다.
- retry를 프록시와 클라이언트 중 어디에 둘까? → 멱등성 판단 주체가 기준. 프록시는 요청의 의미를 모르므로 안전한 재시도의 최종 책임은 클라이언트 쪽이 명시적이다.

## 관련 문서

- [[Istio-Ambient-Stale-Connection|Stale Connection과 503]] — 이 retry 정책이 도입된 배경 (완화책이 만든 2차 함정)
- [[Istio-Ambient-Mode|Istio Ambient Mode]] — waypoint(Envoy) 구조
- [[External-Service-Resilience|외부 서비스 Resilience]] — retry와 멱등성의 일반 원칙
- [[Idempotent-Consumer|Idempotent Consumer]] — 중복 처리 방어 패턴

## 출처

- [Istio Ambient Mode 3-4편: 507 status code와 istiod disconnected 탐지 — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/e92ce438)
