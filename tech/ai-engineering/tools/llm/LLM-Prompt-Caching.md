---
tags: [ai, llm, prompt-caching, cost, bedrock, claude-code]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Prompt Caching", "프롬프트 캐싱", "Prompt Caching", "세션 분기 캐시 재사용"]
verified_at: 2026-10-06
---

# LLM 프롬프트 캐싱 (Prompt Caching)

프로바이더가 프롬프트 앞부분(prefix)의 연산 결과(KV 상태)를 저장해 두고, 같은 prefix로 시작하는 다음 요청에서 재사용하는 기능이다. 모델이 동일한 내용을 다시 계산하지 않으므로 입력 비용과 첫 토큰 지연이 함께 줄고, 같은 프롬프트의 계산을 재사용할 뿐이라 응답 품질에는 영향이 없다. 큰 고정 시스템 프롬프트를 고빈도로 반복 호출하는 워크로드에서 효과가 가장 크고, 정확도 검증 부담이 없어 LLM 비용 최적화 레버 중 1순위로 검토된다.

## 동작 원리 — prefix matching

- 요청 앞부분부터 해시를 계산해 **일치하는 구간까지만** 재사용한다. 캐시 포인트(마커) 위치까지의 KV(attention Key/Value) 상태가 저장 단위다. 내부 구현은 Paged Attention 계열의 GPU 메모리 블록 해싱 방식으로 설명된다(프로바이더가 내부를 공식 문서화하지는 않는다).
- 앞부분이 조금이라도 바뀌면 그 뒤 전체가 무효화된다. 배치 원칙은 하나 — **변경 빈도가 낮은 것을 앞에, 높은 것을 뒤에**.
- Anthropic과 OpenAI GPT-5.6 이후 기준 과금은 세 종류 토큰으로 나뉜다: 일반 input, cache_write(최초 적재, 기본 입력보다 프리미엄), cache_read(히트, 대폭 할인). Anthropic 기준 5분 TTL 쓰기 1.25배, 1시간 TTL 쓰기 2배다. 읽기는 일반적으로 0.1배지만 Opus 5.5는 0.05배, Fable 5.1과 Mythos 5.1은 0.025배다. Bedrock도 읽기는 모델별 캐시 읽기 단가로 할인하고 쓰기는 모델에 따라 기본 입력보다 비싸게 과금하는 같은 구조다. 손익은 write 프리미엄을 상회하는 재사용 빈도가 전제다.
- **벤더별 차이(2026-10-06 공식 문서 기준)**: 켜는 방식과 과금 항목이 다르다.

| 항목 | Anthropic | OpenAI | Gemini |
|---|---|---|---|
| 활성화 | `cache_control` 명시 지점 또는 요청 최상위 자동 캐싱 | 지원 모델에서 기본 활성(`prompt_cache_options.mode` 기본 `implicit`). GPT-5.6 이후는 개발자가 지정한 명시 지점을 더하거나 `explicit` 모드로 명시 지점만 쓸 수 있다 | 2.5 이후 모델은 암묵 캐싱 기본 활성(할인 보장 없음), 명시 캐싱은 직접 만든다(할인 보장) |
| 최소 길이 | 모델별 512~4,096토큰 | GPT-5.6 이후 1,024토큰 | 3.5~3.8 Flash와 3.1 Pro Preview 4,096토큰, 2.5 Flash와 2.5 Pro 2,048토큰 |
| 쓰기 비용 | 5분 1.25배, 1시간 2배 | GPT-5.6 이후 1.25배, 이전 모델은 추가 요금 없음 | 명시 캐싱은 캐시한 토큰 수와 유지 시간에 따른 저장 요금(3.1 Pro Preview 100만 토큰당 시간당 $4.50) |
| 읽기 단가 | 기본 입력의 0.1배(Opus 5.5 0.05배, Fable 5.1과 Mythos 5.1 0.025배) | GPT-5.6 이후 0.1배(GPT-6.1 Sol 0.05배), 이전 모델은 모델별 단가(텍스트 0.1~0.5배) | 가격표의 컨텍스트 캐싱 단가는 대부분 입력의 10%(3.1 Pro Preview $0.20 대 $2.00) |
| 유지 시간 | 5분 또는 1시간, 읽을 때마다 갱신 | GPT-5.6 이후 최소 30분(`prompt_cache_options.ttl`의 유일한 값), 쓰거나 재사용할 때마다 다시 센다 | 명시 캐싱 기본 TTL 1시간 |
| 사용량 필드 | `cache_creation_input_tokens`, `cache_read_input_tokens` | `input_tokens_details`의 `cached_tokens`, `cache_write_tokens` | 응답의 `usage_metadata` |

