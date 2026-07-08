---
tags: [senior, ai, agent, context-engineering, token-optimization, lazy-loading]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Agent Context Budget", "컨텍스트 예산", "Context Budget", "에이전트 컨텍스트 비용"]
---

# 에이전트 컨텍스트 예산 (Context Budget) — 경계 밖에 두는 설계

프로덕션 에이전트의 핵심은 더 긴 컨텍스트 윈도우를 쓰는 것이 아니라 **모델이 볼 필요가 없는 정보를 컨텍스트 경계 밖에 두는 것**이다. 한 세션에서 수십 턴을 도는 작업 실행 에이전트는 매 턴 정보가 누적되므로, 사후 압축(compaction)이 아니라 **각 정보가 처음부터 작게 들어오도록 사전에 예산을 설계**한다.

## 비용은 어디서 누적되는가

- **매 턴 system prompt 재주입** — 스킬 문서 전체(168KB ≈ 42,000 토큰)를 매 턴 넣으면 5턴에 약 16만 토큰 누적
- **첨부 파일 inline 보관** — 파일 본문을 메시지에 넣으면 매 요청에 전체가 따라다님
- **목록성 컨텍스트** — 사용자가 가진 리소스 목록(수십 개)을 매 턴 전달하면 턴당 수천 토큰
- **agentic loop 직접 구현의 함정** — 토큰 관리, 스트리밍 파싱, 메시지 관리가 분산돼 통제 불가. 검증된 SDK(Agents SDK 류)에 loop와 session을 위임하고, **동적 정보를 system prompt 밖으로 분리하면 prompt caching도 활성화**된다

## 패턴 1 — 파일 첨부: Lazy Loading

파일 본문을 컨텍스트에 넣지 않고 **참조만 유지**한다.

- 본문은 오브젝트 스토리지(S3)에, DB에는 메타데이터만 (파일명, 크기, 키)
- 모델은 `read_file`(범위 지정), `search_file`(키워드 grep) 도구로 **필요한 범위만** 읽음
- 도구 응답 크기는 **서버 hard cap**으로 제한 — 모델의 선의에 맡기지 않는다
- 정적 참조만 남으므로 프롬프트 캐싱과도 상충하지 않음

## 패턴 2 — 목록 컨텍스트: Hybrid

작업 대상과 전체 목록을 분리한다.

- **선택된 대상(작음)은 항상 전달**, 전체 목록은 조회 도구(search)로 필요할 때만
- 프론트엔드에서 멘션 픽커로 `@이름` 선택 시 **ID를 미리 확정** — 모델이 이름을 ID로 다시 풀 필요 자체를 제거
- **검색 결과 ≠ 쓰기 대상**: 검색은 후보 제시일 뿐, 실행은 사용자가 명시적으로 선택한 대상만 허용 (오지정 방지)
- API 응답 필드 축소: 수십 개 필드 중 판단에 필요한 것만 (도구 출력 필터링의 [[Tool-Output-Filtering|사전 필터링]]과 같은 축)

## 패턴 3 — 스킬, 지침 문서: Catalog-First

- 모델에게는 **카탈로그(이름 + 한 줄 설명)만 상시 노출**
- 실제 문서 본문은 `read_skill` 도구로 필요할 때만, 역시 서버 hard cap 적용
- 모델이 여러 문서를 한 번에 통째로 읽는 탐색 폭주를 원천 차단 (just-in-time retrieval 계열)

## Compaction 대신 사전 예산 통제

사후 압축을 도입하지 않는 판단에는 근거가 있다.

- **작업 실행 에이전트는 정확한 값 보존이 필수** — 5턴 전의 리소스 ID를 재사용하고, 파일의 line range를 참조한다
- 압축은 의미는 보존하지만 **정확한 값을 잃을 수 있다** — 요약된 ID는 실행에 쓸 수 없다
- 결론: 누적된 컨텍스트를 나중에 줄이기보다 **각 tool response가 처음부터 작게** 들어오게 설계. 대화형 챗봇(의미 보존이면 충분)과 작업 실행 에이전트(값 보존 필수)는 compaction 적합성이 다르다

## 비용과 안전은 런타임이 강제한다

프롬프트는 방향 제시일 뿐이다. 지키게 만드는 것은 코드다.

- 도구 응답 크기 → 서버 hard cap
- 위험한 API 호출 → runtime policy allowlist + validator
- 실행 대상 → 사용자 명시 선택만 허용
- 모델 선택이 에이전트 완성이 아니다 — 정보 경계, 응답 크기, 호출 범위를 코드로 제한해야 비결정론적 모델을 결정론적 프로덕션 시스템에 태울 수 있다

## 면접 포인트

Q. 에이전트 토큰 비용이 턴이 갈수록 폭증한다. 어디부터 보나?
- 매 턴 재주입되는 것부터: system prompt 안의 동적 정보(스킬 문서, 목록), inline 첨부 파일. 경계 밖으로 빼고 도구로 lazy load하게 바꾼다.

Q. compaction으로 해결하면 안 되나?
- 작업 실행 에이전트는 ID, 범위 같은 정확한 값을 뒤 턴에서 재사용하므로 압축이 값을 잃으면 실행이 깨진다. 사후 압축보다 각 응답을 처음부터 작게 만드는 사전 통제가 우선이다.

Q. 모델이 알아서 조금만 읽게 프롬프트로 지시하면?
- 프롬프트는 부탁이다. 응답 크기 hard cap, allowlist, 명시 선택 강제처럼 런타임 코드로 제한해야 보장된다.

## 출처

- [사내 AI 에이전트 개선기: AI Agent의 Context 비용을 줄인 3가지 설계 패턴 — 채널톡 기술 블로그](https://tech.channel.io/kr/articles/b085ab62)

## 관련 문서

- [[Tool-Output-Filtering|도구 출력 필터링 (사전 필터링 > 사후 요약)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (Context Rot, Write/Select/Compress/Isolate)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Lazy Load, Defense in Depth)]]
- [[AI-Native-System|AI 네이티브 시스템 (부탁 vs 강제, 결정론적 제어)]]
- [[Agentic-Context-Platform|Context Provider (공급 측)]]
