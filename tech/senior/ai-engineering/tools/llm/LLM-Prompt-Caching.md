---
tags: [senior, ai, llm, prompt-caching, cost, bedrock]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["LLM Prompt Caching", "프롬프트 캐싱", "Prompt Caching"]
verified_at: 2026-07-16
---

# LLM 프롬프트 캐싱 (Prompt Caching)

프로바이더가 프롬프트 앞부분(prefix)의 연산 결과(KV 상태)를 저장해 두고, 같은 prefix로 시작하는 다음 요청에서 재사용하는 기능이다. 모델이 동일한 내용을 다시 계산하지 않으므로 입력 비용과 첫 토큰 지연이 함께 줄고, 같은 프롬프트의 계산을 재사용할 뿐이라 응답 품질에는 영향이 없다. 큰 고정 시스템 프롬프트를 고빈도로 반복 호출하는 워크로드에서 효과가 가장 크고, 정확도 검증 부담이 없어 LLM 비용 최적화 레버 중 1순위로 검토된다.

## 동작 원리 — prefix matching

- 요청 앞부분부터 해시를 계산해 **일치하는 구간까지만** 재사용한다. 캐시 포인트(마커) 위치까지의 KV(attention Key/Value) 상태가 저장 단위다. 내부 구현은 Paged Attention 계열의 GPU 메모리 블록 해싱 방식으로 설명된다(프로바이더가 내부를 공식 문서화하지는 않는다).
- 앞부분이 조금이라도 바뀌면 그 뒤 전체가 무효화된다. 배치 원칙은 하나 — **변경 빈도가 낮은 것을 앞에, 높은 것을 뒤에**.
- 과금은 세 종류 토큰으로 나뉜다: 일반 input, cache_write(최초 적재, 기본 입력보다 프리미엄), cache_read(히트, 대폭 할인). Anthropic 기준 5분 TTL 쓰기 1.25배, 1시간 TTL 쓰기 2배, 읽기 0.1배이고, Bedrock도 읽기를 대폭 할인하는 같은 구조다(쓰기 프리미엄은 모델별 상이). 손익은 write 프리미엄을 상회하는 재사용 빈도가 전제다.
- 캐시는 계정(조직) 내부에서만 재사용되고 다른 고객과 공유되지 않는다. 시스템 프롬프트에 민감정보가 없다면 노출 우려 없이 켤 수 있다.

## 적용 절차 — 캐시 포인트는 마지막 한 줄일 뿐

1. **고정/변동 분리 (선행 구조 작업)** — 규칙, 지시문, few-shot 예시, 출력 스키마 같은 고정값은 시스템 프롬프트 블록으로, 상품 데이터와 사용자 입력 같은 변동값은 유저 메시지로 옮긴다. 이 분리가 안 돼 있으면 캐시 포인트를 추가해도 매 요청 해시가 달라져 무효화된다.
2. **캐시 포인트 설정** — Bedrock Converse API는 시스템 프롬프트 블록 뒤에 CachePointBlock을 붙이고 type(DEFAULT)과 TTL을 지정한다. Anthropic API는 cache_control 블록으로 같은 지점을 지정한다.
3. **히트율 모니터링** — cache_read, cache_write 토큰을 메트릭으로 수집한다. 캐시가 동작하지 않아도 API는 에러를 던지지 않고 cache_read가 0으로 찍힐 뿐이므로, 대시보드 없이는 실패를 인지할 수 없다.

## TTL 동작

- TTL은 **히트마다 재갱신**된다. 1시간 TTL이면 1시간 안에 같은 prefix 호출이 이어지는 한 캐시가 유지되고, 1시간 동안 히트가 없을 때만 만료된다 (AWS Bedrock 문서 기준, Anthropic도 같은 갱신 방식).
- 기본 TTL은 짧고(5분), 긴 TTL(1시간)은 쓰기 단가가 높다. 배치가 연속 실행되는 워크로드라면 긴 TTL이 워밍 상태를 유지시켜 유리하다.
- 모델별 최소 캐시 가능 토큰이 있다(Bedrock의 Claude 계열 기준 1,024~4,096 토큰으로 모델별 상이 — Opus 4.5/4.6, Sonnet/Haiku 4.5는 4,096). 미달하면 에러 없이 조용히 캐시되지 않는다.

