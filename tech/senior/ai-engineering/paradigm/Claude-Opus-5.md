---
tags: [senior, ai, llm, claude, api, model]
status: done
verified_at: 2026-07-27
category: "시니어역량(SeniorEngineer)"
aliases: ["Claude Opus 5", "Opus 5"]
---

# Claude Opus 5

Claude Opus 5는 Opus 4.8의 후속으로 2026-07-24 출시된 Opus 라인 최상위 모델이다. 가격은 Opus 4.8과 같은 수준을 유지하면서, 상위 티어인 [[Claude-Fable-5-Mythos-5|Fable 5]]의 절반 가격으로 다수 에이전트, 코딩 평가에서 Fable 5에 근접하거나 능가하는 결과를 낸다. 같은 가격에 갈아 끼우는 drop-in 업그레이드로 포지셔닝되지만, 사고(thinking) 기본값과 검증 거동이 바뀌어 통합 코드와 프롬프트의 재조정 지점이 있다.

## 사양과 가격 (2026-07-24 출시 시점)

| 항목 | 값 |
|---|---|
| API ID | `claude-opus-5` (Bedrock은 `anthropic.claude-opus-5`) |
| 컨텍스트 윈도우 | 100만 토큰 (기본값이자 최대) |
| 최대 출력 | 요청당 128k 토큰 (동기 Messages API 기준, Batch API는 베타 헤더로 300k) |
| 가격 | 입력 $5, 출력 $25 (100만 토큰당, Opus 4.8과 동가) |
| Fast mode | 약 2.5배 출력 속도, 기본가의 2배($10/$50), Claude API 한정 연구 프리뷰 (서드파티 클라우드 제외, Claude Code는 사용 크레딧, 접근 신청 필요) |
| 프롬프트 캐시 최소 | 512 토큰 (Opus 4.8의 1024에서 절반으로 축소) |
| 레이트리밋 | Opus 4.x 통합 풀과 별도 버킷 |
| 가용 플랫폼 | Claude API, Amazon Bedrock, Vertex AI, Microsoft Foundry와 소비자 서피스(Claude.ai, Claude Code 등) |

## API 거동 변화 (vs Opus 4.8)

### 사고가 기본으로 켜짐

`thinking` 파라미터를 생략하면 적응형 사고로 동작한다. Opus 4.8/4.7에서는 생략이 사고 없음이었으므로 조용한 비용, 잘림 변화다. `max_tokens`는 사고와 응답 텍스트를 합산한 상한이라, 응답 크기에 딱 맞게 잡아둔 기존 `max_tokens`는 응답이 중간에 잘릴 수 있다.

### 사고 비활성화는 effort high 이하에서만

`thinking: {"type": "disabled"}`는 effort `high` 이하에서만 허용되고, `xhigh`/`max`와 조합하면 400을 반환한다. 검증은 요청 단위라 대화 중간에 effort만 올려도 거부된다. 사고를 끈 채 두면 도구 호출이 텍스트로 새거나 내부 태그가 응답에 누출되는 실패 모드가 보고되어, 지연이 민감하면 사고를 끄는 대신 effort `low`/`medium`으로 낮추는 쪽이 권장된다.

### 그 외 요청 표면

- 원시 사고 과정은 반환되지 않는다. `thinking.display` 기본값은 `omitted`(빈 사고 블록)이고 `summarized`로 요약을 받을 수 있다 — 정책 상세는 [[Claude-Fable-5-Mythos-5|Fable 5 문서]]가 정본이다.
- `budget_tokens`, `temperature`/`top_p`/`top_k`, 마지막 assistant 턴 프리필은 Opus 4.7 이후와 같은 400. 사고 깊이는 `effort`(low, medium, high, xhigh, max, 기본 high — Claude API와 Claude Code 기준)로 제어한다.
- `low`/`medium`이 상위 effort 대비 일부 토큰과 지연으로 강한 품질을 낸다는 것이 벤더 권고다. effort 스윕이 비용 최적화의 1차 레버이며, 이전 모델에서 옮겨온 effort 기본값을 그대로 쓰지 않는다.
- drop-in이라도 가용성 예외가 있다. Priority Tier는 Opus 5를 지원하지 않고(Opus 4.8은 유지), web fetch 서버 도구는 제공되지 않는다.