읽기 할인은 Anthropic 현재 모델, OpenAI GPT-5.6 이후 모델과 Gemini 가격표 모델에서 90%가 기본이고 최신 일부 모델은 95~97.5%까지 깊어진다. OpenAI 이전 모델은 모델별 단가라 텍스트 토큰 가격표 기준 50~90%다. 하지만 손익은 쓰기 프리미엄이나 저장 요금과 재사용 빈도가 정한다. OpenAI API는 캐시된 토큰도 TPM 한도에 센다(Bedrock의 OpenAI 모델은 캐시 읽기를 입력 TPM에서 뺀다). 고정 내용을 앞에 두고 같은 접두사의 요청을 짧은 간격으로 보내라는 권고는 Gemini 문서에도 있다.

- 캐시는 조직 사이에 공유되지 않는다. Claude API, Claude Platform on AWS와 Microsoft Foundry에서는 같은 조직 안에서도 workspace별로 격리되고, Bedrock과 Google Cloud는 조직 단위로 격리한다. 시스템 프롬프트에 민감정보가 없다면 노출 우려 없이 켤 수 있다.

## 적용 절차 — 캐시 포인트는 마지막 한 줄일 뿐

1. **고정/변동 분리 (선행 구조 작업)** — 규칙, 지시문, few-shot 예시, 출력 스키마 같은 고정값은 시스템 프롬프트 블록으로, 상품 데이터와 사용자 입력 같은 변동값은 유저 메시지로 옮긴다. 이 분리가 안 돼 있으면 캐시 포인트를 추가해도 매 요청 해시가 달라져 무효화된다.
2. **캐시 포인트 설정** — Bedrock Converse API는 시스템 프롬프트 블록 뒤에 CachePointBlock을 붙이고 type(DEFAULT)과 TTL을 지정한다. Anthropic API는 cache_control 블록으로 같은 지점을 지정한다.
3. **히트율 모니터링** — cache_read, cache_write 토큰을 메트릭으로 수집한다. 캐시가 동작하지 않아도 API는 에러를 던지지 않고 cache_read가 0으로 찍힐 뿐이므로, 대시보드 없이는 실패를 인지할 수 없다.

## TTL 동작

- TTL은 **히트마다 재갱신**된다. 1시간 TTL이면 1시간 안에 같은 prefix 호출이 이어지는 한 캐시가 유지되고, 1시간 동안 히트가 없을 때만 만료된다 (AWS Bedrock 문서 기준, Anthropic도 같은 갱신 방식).
- Anthropic과 Bedrock의 Claude 모델은 기본 TTL이 짧고(5분), 긴 TTL(1시간)은 쓰기 단가가 높다. 배치가 연속 실행되는 워크로드라면 긴 TTL이 워밍 상태를 유지시켜 유리하다.
- 모델별 최소 캐시 가능 토큰이 있다(Claude API 기준 512~4,096 토큰으로 모델별 상이 — Opus 5.5, Sonnet 5.5, Opus 5, Fable 5와 Fable 5.1은 512, Opus 4.8과 Sonnet 5, 4.6, 4.5는 1,024, Opus 4.7은 2,048, Opus 4.5, 4.6과 Haiku 4.5는 4,096). 같은 모델도 제공 경로에 따라 다를 수 있어 Bedrock 표는 Opus 4.7을 4,096으로 적는다. 미달하면 에러 없이 조용히 캐시되지 않는다.

## 활용 패턴 6가지

