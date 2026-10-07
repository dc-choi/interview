---
tags: [ai, agent, api-design, design-system, evaluation, dx]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent-Ready API Design", "에이전트 친화 API 설계", "Astryx", "Vibe Test"]
---

# 에이전트 친화 API 설계 — 사람과 AI가 같은 인터페이스로 빌드하게

라이브러리와 도구를 사람 전용으로 설계하던 관행에서, **사람과 AI 에이전트가 같은 API, 같은 문서, 같은 CLI로 빌드하도록** 설계하는 접근. 핵심 통찰은 두 사용자층이 요구하는 것이 같다는 점이다 — AI가 쓰기 쉽게 만든 모든 변경이 사람에게도 쉬워졌다. 에이전트 친화는 별도 트랙이 아니라 좋은 DX의 극한값이다.

## 설계 원칙 4가지

1. **강제보다 안내 (guidance over enforcement)**: 가드레일로 막는 대신 역량을 주고, 설계 의견은 문서와 예시에 둔다. 값을 넘기면 렌더링한다 — 에이전트가 가드레일과 싸우며 우회 코드를 만들어내는 것보다, 예측 가능하게 동작하고 컨벤션으로 유도하는 편이 결과가 좋다
2. **강하고 문서화된 컨벤션**: 모든 컴포넌트가 같은 네이밍, prop, 조합 규칙을 따르면 몇 개만 배워도 나머지가 예측된다. **낯선 API의 동작을 추론할 수 있는가**가 사람과 에이전트 공통의 생산성 변수
3. **사람과 AI에 하나의 시스템**: API, 컨벤션, 문서, CLI를 함께 설계한다. 에이전트용 문서를 따로 만들면 이중 관리와 드리프트가 생긴다
4. **측정으로 획득한 컨벤션 (earned by measurement)**: 컨벤션을 주장하지 않고 테스트한다. 결과를 느슨하게 쥐고, 반증하는 상황이 나오면 재검토한다

## 공용 인터페이스로서의 CLI

문서, 검색, 템플릿, 마이그레이션 codemod를 터미널 명령 + typed JSON API + programmatic import 세 표면으로 노출하되 셋이 같은 데이터를 쓴다. 에이전트가 그때그때 필요한 문서를 명령으로 조회하는 구조라, 문서 전체를 컨텍스트에 밀어 넣지 않아도 된다.

- **typed envelope**: 모든 명령이 `--json`으로 `{type, data}` 봉투를 반환하고, 에러는 `{error, code, suggestions}` — 오타에는 근접 매칭 제안을 실어 에이전트의 자가 수정 루프를 지원
- **에러 코드 계약**: `code`는 안정적 기계 식별자로 **append-only**(의미 불변, 삭제 없음), 사람용 `error` 문자열은 자유롭게 개선. 기계는 code로 분기하고 문구에 의존하지 않는다 — 에이전트 시대의 API 하위 호환 설계
- **토큰 효율 모드**: `--dense`(압축 포맷)와 `--detail brief < compact < full` 단계로 소비자가 출력 밀도를 고른다. [[Tool-Output-Filtering|도구 출력이 컨텍스트를 채우는 문제]]를 공급자 측에서 푸는 사례
- **검색이 다음 행동을 안내**: 통합 검색 결과에 도메인 태그와 후속 실행 명령을 함께 실어, 에이전트가 탐색 → 상세 조회로 스스로 이동
- 프로젝트에 CLI 경로를 npm script로 고정해 에이전트가 경로 오류 없이 호출하게 하고, init가 에이전트용 문서를 프로젝트에 설치

### 명령 발견과 실패 응답도 계약이다

에이전트가 CLI를 쓰려면 결과뿐 아니라 가능한 명령과 인자, 실패 뒤의 선택지도 기계가 읽을 수 있어야 한다. 특정 제품의 플래그 이름을 보편 규칙으로 강제하지 않고 이 세 경계를 점검한다.

Basecamp CLI의 공식 README를 2026-10-06 확인한 사례다.

