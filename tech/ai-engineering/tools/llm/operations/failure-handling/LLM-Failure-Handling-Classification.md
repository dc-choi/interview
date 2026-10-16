---
tags: [ai, llm, reliability, error-handling]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Failure Handling Classification", "LLM 실패 분류", "LLM 오류 응답 분류", "의미적 실패", "Semantic Failure"]
---

# LLM 실패 처리: 실패 분류와 오류 응답

LLM 호출 실패를 지속성과 범위로 나누고, 같은 상태 코드라도 오류 본문과 `retry-after`로 조치를 가르는 기준을 다룬다. 상위: [[LLM-Failure-Handling|LLM 실패 처리]].

## 정의

LLM 애플리케이션의 실패 처리는 모델 호출 경로(입력 준비, 모델 API, 스트리밍, 출력 검증, 도구 실행)에서 생기는 실패를 지속성과 범위로 나눠 재시도, 입력 축소, 다른 모델이나 경로로의 전환, 사람 이관 중 하나로 보내는 설계다. 일반 외부 API 연동과는 두 가지가 다르다.

- 기술적 실패(연결, 타임아웃, 한도, 인증)는 오류 응답으로 드러나지만 의미적 실패(잘림, 거절, 형식 위반, 근거 없는 내용, 잘못된 도구 인자)는 HTTP 200 안에서 일어난다. 상태 코드만 보는 오류 처리는 앞의 것만 잡는다.
- 같은 상태 코드가 다른 조치를 요구한다. 429는 기다리면 풀리는 속도 한도일 수도, 재시도로는 풀리지 않는 지출 한도일 수도 있다.

타임아웃 측정 범위, 벌크헤드, 서킷 브레이커 상태 전이는 [[External-Service-Resilience|외부 서비스 장애 대응]], 백오프와 지터 공식과 재시도 예산은 [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]], 멱등 키의 서버 동작은 [[Idempotency|멱등성]]을 따른다. 이 문서는 LLM 호출에서 달라지는 판단만 다루며 제공자 동작은 2026-10-06 Anthropic, OpenAI 공식 문서 기준이다.

## 동작 원리: 지속성과 범위로 나눈다

지속성에 따라 기본 대응이 정해진다.

| 분류 | 신호 | 기본 대응 |
|---|---|---|
| 일시 | 연결 오류, 타임아웃, 속도 한도, 과부하(Anthropic 529, OpenAI 503), 5xx | 상한을 둔 재시도와 `retry-after` 준수, 이어서 전환 |
| 영구 | 인증과 권한(401, 403), 잘못된 요청(400), 결제와 지출 한도, 컨텍스트 초과 | 재시도하지 않고 고칠 수 있는 사람에게 알린다. 컨텍스트 초과는 입력 축소나 더 큰 창의 모델로 푼다 |
| 의미 | 200 응답의 잘림, 거절, 스키마 위반, 근거 없는 사실, 잘못된 도구 인자 | 검증 뒤 수정 요청, 입력 축소, 사람 검토 |

범위에 따라 다른 모델로 바꿔서 풀리는지가 정해진다.

| 범위 | 예 | 통하는 대응 |
|---|---|---|
| 요청 | 형식이 잘못된 요청, 조직 정책이 내용 때문에 막은 요청 | 요청을 고친다. 다른 모델로 보내도 대개 결과가 같다(prefill, 강제 `tool_choice`처럼 모델마다 지원이 다른 기능의 400은 예외) |
| 모델 | 모델별 용량 부족, 모델별 속도 한도, 그 모델 안전 분류기의 거절(`reasoning_extraction` 제외) | 다른 모델로 전환 |
| 계정 | 키 만료나 폐기, 결제 문제, 지출 한도 | 운영자 조치. 같은 키와 계정으로는 모델을 바꿔도 실패한다 |
| 제공자 | 제공자 전체 장애, 네트워크 경로 | 다른 제공자나 장애 영역이 분리된 다른 호스팅 경로 |

