---
tags: [ai, llm, vllm, serving, security]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["vLLM 서빙 보안", "vLLM Serving Security"]
---

# vLLM 서빙의 인증과 네트워크 경계

모델 실행 성공과 외부 공개 준비는 별개다. API 키, 내부 통신과 LoRA 적재는 2026-10-22 공식 `latest` 보안 문서, CORS와 `max_tokens` 변경은 v0.32.0 릴리스 노트, 보안 권고, 해당 PR과 2026-11-08 latest CLI 문서 기준이며, 특정 설치 버전의 동작을 시험한 결과는 아니다.

## API 키의 보호 범위를 확인한다

`--api-key` 또는 `VLLM_API_KEY`는 `/v1`, `/v2`, `/inference`, `/cohere` 접두사의 HTTP 경로를 보호한다. 같은 서버의 다른 경로까지 인증하는 설정은 아니다.

| 경로 예시 | 공식 문서의 구분 |
|---|---|
| `/v1/chat/completions` | API 키 설정 시 Bearer 인증 |
| `/invocations`, `/pooling`, `/metrics` | API 키를 설정해도 해당 인증의 보호 대상이 아님 |

실제 경로 제공 여부는 버전, 모델과 실행 옵션으로 확인한다. reverse proxy에서 필요한 경로만 허용하고 인증, 요청률 제한과 로깅을 적용한다. 나머지 경로는 차단한다.

## 내부 통신과 모델 변경 권한을 분리한다

- PyTorch Distributed와 KV 캐시 전송 등 노드 간 통신은 기본적으로 안전하지 않다. 신뢰할 수 있는 격리 네트워크와 방화벽으로 보호한다.
- 단일 호스트도 내부 통신 포트가 열릴 수 있으므로 API 포트만 확인하고 끝내지 않는다.
- 동적 LoRA 적재는 기본 비활성이며 `--enable-lora`와 `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True`가 모두 필요하다. 사용할 때는 적재/해제 경로를 신뢰하는 관리자에게만 허용한다.

## v0.32.0 업그레이드에서 바뀐 동작을 검수한다

v0.32.0(2026-10-18 릴리스)에서 HTTP 서버의 기본 허용 origin 목록이 `["*"]`에서 빈 목록으로 바뀌어, cross-origin 브라우저 접근이 기본으로 꺼졌다(#61009). 브라우저에서 직접 부르는 클라이언트가 있으면 `--allowed-origins`로 허용할 origin 목록을 지정한다. 값 형식은 설치 버전의 `vllm serve --help`로 확인한다. 서버 기동과 curl 요청이 성공해도 브라우저 요청만 막힐 수 있으므로, 업그레이드 뒤에는 실제 클라이언트 origin에서 요청을 보내 확인한다.

이 변경은 보안 권고 GHSA-vvpg-rrww-wpmh(CVE-2026-115917, CVSS 3.1 기준 3.4 Low)의 수정이다. 이전 기본값 `allowed_origins=["*"]`에서는 피해자의 브라우저가 닿는 vLLM 서버(`localhost`나 내부, VPN 주소)로 아무 origin의 웹 페이지가 요청을 보내고 응답을 읽을 수 있었다. 인증이 없는 서버라면 `GET /v1/models`로 모델을 나열하고 chat completion을 호출해 GPU 시간을 쓸 수 있다. API 키를 두어도 위 표처럼 키가 보호하지 않는 경로는 같은 방식으로 호출될 수 있다(권고와 위 표를 결합한 추론). 권고의 영향 범위는 기본 설정을 쓰는 0.32.0 이전 버전이고 별도 우회책은 적혀 있지 않다. 이전 버전을 계속 써야 하면 `--allowed-origins`를 신뢰하는 origin으로 좁히고 프록시에서 필요한 경로만 여는 방법을 검토한다(권고에 없는 운영 제안).

CORS는 브라우저가 스크립트의 cross-origin 요청에 적용하는 규칙이다. curl이나 서버 간 호출 같은 비브라우저 요청은 막지 않고, preflight가 필요 없는 단순 요청은 브라우저에서도 사전 확인 없이 전송된다. 따라서 비용이 들거나 상태를 바꾸는 경로는 origin 제한과 별도로 API 키, 프록시와 네트워크 경계로 막는다.

같은 릴리스는 `max_tokens`를 입력 공간의 예약이 아니라 출력 상한으로 다룬다(#57035). 이전에는 context 길이에서 `max_tokens`를 뺀 값을 입력 한도로 보아, context에 들어가는 prompt도 `max_tokens`가 크면 거부될 수 있었다. 이제는 그런 요청을 받아들이고 `max_tokens`를 남은 context 길이로 줄여 적용하며, prompt 자체가 context를 넘으면 여전히 거부한다. 요청 크기를 서버의 거부에 기대어 제한해 왔다면 업그레이드 때 프록시나 게이트웨이의 입력 제한을 다시 확인한다(운영 제안).

## 배포 전 확인 질문

다음은 공식 권고를 배포 검수에 옮긴 제안이다.

1. 프록시를 우회해 원본 서버와 내부 포트에 접근할 수 있는가?
2. 키 없는 요청과 비허용 경로가 실제로 차단되는가?
3. 추론 사용자가 LoRA 변경 권한까지 갖게 되지는 않는가?
4. 브라우저 클라이언트의 origin만 `--allowed-origins`에 있고, 다른 origin의 페이지는 응답을 읽지 못하는가?

## 출처

- [vLLM, Security](https://docs.vllm.ai/en/latest/usage/security/) — API 키 범위, 내부 통신과 동적 LoRA 적재 조건 대조. 2026-11-08 기준 CORS 설명은 없다.
- [v0.32.0 — vLLM GitHub Releases](https://github.com/vllm-project/vllm/releases/tag/v0.32.0) — CORS 기본값 제한(#61009)과 `max_tokens` 예약 제거(#57035)
- [Permissive default CORS origins allow cross-origin requests to the vLLM HTTP server — vLLM GitHub Security Advisory](https://github.com/vllm-project/vllm/security/advisories/GHSA-vvpg-rrww-wpmh)
- [Restrict default CORS origins — vLLM GitHub Pull Request #61009](https://github.com/vllm-project/vllm/pull/61009) — 기본 허용 origin 목록을 `["*"]`에서 빈 목록으로 변경
- [Treat max_tokens as output upper bound, not input-space reservation — vLLM GitHub Pull Request #57035](https://github.com/vllm-project/vllm/pull/57035) — 이전 입력 한도 계산, 남은 context로 줄인 `max_tokens`와 context 초과 거부 유지
- [vLLM, vllm serve](https://docs.vllm.ai/en/latest/cli/serve/) — latest 문서의 `--allowed-origins` 기본값 `[]`와 cross-origin 브라우저 접근 기본 차단
- [MDN, Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

## 관련 문서

- [[LLM-Gateway|LLM 게이트웨이]]
- [[LLM-Inference-Bottlenecks|추론 병목과 부하 측정]]
- [[LLM-Generation-Mechanics-Training|모델 학습과 LoRA]]