- 명령 발견: `--help --agent`는 플래그, 주의점과 하위 명령을 JSON으로 제공하고, `basecamp commands --json`은 전체 명령 목록을 제공한다.
- 결과 탐색: `--json` 결과의 `breadcrumbs`가 후속 명령을 안내한다. JSON 필드는 위치가 아니라 이름으로 읽는다.
- 실패 분기: 오류 응답의 안정적인 `code`와 `retryable`을 구분한다. `retryable: false`는 재시도가 도움이 될 알려진 이유가 없다는 뜻이며, 영구 실패의 보장은 아니다.

적용 시 후속 명령 제안과 실행 권한을 분리한다. 재시도 가능성도 중복 실행의 안전성을 뜻하지 않으므로, 상태를 바꾸는 명령은 별도로 멱등성과 결과 확인 경로를 설계한다. 이는 인터페이스를 적용할 때의 점검 원칙이며 해당 CLI가 모든 업무의 중복 실행을 막는다는 주장이 아니다.

### API 스키마와 생성 결과를 함께 관리한다

API 정의를 CLI, SDK와 문서 생성의 공통 입력으로 쓰면 이름과 인자 규칙을 각각 손으로 맞추는 부담을 줄일 수 있다. 에이전트가 문서를 읽고 만든 호출이 실제 명령과 어긋나는 문제도 같은 계약에서 점검한다.

설계 적용 시에는 다음을 확인한다.

1. 스키마 변경과 생성 결과의 차이를 같은 변경 검토에서 본다. 생성 성공만으로 실제 서버와의 동작 호환성을 보장하지는 않는다.
2. API 호출에 대응하지 않는 로컬 빌드, 개발 명령은 별도 구현이 필요할 수 있다. 수작업 명령의 도움말과 문서도 관리 대상에 포함한다.
3. 모든 도구를 새로 만들기보다 실제 사용하는 인터페이스부터 공통 계약으로 연결한다. 생성기와 배포 파이프라인의 유지 비용도 비교한다.

사례로 Cloudflare의 cf CLI는 OpenAPI 스키마에 추가 정보를 붙여 Forge의 생성 입력으로 사용한다. Forge의 2026-09-28 발표는 cf CLI 출력 생성과 향후 문서, SDK 확장을 구분한다. 따라서 전체 도구 체인이 이미 Forge로 전환됐다고 해석하지 않는다. 이 사례 범위는 2026-10-06 공식 발표와 대조했다.

## 선택 결과와 화면 데이터를 분리한다

검색 API가 이미 상품명, 가격과 이미지 주소를 반환했다면 모델에게 같은 JSON 전체를 다시 쓰게 할 필요는 없다. 모델은 선택한 상품 ID와 필요한 설명만 반환하고, 애플리케이션은 조회 결과에서 해당 상품을 찾아 화면 데이터를 조립할 수 있다.

다음은 쇼핑 에이전트 발표의 출력 축소 방식을 적용한 설계 점검이다.

- 반환 ID가 이번 요청에서 조회한 후보에 속하는지 검증한다. 임의 ID를 그대로 조회하면 다른 사용자나 판매 범위의 데이터가 섞일 수 있다.
- 가격, 재고와 거래 조건은 모델이 재작성한 문장보다 서비스의 원본 데이터를 사용한다. 결제 시점에는 다시 확인한다.
- 후보에 없는 ID, 중복 ID와 필수 필드 누락은 정상 결과와 구분한다. 설명이 유창해도 잘못된 상품을 표시하지 않는다.
- 출력 토큰 감소와 실제 화면 응답 시간은 따로 측정한다. ID를 받은 뒤 추가 조회가 필요하면 그 지연도 포함한다.

Bedrock의 `OutputTokenCount`, `TimeToFirstToken`과 `InvocationLatency`는 각각 출력량, 첫 토큰 지연과 마지막 토큰까지의 호출 지연을 보여 준다(2026-10-07 공식 문서 기준). 이 지표만으로 프런트엔드의 상품 카드 표시 완료 시간을 대신하지 않는다. 출력 축소의 효과는 동일한 질문 집합에서 상품 선택 정확도와 전체 지연을 함께 비교한다.

## Vibe Test — 컨벤션을 측정으로 검증

같은 프롬프트 배터리를 서로 다른 시스템 구성(자사 시스템, 경쟁 조합, 순수 HTML baseline)에 주고 LLM이 생성한 UI 코드를 정량 비교하는 평가 체계. 프롬프트마다 기대 컴포넌트와 난이도를 메타데이터로 두되 평가에만 쓴다.

