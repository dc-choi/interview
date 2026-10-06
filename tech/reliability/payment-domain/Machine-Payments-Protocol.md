---
tags: [payment, agent, http, mpp, reliability]
status: done
verified_at: 2026-10-07
category: "Reliability"
aliases: ["Machine Payments Protocol", "MPP 에이전트 결제"]
---

# Machine Payments Protocol

MPP는 에이전트가 API와 유료 리소스를 프로그램으로 구매하도록 결제 조건과 증명을 교환하는 프로토콜이다. 결제 화면 없이 요청과 재시도로 연결하지만, 자금 이동은 선택한 결제 수단이 처리한다. Stripe와 Tempo가 공동 설계했으며 카드와 스테이블코인 등 여러 결제 수단을 사용할 수 있다.

2026-10-07 확인 기준으로 HTTP 인증 계약은 `draft-httpauth-payment-01`인 Internet-Draft다. 확정 RFC로 취급하지 않고 구현체와 명세 리비전을 함께 확인한다.

## 요청과 결제의 연결

1. 클라이언트가 유료 리소스를 요청한다.
2. 서버가 `402 Payment Required`와 결제 조건인 Challenge를 반환한다.
3. 클라이언트가 허용한 조건 안에서 결제를 승인한다.
4. Credential을 포함해 요청을 다시 보낸다.
5. 서버가 결제 수단별 검증과 처리를 마친 뒤 리소스를 제공한다.

HTTP에서는 인증 헤더를 사용하고, MCP 도구에서는 같은 흐름을 JSON-RPC로 전달한다. 결제 방식과 `charge`, `session`, `subscription` 같은 거래 의도는 구분한다. 각 조합의 지원 여부와 정산 조건은 구현체에서 확인한다.

## HTTP 계약

| 객체 | 전달 위치 | 역할 |
|---|---|---|
| Challenge | `WWW-Authenticate: Payment ...` | 결제 조건 제시 |
| Credential | 기본 `Authorization: Payment ...` | Challenge와 결제 수단별 증명 전달 |
| Receipt | 성공 응답의 `Payment-Receipt` | 검증과 정산 성공 기록, 반환 권고 |

위 초안은 Challenge의 `header="Payment-Authorization"`로 별도 헤더를 선택할 수도 있다. 클라이언트와 서버는 선택된 헤더를 일치시켜야 한다. 결제 성공 뒤에도 접근 정책에 따라 `403`이 가능하므로 결제와 접근 권한은 별개다.

## 재시도와 보안 경계

- TLS를 사용하고 Credential을 로그, 오류와 분석 데이터에 남기지 않는다.
- 클라이언트는 설명 문구 대신 실제 금액, 수취인, 통화와 유효 기간을 확인한다.
- 미결제 요청은 Challenge 기록 외의 상태를 바꾸지 않는다.
- 같은 Credential의 동시 요청으로 중복 정산과 중복 제공이 발생하지 않도록 제어한다. 결제 증명의 재사용 방지와 업무 요청의 멱등성을 함께 설계한다.
- `402`는 `Cache-Control: no-store`, Receipt가 있는 응답은 `private`로 보호한다. 별도 결제 헤더를 쓰면 Receipt가 없어도 해당 응답에 `private` 또는 `no-store`가 필요하다.

## 연동 판단

단건 API나 콘텐츠를 기계가 구매하는 경로에 검토할 수 있다. Stripe의 MPP 연동도 계정 준비와 지원 조건이 있으며, 프로토콜 사용만으로 모든 지역과 결제 수단이 열리지는 않는다.

설계 시 결제 완료와 업무 완료를 별도로 추적한다. 결제 뒤 서비스 응답이 유실된 상황은 [[Payment-Unknown-Outcome-and-Reversal|결과 미확인과 재시도]]의 관점으로 점검한다. 이는 연동 설계 원칙이며, MPP가 외부 정산과 내부 DB를 하나의 트랜잭션으로 만든다는 뜻은 아니다.

## 출처

- [Stripe, MPP](https://docs.stripe.com/payments/machine/mpp)
- [Cloudflare, MPP (Machine Payments Protocol)](https://developers.cloudflare.com/agents/tools/payments/mpp/)
- [IETF Datatracker, The Payment HTTP Authentication Scheme (draft-httpauth-payment-01)](https://datatracker.ietf.org/doc/draft-httpauth-payment/01/)

## 관련 문서

- [[Payment-Domain-Engineering|결제 도메인 엔지니어링]]
- [[Payment-Unknown-Outcome-and-Reversal|결과 미확인, 재시도와 망취소]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
