---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Source 호출, outbound OAuth와 webhook 실패

Functions의 외부 통신은 기본적으로 열려 있지 않다. Source의 code import와 export 설정을 구성하고 제공된 fetch/HTTP client를 사용해 proxy, 인증서와 네트워크 정책을 적용한다. URL을 잘못 결합해 host가 달라지면 HTTP 407 등 egress policy 실패가 날 수 있다.

v2/Python source alias는 code와 환경 RID를 분리한다. HTTPS source의 비밀이 아닌 attribute 접근과 비HTTP connector의 credential 접근은 서로 다른 지원 범위다. webhook 테스트가 성공해도 함수의 certificate chain 처리까지 같다는 뜻은 아니다.

## Outbound 인증

현재 API calls 문서는 v2/Python의 caller token과 authorization header 처리를 설명한다. v1에서 같은 직접 token 처리를 전제하지 않고 webhook 경로를 검토한다. deployed의 token refresh 제한, Workshop variable의 대화형 인증 불가를 확인하고 Action 또는 사전 인증 흐름을 사용한다.

중국어 `external-sources`는 이전 설명으로 OAuth 미지원 주장이 남아 있다. 현재 지원을 판단할 때 최신 API calls와 outbound application 문서에 대한 버전 차이를 표시한다.

## Webhook의 부분 성공

| 오류 | 판단 |
|---|---|
| WebhookExecutionFailedToStart | 외부 요청이 시작되지 않았다고 볼 수 있음 |
| WebhookExecutionTimedOut | 외부 효과가 없었다고 단정할 수 없음 |
| ParsingResponseFailed | 외부 실행은 성공했지만 응답 파싱 실패 가능 |
| RemoteRestApiReturnedError/RemoteApiReturnedError | connector 종류에 맞는 원격 오류 |
| 알 수 없는 새 오류 | default 처리와 관측 경로 필요 |

Query에서 쓰는 webhook은 Read API여야 한다. 화면 로드/자동 재시도에 따른 숨은 실행이 가능하기 때문이다. Write API는 의도적 Action 실행과 idempotency/복구를 설계한다. Ontology 실패가 외부 성공을 되돌리지 않는다.

게시 함수는 당시 webhook 버전을 pin하지만 Code Assist binding은 최신 webhook을 사용한다. 변경 후 함수 재게시와 소비자 업그레이드가 필요하다. OR 입출력 타입은 미지원이며 record expected fields로 계약을 명시하는 편이 안전하다.

같은 webhook 문서 안에서도 source Viewer의 import 가능 설명과 표의 `webhooks:editor` 요구가 다르다. import, publish/execute, Action 구성 권한을 나누어 실제 정책을 확인한다. Action 실행자는 source 직접 접근 대신 제출 조건을 통과하므로 구성자의 검토가 특히 중요하다.

## 출처

- [Palantir, api-calls](https://www.palantir.com/docs/foundry/functions/api-calls)
- [Palantir, python-functions-api-calls](https://www.palantir.com/docs/foundry/functions/python-functions-api-calls)
- [Palantir, external-sources](https://palantir.com/docs/zh/foundry/functions/external-sources/)
- [Palantir, webhooks](https://www.palantir.com/docs/foundry/functions/webhooks)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