공정성 5대 불변식이 핵심이다 (LLM 비교 평가 일반론으로 재사용 가능):

1. **공정한 평가자**: 모든 구성에 같은 평가 로직과 기준, 평가자는 어느 구성의 산출물인지 모르게(블라인드)
2. **테스트 대상만 변수**: 프롬프트, 페르소나, 출력 형식 동일. 특정 시스템에만 유리한 코칭 규칙 금지 — 그건 문서가 가르치게 한다
3. **정답 누출 금지**: 기대 컴포넌트를 프롬프트에 넣거나 그것으로 사전 조회 명령을 만들어주지 않는다. 에이전트는 시스템 자체 문서로 답을 발견해야 한다
4. **대표성 있는 환경**: 실사용자가 받는 배포물(npm 패키지의 README)로 테스트한다. 소스 레포 접근이나 손질된 스킬 문서는 실사용과 다르다
5. **컨텍스트 프리 서브에이전트**: 프롬프트마다 사전 지식 없는 새 에이전트 — 부모 세션에서 상속된 지식이 없어야 발견 능력이 측정된다

의도적으로 baseline에 유리한 비대칭은 제거하는 대신 **문서화**한다 — 그래야 자사 시스템의 승리가 신뢰를 얻는다. 벤치마크 설계에서 자기에게 불리한 조건을 남겨두는 것이 결과의 설득력을 만드는 패턴.

## 사례 — Astryx

Meta 사내 8년, 13,000+ 앱에서 쓰인 최대 디자인 시스템의 오픈소스판(React + StyleX, 150+ 컴포넌트). 위 원칙의 구현체로, 에이전트 친화 외의 설계도 같은 철학이다 — 닫힌 최상위 API 대신 조합 가능한 블록을 직접 export하고(open internals), 더 깊은 커스텀은 swizzle로 컴포넌트 소스를 프로젝트에 꺼내 소유하게 하며, 스타일 저작은 StyleX지만 소비자에게는 비종속(className으로 Tailwind든 CSS든), 테마는 CSS 커스텀 프로퍼티 오버라이드 집합이라 포크 없이 브랜딩한다.

## 체크포인트

- 에이전트 친화 설계가 별도 트랙이 아니라 DX의 극한값인 이유 (같은 변경이 둘 다에게 이득)
- 강제보다 안내가 에이전트에게 더 잘 동작하는 이유 (가드레일 우회 코드 vs 컨벤션 유도)
- 에러 코드 append-only 계약 — 기계가 분기하는 필드와 사람이 읽는 필드의 분리
- 도구 출력 밀도를 소비자가 고르게 하는 설계 (`--dense`, detail 단계)
- LLM 비교 평가의 공정성 5대 불변식과 의도적 비대칭의 문서화

## 출처

- [Agent와 함께하는 쇼핑 경험 혁신 - 검색, 추천부터 초개인화까지 — AWS Korea](https://www.youtube.com/watch?v=h3usF3KVweA) — 24분 구간의 상품 ID 반환과 코드 기반 화면 조립 사례.
- [Amazon Bedrock, Monitor bedrock-runtime inference using CloudWatch metrics](https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-runtime-metrics.html)
- [Basecamp CLI — Basecamp (GitHub)](https://github.com/basecamp/basecamp-cli)
- [Astryx: An open source design system that's fully customizable and agent ready — Meta (GitHub)](https://github.com/facebook/astryx)
- [Introducing cf: the agentic CLI for the entire Cloudflare API — Cloudflare](https://blog.cloudflare.com/cloudflare-cf-cli-launch/)
- [Introducing Forge: the open source pipeline for generating SDKs, CLIs, docs, and more — Cloudflare](https://blog.cloudflare.com/forge-open-source-generation-pipeline/)

## 관련 문서

- [[Tool-Output-Filtering|도구 출력 필터링 (수요 측 — 이 문서는 공급 측)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법 (LLM-as-Judge, 평가 설계)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Eval)]]
- [[Harness-Engineering|하네스 엔지니어링 (Verify 단계)]]
- [[Agent-Code-Search|에이전트 코드 검색 (탐색 비용 축소의 다른 축)]]
- [[Agent-Ready-Data|에이전트용 데이터 준비]] — 인터페이스 뒤의 데이터 다섯 속성과 능력 선언
