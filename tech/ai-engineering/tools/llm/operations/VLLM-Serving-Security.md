---
tags: [ai, llm, vllm, serving, security]
status: done
verified_at: 2026-10-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["vLLM 서빙 보안", "vLLM Serving Security"]
---

# vLLM 서빙의 인증과 네트워크 경계

모델 실행 성공과 외부 공개 준비는 별개다. 2026-10-22 공식 `latest` 보안 문서 기준이며, 특정 설치 버전의 동작을 시험한 결과는 아니다.

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

## 배포 전 확인 질문

다음은 공식 권고를 배포 검수에 옮긴 제안이다.

1. 프록시를 우회해 원본 서버와 내부 포트에 접근할 수 있는가?
2. 키 없는 요청과 비허용 경로가 실제로 차단되는가?
3. 추론 사용자가 LoRA 변경 권한까지 갖게 되지는 않는가?

## 출처

- [vLLM, Security](https://docs.vllm.ai/en/latest/usage/security/) — API 키 범위, 내부 통신과 동적 LoRA 적재 조건 대조.

## 관련 문서

- [[LLM-Gateway|LLM 게이트웨이]]
- [[LLM-Inference-Bottlenecks|추론 병목과 부하 측정]]
- [[LLM-Generation-Mechanics-Training|모델 학습과 LoRA]]