| 패턴 | 내용 |
|---|---|
| 시스템 프롬프트 캐싱 | 규칙, 지시, 예시 등 고정 프롬프트를 시스템 블록에 두고 캐시 |
| Tool 정의 캐싱 | 툴/함수 스펙을 앞단에 고정 배치해 캐시 |
| 대화 히스토리 캐싱 | 멀티턴에서 누적 대화를 캐시해 재처리 방지. Anthropic API는 요청 최상위 `cache_control` 하나로 중단점을 마지막 캐시 가능 블록에 두고 대화가 길어지면 앞으로 옮기는 자동 캐싱을 제공 |
| RAG 문서 캐싱 | 긴 참조 문서를 캐시해 반복 질의에 재사용 |
| Cache Warming | 병렬 발사 전 워밍 콜 1회로 캐시 선적재 |
| Relocation Trick | 시스템 프롬프트에 섞인 동적 값을 유저 메시지로 이동 |

- **Cache Warming** — 캐시 항목은 첫 요청의 응답이 시작된 뒤에야 쓸 수 있으므로, 그 전에 나머지를 동시 발사하면 전부 miss가 된다. 워밍 콜 1회를 먼저 보내고 병렬 발사하면 TTL 내 동일 prefix 호출이 사실상 모두 hit로 전환된다. 워밍 콜 1회의 비용은 작고 효과는 뒤따르는 호출 전체에 미치므로 이득이 크다.
- **Relocation Trick** — 타임스탬프, 요청 ID, 사용자 ID 같은 동적 값을 시스템 프롬프트에서 유저 메시지로 옮기는 한 줄 변경. 히트율이 한 자릿수로 낮게 나올 때 거의 항상 첫 번째로 의심할 원인이다.

## 캐시를 깨뜨리는 안티패턴

| 안티패턴 | 증상 | 해결 |
|---|---|---|
| 시스템 프롬프트에 타임스탬프 | 매초 해시가 달라짐 | 동적 값은 유저 메시지로 |
| 시스템 프롬프트에 사용자 ID | 사용자마다 다른 해시 | 플레이스홀더 사용 |
| JSON 직렬화 키 순서 비일관 | 요청마다 다른 해시 | 키 정렬 강제 |
| 병렬 요청 동시 발사 | 첫 응답 시작 전 전부 miss | 워밍 콜 1회 선행 |
| Tool 정의 순서 변경 | 전체 캐시 무효화 | 순서 고정(알파벳순) |
| 최소 토큰 미달 | 에러 없이 미캐시 | 모델별 최소 토큰 확인 |

코딩 에이전트 구현에서 도구 등록 순서를 고정하는 이유도 같다 — 순서가 바뀌면 시스템 프롬프트가 달라져 캐시가 무효화된다 ([[Claude-Code-Internals]]). 단, Opus 4.8, Opus 5, Opus 5.5, Sonnet 5.5와 Fable, Mythos 5 계열은 대화 중 도구 변경(베타, Claude API는 `inline-tools-2026-09-15` 헤더)으로 `tools` 배열을 그대로 둔 채 도구를 추가하거나 거둘 수 있어 캐시가 유지된다 ([[Claude-Opus-5|Claude Opus 5]]).

## 세션 분기로 공통 맥락 재사용

에이전트 워크플로우는 기획, 구현, 리뷰처럼 단계마다 같은 명세와 코드를 다시 읽는 경우가 많다. 세션 분기(fork)는 이 공통 읽기를 한 번만 계산하고 이후 단계에서는 캐시 읽기 단가로 재사용하게 하는 수단이다. 아래 Claude Code 동작은 2026-10-05 공식 문서 기준이다.