## 활용 패턴 6가지

| 패턴 | 내용 |
|---|---|
| 시스템 프롬프트 캐싱 | 규칙, 지시, 예시 등 고정 프롬프트를 시스템 블록에 두고 캐시 |
| Tool 정의 캐싱 | 툴/함수 스펙을 앞단에 고정 배치해 캐시 |
| 대화 히스토리 캐싱 | 멀티턴에서 누적 대화를 캐시해 재처리 방지 |
| RAG 문서 캐싱 | 긴 참조 문서를 캐시해 반복 질의에 재사용 |
| Cache Warming | 병렬 발사 전 워밍 콜 1회로 캐시 선적재 |
| Relocation Trick | 시스템 프롬프트에 섞인 동적 값을 유저 메시지로 이동 |

- **Cache Warming** — 첫 요청의 cache_write가 끝나기 전에 나머지가 동시 발사되면 전부 miss가 된다. 워밍 콜 1회를 먼저 보내고 병렬 발사하면 TTL 내 동일 prefix 호출이 사실상 모두 hit로 전환된다. 워밍 콜 1회의 비용은 작고 효과는 뒤따르는 호출 전체에 미치므로 이득이 크다.
- **Relocation Trick** — 타임스탬프, 요청 ID, 사용자 ID 같은 동적 값을 시스템 프롬프트에서 유저 메시지로 옮기는 한 줄 변경. 히트율이 한 자릿수로 낮게 나올 때 거의 항상 첫 번째로 의심할 원인이다.

## 캐시를 깨뜨리는 안티패턴

| 안티패턴 | 증상 | 해결 |
|---|---|---|
| 시스템 프롬프트에 타임스탬프 | 매초 해시가 달라짐 | 동적 값은 유저 메시지로 |
| 시스템 프롬프트에 사용자 ID | 사용자마다 다른 해시 | 플레이스홀더 사용 |
| JSON 직렬화 키 순서 비일관 | 요청마다 다른 해시 | 키 정렬 강제 |
| 병렬 요청 동시 발사 | 첫 write 완료 전 전부 miss | 워밍 콜 1회 선행 |
| Tool 정의 순서 변경 | 전체 캐시 무효화 | 순서 고정(알파벳순) |
| 최소 토큰 미달 | 에러 없이 미캐시 | 모델별 최소 토큰 확인 |

코딩 에이전트 구현에서 도구 등록 순서를 고정하는 이유도 같다 — 순서가 바뀌면 시스템 프롬프트가 달라져 캐시가 무효화된다 ([[Claude-Code-Internals]]).

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

## 출처

- [LLM 비용 64% 절감, 캐시 히트율 98% 달성기 — 무신사 테크블로그 (29CM)](https://techblog.musinsa.com/llm-%EB%B9%84%EC%9A%A9-64-%EC%A0%88%EA%B0%90-%EC%BA%90%EC%8B%9C-%ED%9E%88%ED%8A%B8%EC%9C%A8-98-%EB%8B%AC%EC%84%B1%EA%B8%B0-d568135bd40e)
- [Prompt caching — Anthropic Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) (가격 배율, 최소 토큰, TTL 갱신, 조직 간 격리)
- [Prompt caching — AWS Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) (TTL 리셋, 모델별 최소 토큰, 읽기/쓰기 과금)
- [Prompt Caching: The Secret to 60% Cost Reduction in LLM Applications — Thomson Reuters Labs](https://medium.com/tr-labs-ml-engineering-blog/prompt-caching-the-secret-to-60-cost-reduction-in-llm-applications-6c792a0ac29b)
- [How we cut LLM costs with prompt caching — ProjectDiscovery](https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching)

## 관련 문서

- [[LLM-Cost-Optimization|LLM 비용 최적화 (가시성, 시뮬레이션, 레버 스택)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅 (다음 레버 — 모델 다운사이즈)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (동적 정보를 시스템 프롬프트 밖으로)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (Write/Select/Compress/Isolate, Context Rot)]]
- [[Claude-Code-Internals|Claude Code 내부 구조 (도구 순서 고정 = 캐시 친화 코드 제약)]]
