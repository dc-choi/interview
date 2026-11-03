---
tags: [reliability, trading-api, idempotency, reconciliation]
status: done
verified_at: 2026-10-07
category: "Reliability"
aliases: ["Trading API Execution Safety", "증권 API 주문 실행 경계"]
---

# 증권 API 주문 실행 경계

증권 API 연동은 시세 조회, 주문 접수, 체결 확인을 구분한다. 주문 식별자를 받았다는 사실만으로 체결 완료를 처리하지 않는다.

## 공식 명세에서 확인할 계약

2026-10-07 확인한 토스증권 OpenAPI 1.2.19의 REST 명세 기준이다. 실제 계좌 호출은 수행하지 않았다.

| 경계 | 명세의 계약 |
|---|---|
| 범위 | 계좌와 국내/미국 주식 자산 조회, 주문 생성/정정/취소 지원 |
| 인증 | OAuth 2.0 Client Credentials. 토큰 재발급은 이전 토큰을 즉시 무효화 |
| 계좌 선택 | 계좌별 요청에 `X-Tossinvest-Account` 필요 |
| 중복 방지 | `clientOrderId`는 선택값. 생략하면 매 요청이 별도 주문 |
| 보존 기간 | 같은 키의 결과 재사용은 10분. 이후에는 같은 키도 새 주문으로 처리 |
| 한도 초과 | `429` 응답의 `Retry-After`는 재시도 권장 초 |

같은 `clientOrderId`로 다른 주문 내용을 보내면 충돌 오류가 발생한다. REST 명세와 실시간 스트리밍의 AsyncAPI 명세는 별개다.

## 설계에 적용하기

다음은 위 계약을 이용한 설계 기준이며, 제공사의 자동 보호 기능을 뜻하지 않는다.

1. 주문 의도와 키를 전송 전에 저장한다. 타임아웃 뒤 새 키를 만들어 재전송하지 않는다.
2. 응답 유실은 실패 확정이 아니다. 주문 내역과 체결 상태를 대사하고, 확인 불가는 보류한다.
3. 10분을 넘긴 재시도는 중복 방지가 유지된다고 가정하지 않는다. `Retry-After`도 주문 재실행의 안전성을 보장하지 않는다.
4. 토큰 갱신을 조정해 여러 작업자가 서로의 토큰을 무효화하는 상황을 피한다.
5. 조회 도구와 주문 도구의 실행 권한을 구분한다. 사람이 승인하는 설계라면 계좌, 종목, 방향과 수량/금액을 승인 대상에 포함한다.

## 모의투자와 실전투자의 설정 경계

2026-11-03 한국투자증권의 공개 예제와 개발자센터만 추가 대조했다. 위 토스증권의 멱등성 보존 기간과 토큰 정책을 다른 증권사에 그대로 적용하지 않는다.

- 공식 예제는 실전용과 모의용 App key, secret 및 계좌를 나누고 REST 서버 주소도 구분한다. 인증 예제의 `svr="prod"`는 실전, `svr="vps"`는 모의 환경이다.
- 국내주식 현금 주문 예제의 `env_dv="real"`과 `env_dv="demo"`는 각각 다른 거래 ID를 고른다. 인증 서버 선택과 주문 함수의 환경 선택은 별도 인자이므로 한쪽만 바꿨다고 전환이 끝났다고 보지 않는다.
- 같은 예제는 주문 수량과 단가를 문자열로 전달하고 POST 본문의 키를 대문자로 쓰도록 명시한다. 이 형식을 다른 공급사의 API 계약으로 일반화하지 않는다.
- 개발자센터는 모의투자 계좌의 만료로 주문이 거절될 수 있으며 API 유효기간과는 별개라고 안내한다. 모의 계좌와 실전 계좌를 혼동하지 않았는지 확인한다.

적용 제안: 실행 전에 환경, 인증 정보의 종류, 계좌와 주문 거래 ID가 한 묶음으로 맞는지 검증하고 불일치하면 전송을 막는다. 예제 열람은 모의 주문 성공이나 실전 안전성을 증명하지 않는다. 실제 인증과 주문 호출, 호출 한도 및 모든 주문 유형의 모의 지원은 확인하지 않았다.

## 이해 점검

- 주문 요청이 타임아웃 난 뒤 15분 후 같은 키로 재전송하면 왜 위험한가?
- 주문 접수와 체결 완료를 각각 어떤 근거로 판단하는가?

## 출처

- [한국투자증권, KIS Developers](https://apiportal.koreainvestment.com/)
- [Open Trading API — 한국투자증권](https://github.com/koreainvestment/open-trading-api) — 인증 예제의 실전/모의 환경 선택
- [Open Trading API 설정 예제 — 한국투자증권](https://github.com/koreainvestment/open-trading-api/blob/main/kis_devlp.yaml)
- [국내주식 현금 주문 예제 — 한국투자증권](https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/order_cash/order_cash.py)
- [토스증권, OpenAPI REST 명세](https://openapi.tossinvest.com/openapi-docs/latest/openapi.json)

## 관련 문서

- [[External-API-Integration-Patterns|외부 API 연동 실전 패턴]]
- [[Idempotency|HTTP 멱등성]]
- [[Retry-Backoff-Jitter|재시도와 백오프]]