Anthropic은 속도 한도를 모델별로 따로 적용하고(Fable 5.1과 Fable 5처럼 일부 계열은 합산), Claude Code 문서는 용량이 모델별로 관리되므로 529가 이어지면 다른 모델로 바꿔 계속하라고 안내한다. 반대로 Claude Code는 조직 정책 검사가 거부한 요청을 같은 모델이나 폴백 모델로 다시 보내지 않는다. 거부 원인이 모델이 아니라 요청 내용이기 때문이다.

## 상태 코드보다 오류 본문을 본다

| 상황 | Anthropic | OpenAI | 대응 |
|---|---|---|---|
| 속도 한도 | 429 `rate_limit_error`, `retry-after` 헤더 | 429 Rate limit reached | `retry-after`만큼 기다리고 동시성을 줄인다 |
| 급격한 사용량 증가 | 429 (acceleration limit) | 429 Slow down | 트래픽을 점진적으로 올린다 |
| 지출 한도(OpenAI는 크레딧 소진 포함) | 티어 월 지출 상한은 429 `rate_limit_error`, `retry-after` 없음, Messages API에서는 `error.details.error_code`가 `enforced_spend_limit_reached`. 직접 정한 지출 한도는 400(Claude Code 워크스페이스는 `retry-after`가 붙은 429일 수 있음) | 429 Credit balance exhausted, spend limit reached, usage limit reached | 재시도를 멈추고 한도를 조정한다 |
| 과부하 | 529 `overloaded_error` | 503 Model temporarily overloaded | 백오프 재시도, 다른 모델 |
| 서버 오류, 처리 시간 초과 | 500 `api_error`, 504 `timeout_error` | 500 | 제한된 재시도, 긴 요청은 스트리밍 |
| 인증, 권한, 결제 | 401, 403, 402 `billing_error` | 401, 403 | 재시도 없이 알린다 |
| 요청 크기 | 413 `request_too_large` (Messages API 32MB) | - | 입력을 줄인다 |

- Anthropic은 티어 월 지출 상한 429가 SDK 자동 재시도를 포함한 모든 재시도에서 접근이 재개될 때까지 실패한다고 밝히고, OpenAI도 결제, 지출, 쿼터 오류는 재시도로 접근이 돌아오지 않는다고 밝힌다. 상태 코드가 같아도 본문의 오류 코드와 `retry-after` 유무로 나눈다.
- Anthropic 오류 본문은 `error.type`, `error.message`와 `request_id`를 담고 type 값은 앞으로 늘어날 수 있다. SDK의 타입별 예외를 구체적인 것부터 잡고 메시지 문자열을 매칭하지 않으며, 모르는 type은 기본 분기로 보낸다.
- 모든 응답의 `request-id` 헤더(Python, TypeScript SDK는 `_request_id`)를 로그에 남겨 추적과 지원 문의에 쓴다([[Correlation-ID]]).

## 출처

- [Claude Platform Docs, Errors](https://platform.claude.com/docs/en/api/errors)
- [Claude Platform Docs, Rate limits](https://platform.claude.com/docs/en/api/rate-limits)
- [Claude Platform Docs, Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- [Claude Platform Docs, Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- [Claude Platform Docs, Python SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/python)
- [Claude Platform Docs, TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript)
- [Claude Code Docs, Error reference](https://code.claude.com/docs/en/errors)
- [OpenAI API Docs, Error codes](https://developers.openai.com/api/docs/guides/error-codes)
- [OpenAI API Docs, Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)

## 관련 문서

- [[LLM-Failure-Handling|LLM 실패 처리 (묶음 인덱스)]]
- [[LLM-Failure-Handling-Response-Validation|200 응답 검증, 입력 크기와 스트리밍]]
- [[LLM-Failure-Handling-Recovery|재시도, 폴백과 부분 완료]]
- [[External-Service-Resilience|외부 서비스 장애 대응]] — 타임아웃, 벌크헤드, 서킷 브레이커, 폴백의 범용 패턴
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]] — 백오프 공식, 단일 계층 재시도, 재시도 예산
- [[Idempotency|멱등성]] — 멱등 키의 서버 동작
- [[External-Collection-Pipeline-Reliability|외부 수집 파이프라인 신뢰성]] — 200인데 스키마가 깨지는 실패의 분류