- **원리**: fork는 부모의 시스템 프롬프트, 도구, 모델과 대화 기록을 그대로 물려받으므로 첫 요청이 부모의 캐시를 읽는다. 자기 시스템 프롬프트와 도구로 새로 시작하는 일반 서브에이전트는 prefix가 달라 부모 캐시를 읽지 못한다. 재개한 세션도 대화 전체를 다시 보내 바뀌지 않은 앞부분을 캐시 수명 안에서 읽고, 재개할 때 `--fork-session`을 붙이면 원래 세션 대신 새 ID로 이어 가므로 같은 세션에서 여러 번 갈라질 수 있다.
- **seed 세션**: 명세, 위키와 관련 코드를 읽는 공통 작업을 seed 세션에서 먼저 끝내고, 단계마다 seed에서 갈라져 작업한 뒤 그 분기는 버린다. 공통 읽기는 seed에서 한 번 계산되고, 분기 안의 도구 호출과 중간 작업은 다음 단계로 섞이지 않는다. 다만 대화 안에서 띄운 fork는 최종 결과가 부모 대화에 붙으므로 그 뒤의 분기는 앞 단계의 결과를 물려받는다. 캐시 공유와 오염 차단 사이의 트레이드오프([[Claude-Code-Extension-Reference|포크와 격리 서브에이전트]])를 seed 경계에서 나누는 구성이다.
- **같은 seed를 쓸 수 있는 조건**: 캐시는 모델마다 따로 있어 다른 모델로 이어 가면 대화 전체를 다시 처리하고, 도구 정의가 바뀌면 캐시 전체가 무효화된다. effort 변경도 대부분의 모델에서 캐시를 새로 만들지만 Opus 5.5, Sonnet 5.5와 Fable 5.1은 API 키나 구독으로 쓸 때 기본적으로 캐시가 유지된다(Bedrock, Google Cloud, Claude apps gateway 경로와 일부 설정 제외). 그래서 다른 모델이나 다른 도구 셋을 쓰는 리뷰어는 seed를 따로 둔다([[LLM-Model-Tiers#티어별 역할 분리와 상호 검토|모델 경계의 캐시 손실]]).
- **TTL**: 캐시를 읽는 요청마다 수명이 다시 시작되므로, 단계 사이에 사람 확인처럼 TTL보다 긴 공백이 생기면 다음 분기의 첫 요청은 seed 구간을 처음부터 다시 처리해 캐시에 쓴다. Claude Code는 구독 사용량 안에서 메인 대화와 서버가 정하는 일부 보조 요청에만 1시간 TTL을 요청하고 서브에이전트와 대화 안에서 띄운 fork 같은 나머지 요청은 5분이 기본이며, API 키와 클라우드 제공자 경로는 둘 다 5분이다. `promptCacheTtl`과 `subagentPromptCacheTtl`로 1시간을 고를 수 있지만 쓰기 단가가 2배이므로 공백의 길이와 함께 판단한다.
- **독립성**: seed에 담긴 해석과 오해도 모든 분기가 물려받는다. 리뷰어가 작업자의 seed에서 갈라지면 그 해석을 공유해 독립 검토의 이점이 줄어드므로, 리뷰어 seed는 작업자의 정리본이 아니라 명세와 코드 같은 원자료로 만든다([[Harness-Anatomy#세 기둥|분리의 축은 컨텍스트]]).
- **측정**: 멀티턴 에이전트 세션은 매 턴이 직전 요청 전체를 prefix로 다시 보내므로 분기가 없어도 적중률이 높게 나온다. 적중률만으로 분기 효과를 판단하지 말고, 같은 작업을 seed 없이 돌린 실행과 `cache_creation_input_tokens`, `cache_read_input_tokens`, `input_tokens`를 단가로 환산해 비교한다. Claude Code `/usage`의 `Prompt cache (main)` 줄은 메인 대화 기준이므로 분기까지 합산할 때는 응답의 사용량 필드나 OpenTelemetry 지표를 모으고, 로컬 기록을 합칠 때는 fork가 부모 기록을 replay할 수 있어 생기는 중복을 제거한다([[AI-Coding-Agent-Usage-Telemetry]]).
- **Codex**: Codex CLI도 `/fork`로 대화를 분기하고 서브에이전트에 넘길 부모 이력을 `fork_turns`로 정한다([[Codex-CLI#Subagent 컨텍스트 범위|Codex 서브에이전트 컨텍스트]]). 분기의 캐시 재사용 조건은 2026-10-05 Codex 공식 문서에서 확인하지 못했으므로 사용량 기록으로 확인한다.

## 구독형 앱의 캐시와 사용량 한도

API의 토큰 단가와 구독형 앱의 사용량 차감은 구분한다. 2026-10-08 Claude 공식 도움말 기준, 프로젝트 지식에 올린 자료는 캐시가 살아 있는 동안 재사용하면 새 내용보다 사용량 한도에서 적게 차감된다. 일정 기간 사용하지 않아 캐시가 만료되면 다음 첫 메시지에서는 해당 내용이 다시 전부 산입된다. 이 안내에는 정확한 만료 시간이나 할인율이 없으므로 API의 TTL과 가격 배율을 그대로 적용하지 않는다.

- 관련 질문은 한 메시지에 묶고 반복 참조할 문서는 프로젝트 지식에 두는 방식을 공식 도움말이 권한다. 서로 무관한 작업까지 한 대화에 누적하라는 뜻은 아니다.
- 사용량 한도는 일정 시간 동안의 이용량이고, 길이 한도는 한 대화의 컨텍스트 크기다. 새 대화를 여는 것은 길이 문제를 줄이는 방법이며 이미 소비한 사용량을 초기화하는 방법은 아니다.
- 프로젝트 RAG는 관련 자료를 골라 문맥에 넣는 방식이다. 캐시의 재사용 차감과 컨텍스트 선별을 같은 기능으로 해석하지 않는다.

캐시의 지속 시간, 재사용되는 자료와 실제 작업량이 다르므로 한 번 업로드하면 이후 계속 같은 양이 할인된다고 계산하지 않는다. Claude Code의 작업 전환과 `/clear`는 [[Claude-Code-Fundamentals#컨텍스트 관리|컨텍스트 관리]]를 따르고, API 비용 계산은 위의 제공자별 과금 기준으로 분리한다.

## 효과 사례

- 15K 토큰 고정 시스템 프롬프트에 2K 변동 데이터를 붙여 배치로 고빈도 호출하는 속성 추출 워크로드: 고정/변동 분리 후 1시간 TTL 캐시 포인트 적용, 1주 실측 캐시 히트율 98%. 이 입력 비용 방어가 전체 청구액 절감으로 이어진 파레토 구조는 [[LLM-Cost-Optimization|LLM 비용 최적화]] 참고.
- 이 패턴에서는 배치 시작 시점의 첫 호출(또는 만료 후 첫 호출)만 cache_write가 되고, TTL이 히트마다 갱신되는 동안 이어지는 호출은 전부 cache_read다.
- 외부 보고 사례: 프롬프트 캐싱으로 약 60% 비용 절감을 보고한 Cache Warming 대표 사례(Thomson Reuters Labs, 워밍 전 초기 히트율 4.2%), 히트율을 7%에서 84%까지 올린 사례(ProjectDiscovery — 최대 지렛대는 Relocation Trick으로 한 번의 배포에서 74%까지, 나머지는 후속 최적화).

## 면접 체크포인트

- prefix matching 원리 — 앞이 바뀌면 뒤 전체가 무효, 그래서 변경 빈도 낮은 것을 앞에 배치
- cache_write 프리미엄과 cache_read 할인 과금 구조, 손익이 성립하는 조건 (재사용 빈도)
- 캐시 포인트 추가 전에 고정/변동 분리가 선행돼야 하는 이유
- 캐시 실패가 침묵하는 이유와 모니터링 방법 (cache_read 메트릭이 0인지 확인)
- TTL이 히트마다 갱신되는 동작과 TTL 길이 선택 기준 (호출 간격 vs 쓰기 단가)
- 병렬 발사 워크로드에서 워밍 콜이 필요한 이유
- 세션 분기가 부모 캐시를 읽는 조건(같은 모델과 도구, 캐시 수명)과 높은 적중률만으로 분기 효과를 판단하면 안 되는 이유
- 벤더마다 캐시 활성화 방식(명시 지점, 자동 또는 암묵 캐싱과 그 조합)과 쓰기, 저장 과금이 달라 읽기 할인율만으로 비교할 수 없는 이유

## 출처

- [Claude Help Center, Usage limit best practices](https://support.claude.com/en/articles/9797557-usage-limit-best-practices)
- [Claude Help Center, How do usage and length limits work?](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)
- [LLM 비용 64% 절감, 캐시 히트율 98% 달성기 — 무신사 테크블로그 (29CM)](https://techblog.musinsa.com/llm-%EB%B9%84%EC%9A%A9-64-%EC%A0%88%EA%B0%90-%EC%BA%90%EC%8B%9C-%ED%9E%88%ED%8A%B8%EC%9C%A8-98-%EB%8B%AC%EC%84%B1%EA%B8%B0-d568135bd40e)
- [Anthropic Docs, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) (가격 배율, 최소 토큰, TTL 갱신, 조직과 workspace 격리, 무효화 조건, 사용량 필드, 자동 캐싱)
- [Anthropic Docs, Mid-conversation system messages](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) (대화 중 도구 변경 지원 모델과 베타 헤더)
- [AWS Bedrock User Guide, Prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) (TTL 리셋, 모델별 최소 토큰, 읽기/쓰기 과금, OpenAI 모델의 `implicit` 기본 모드, 캐시 읽기의 입력 TPM 제외)
- [OpenAI API Docs, Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) (기본 활성, 최소 토큰, 30분 TTL, 쓰기와 읽기 배율, 사용량 필드, TPM 산입)
- [OpenAI API Docs, Pricing](https://developers.openai.com/api/docs/pricing) (GPT-6 계열 캐시 읽기와 쓰기 단가)
- [Gemini API Docs, Context caching](https://ai.google.dev/gemini-api/docs/caching) (암묵 캐싱 기본 활성)
- [Gemini API Docs, Context caching (generateContent)](https://ai.google.dev/gemini-api/docs/generate-content/caching) (모델별 최소 토큰, 기본 TTL, 암묵 캐시 적중 권고)
- [Gemini API Docs, Pricing](https://ai.google.dev/gemini-api/docs/pricing) (컨텍스트 캐싱 단가와 저장 요금)
- [Claude Code Docs, How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching) (모델별 캐시, effort 변경, TTL 버킷, fork와 재개의 캐시 재사용, 적중률 확인)
- [Claude Code Docs, Create custom subagents](https://code.claude.com/docs/en/sub-agents) (fork가 물려받는 것과 부모 캐시 재사용)
- [Claude Code Docs, CLI reference](https://code.claude.com/docs/en/cli-reference) (`--fork-session`)
- [Claude Code Docs, Manage costs effectively](https://code.claude.com/docs/en/costs) (`Prompt cache (main)` 줄의 집계 범위)
- [Prompt Caching: The Secret to 60% Cost Reduction in LLM Applications — Thomson Reuters Labs](https://medium.com/tr-labs-ml-engineering-blog/prompt-caching-the-secret-to-60-cost-reduction-in-llm-applications-6c792a0ac29b)
- [How we cut LLM costs with prompt caching — ProjectDiscovery](https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching)
- [현 시점 가장 꺼드럭 거릴 수 있는, "AI 활용의 정점" 을 보여드리겠습니다 - \[잡담\] AI 활용 설명회 — YouTube, Uzchowall](https://www.youtube.com/watch?v=woSiT_kytXo) — 2026-09-19, 작업자와 리뷰어의 seed 세션을 분기해 쓰는 구성과 단계별 캐시 적중률은 화자의 경험적 사례이고 분기 없는 실행과 비교하지 않았다고 화자가 밝힘, 비용 절감의 근거로 사용하지 않음

## 관련 문서

- [[LLM-Cost-Optimization|LLM 비용 최적화 (가시성, 시뮬레이션, 레버 스택)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅 (다음 레버 — 모델 다운사이즈)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (동적 정보를 시스템 프롬프트 밖으로)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (Write/Select/Compress/Isolate, Context Rot)]]
- [[Claude-Code-Internals|Claude Code 내부 구조 (도구 순서 고정 = 캐시 친화 코드 제약)]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목 (프리필과 디코드의 병목 차이)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (포크 서브에이전트와 격리 서브에이전트의 트레이드오프)]]
- [[Harness-Engineering|하네스 엔지니어링 (역할별 파이프라인과 자동화 비용)]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리 (fork replay 중복 제거)]]