## 출시 동반 신규 API 기능 (베타)

- **자동 폴백 라우팅** — 서버 측 `fallbacks` 파라미터 자체는 Fable 5 출시 때 도입됐고(Claude API 베타, Bedrock과 Vertex, Foundry 미지원), Opus 5와 함께 `"default"` 모드가 추가됐다. 안전 분류기가 요청을 거부하면(`stop_reason: "refusal"`, HTTP 200) 거부 카테고리에 따라 권장 대체 모델로 자동 재실행하며, 사이버 카테고리 거부는 Opus 4.8로 라우팅된다. 특정 모델을 고정하는 배열 형태보다 default가 권장된다 — 어떤 대체가 맞는지는 거부 사유에 달려 있고, 고정 모델의 은퇴 마이그레이션 부담도 없다.
- **대화 중 도구 변경(mid-conversation tool changes)** — 기존에는 `tools` 배열을 수정하면 프롬프트 접두사가 바뀌어 캐시 전체가 무효화됐다. 전체 도구를 `tools`에 미리 선언하되 `defer_loading: true`인 도구는 숨겨져 있다가 system 메시지의 `tool_addition` 블록으로 노출되고, `tool_removal`은 이미 노출된 도구를 회수한다 — 캐시를 유지한 채 도구 셋이 바뀐다. 모드 전환이나 권한 회수처럼 애플리케이션이 도구 셋 변경을 결정하는 경우를 위한 기능으로, 모델이 스스로 찾게 하는 tool search와 구분된다.

## 성능 위치 (출시 시점 벤더 발표 수치)

| 평가 | 결과 |
|---|---|
| Frontier-Bench v0.1 (코딩) | 전 모델 최고, Opus 4.8의 2배 이상 성능을 더 낮은 작업당 비용으로 |
| CursorBench 3.2 (최대 effort) | Fable 5 최고점 대비 0.5% 이내, 작업당 비용은 절반 |
| ARC-AGI 3 | 차순위 모델의 3배 점수 |
| Zapier AutomationBench | 같은 작업당 비용에서 차순위 모델의 약 1.5배 통과율 |
| OSWorld 2.0 (컴퓨터 사용) | Fable 5 최고 기록 상회, 비용은 약 3분의 1 |
| 유기화학, 단백질 기능 예측 (내부 평가) | Opus 4.8 대비 각각 +10.2%p, +7.7%p |

벤더 자체 발표 수치라는 한계는 있지만, 일관된 메시지는 절대 성능보다 **성능 대비 비용 곡선의 이동**이다. 플래그십(Fable 5)의 절반 단가로 근접 성능이 나오면 [[LLM-Model-Tiers|모델 라우팅]]의 티어 배치를 재평가할 트리거가 된다.

## 거동 특성 — 프롬프트 재조정 지점

- **자기 검증 내장**: 시키지 않아도 자기 작업을 검증한다. 이전 모델용으로 넣어둔 검증 지시(최종 검증 단계를 넣어라, 서브에이전트로 검증하라)를 그대로 두면 과잉 검증을 유발하므로 중복 지시는 제거한다. 정확성이 중요한 작업에서 독립 검증 설계 자체를 없애라는 뜻이 아니다 — 검증의 우선성이라는 [[Harness-Engineering|하네스 원칙]]은 유지되고, 모델이 이미 하는 검증을 지시로 반복하지 말라는 것이다. 답을 재확인하라는 self-check 프롬프트 관행이 이 모델에서는 역효과라는 점이 특이하다 — 프롬프트 라이브러리에 모델별 예외가 필요해진다.
- **응답과 산출물이 길어짐**: 사용자 대면 텍스트와 파일 산출물(보고서, 문서) 모두 기본 길이가 늘었다. `effort`를 낮춰도 가시 출력 길이가 안정적으로 줄지는 않아, 간결성은 프롬프트로 지시한다.
- **범위 확장 경향**: 요청하지 않은 단계를 추가하거나 작업을 재해석할 수 있어, 요청한 범위를 지키라는 지시가 유효하다.
- **서브에이전트 위임 증가**: 위임을 꺼리던 Opus 4.8과 반대 방향이다. 4.8용으로 넣었던 위임 장려 지시는 빼고, 비용이 민감하면 위임 상한을 명시한다.

## 안전

- 세이프가드는 Opus 4.8 수준을 기본으로 하되 좁은 범위의 사이버 작업에만 더 강한 가드레일을 얹는다. 사이버 분류기 개입은 Fable 5 대비 약 85% 적을 것으로 예상한다는 것이 벤더 발표다 — 소스 코드 취약점 탐지는 허용하고 바이너리 취약점 스캔, 침투 테스트, 익스플로잇 생성은 차단하는 구분이다. 분류기 거부는 에러가 아니라 정상 응답의 종료 사유(`stop_reason: "refusal"`)로 오므로 응답 분기에서 처리한다 — 처리 패턴은 [[Claude-Fable-5-Mythos-5|Fable 5 문서]]와 같다.
- 자동 행동 감사에서 종합 비정렬 점수 2.3으로 최근 모델 중 최저(낮을수록 정렬됨)를 기록했다고 발표됐다. 생물학 연구와 공격적 사이버 역량은 Mythos 5보다 낮게 유지된다 — 취약점 식별률은 비슷해도 익스플로잇 개발 성공률이 크게 낮다.

## 면접, 적용 포인트

- 상위 티어 절반 가격에 근접 성능이라는 세대 갱신 패턴 — 모델 선택을 고정하지 말고 eval 재측정으로 라우팅을 갱신하는 근거 ([[LLM-Model-Tiers|티어 구조]]).
- 레이트리밋이 별도 버킷이라 기존 Opus 트래픽을 옮겨도 한도가 승계되지 않는다 — 대량 전환 전 한도 확인이 마이그레이션 체크리스트에 들어간다.
- 사고 기본 켜짐과 `max_tokens` 합산 상한 — 파라미터 기본값 변경이 조용한 비용, 잘림 변화를 만드는 사례. 모델 교체 시 기본값 차이를 diff하는 습관.
- 검증 스캐폴딩 제거 — 모델 세대가 오르면 이전 모델의 약점을 보완하던 프롬프트가 부채로 반전된다. 프롬프트도 버전별 A/B와 정리 대상이라는 관점.
- 캐시 무효화 없는 도구 변경 — 프롬프트 캐싱의 접두사 불변 제약([[LLM-Prompt-Caching|프롬프트 캐싱]])을 API 기능으로 우회하는 설계.

## 관련 문서

- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5 (상위 티어 — 거부, 폴백, 과금, 적응형 사고)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택 (티어 경제학, 라우팅, 세대 갱신 패턴)]]
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱 (접두사 불변 제약)]]
- [[Harness-Engineering|하네스 엔지니어링 (검증의 우선성 원칙)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (고가용성 워커 풀)]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (모델 선택을 갱신하는 eval)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (모델 세대와 지시 밀도 — 과잉 지시 정리)]]

## 출처

- [Introducing Claude Opus 5 — Anthropic](https://www.anthropic.com/news/claude-opus-5)
- [Model migration guide — Anthropic Platform Docs](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
- [Models overview — Anthropic Platform Docs](https://platform.claude.com/docs/en/about-claude/models/overview)
- [What's new in Claude Opus 5 — Anthropic Platform Docs](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5)
