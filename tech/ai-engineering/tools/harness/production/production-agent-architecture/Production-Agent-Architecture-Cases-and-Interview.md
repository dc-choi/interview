---
tags: [ai, agent, architecture]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Cases and Interview", "프로덕션 에이전트 사례와 면접 포인트"]
---

# 프로덕션 에이전트 아키텍처: 사례와 면접 포인트

실행 환경 격리와 행동 승인을 나눈 Meta Muse, 마이리얼트립 데이터 에이전트, LY SRELens, 프롬프트가 맡던 책임을 모델 추론 밖의 전용 계층으로 나눈 Salesforce 에이전트 스택(Agentforce, Data 360, Headless 360) 사례와 아키텍처 전반을 묻는 면접 질문을 모았다. 사례가 가리키는 3계층 프롬프트와 루프 가드레일은 [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]에서 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## 사례

Meta Muse의 2026-09 공개 설계는 사용자별 VM에 에이전트와 데이터를 두고, 시스템 수준에서 분리한 Sentinel이 외부 통신을 승인하는 방식을 설명한다. 메일 발송과 구매 같은 민감한 행동에는 사용자 확인을 받고 감사 이력을 제공한다(2026-10-06 공식 발표 확인). 이는 실행 환경 격리와 외부 행동 통제를 별도로 두는 사례이며, 발표만으로 격리의 완전성이나 실제 사고 방지 효과를 검증한 것은 아니다. Meta의 안전 설계 글을 2026-10-12에 대조한 세부와 인터뷰 발언은 다음과 같다.

- **승인 주체와 자동 허용**: Sentinel은 커넥터 행동과 네트워크 이그레스의 유일한 허가 주체이고, 네트워크 요청은 하나하나 이그레스에서 판정한다. 도구 실행 프로세스는 깨끗한 상태로 시작해 사용자 데이터를 읽으면 오염(tainted) 상태가 된다. 좁게 정한 자동 허용 정책에 맞고 목적지 URL의 다른 검사도 통과한 깨끗한 네트워크 요청은 사용자에게 묻지 않고 나갈 수 있고, 오염됐거나 확인할 수 없는 프로세스는 자동 허용을 잃고 일반 승인 흐름으로 간다. 비밀값이나 인증 토큰이 필요한 요청에서도 실행 코드는 원본 자격증명 대신 authd가 발급한 대리 토큰만 본다.
- **승인의 형태**: 승인 대화상자는 에이전트와의 대화가 아니라 클라이언트 UI에 직접 뜬다. 승인은 대화 속 제안이 아니라 커넥터나 목적지와 용도에 묶인 권한이고 일회, 세션, 작업, 기간 한정, 영구 범위로 줄 수 있다. 읽기 전용, 이미 허용한 행동, 위험이 낮다고 입증된 행동은 묻지 않고 진행할 수 있으며, Meta는 이 균형을 계속 조정하겠다고 밝힌다. Meta가 안전 설계 글에서 매번 승인받는다고 명시한 행동은 구매다. 결제 정보가 저장된 사이트에서는 정확한 구매 내역으로 승인받고, 처음 쓰는 사이트에서는 Muse의 지갑이 결제마다 일회용 카드 번호를 발급해 넘기며 이때도 매번 승인받는다.
- **현재 격리와 예고된 격리**: 현재의 Secure VM은 사용자 간 데이터를 격리하고 Meta 직원의 접근을 운영 정책으로 제한하지만, 서비스 지원과 보안, 운영에 필요한 Meta의 접근까지 막지는 않는다. Meta도 VM 안의 데이터에 접근하지 못하게 암호학적으로, 검증 가능하게 막으려는 Confidential VM은 2026년 안 제공 계획으로 발표됐다. 대조일 기준 출시는 확인하지 못했으므로 현재 기능과 예고된 기능을 섞어 신뢰 근거로 쓰지 않는다.
- **승인 피로**: Alexandr Wang은 Cleo Abram과의 인터뷰에서 새 웹사이트에 연결하거나 정보를 보낼 때 묻는 확인이 번거롭다는 반응이 있지만, 사용자가 Muse가 무엇과 상호작용하는지 정확히 알게 하려 한다고 말했다. Meta도 모든 행동을 묻는 것이 목표가 아니라고 밝히므로, 승인 피로와 통제의 균형을 권한 범위와 자동 허용 조건으로 나눈 사례로 읽는다. Meta는 prompt injection이 업계의 미해결 문제이고 Muse도 때때로 실수한다고 인정한다.

마이리얼트립 데이터 에이전트(2026): 슬랙 → Dispatcher(Sonnet) → Parent Worker → 분업 워커(Claude Code Max + Docker)로 구성. 라이브 7일 누적 2,000건+, 일 500~600건 처리. 분석가 인당 일 4~7건이던 반복 분석을 위임하고 신규 지표 설계, 정책 결정에 인력 재배치.

LY Corporation SRELens(2026): Grafana 플러그인으로 자연어 장애 원인 분석. 메트릭, 로그, 트레이스, 프로파일을 MCP 게이트웨이로 조회하는 LLM 에이전트에 위 3계층 프롬프트와 루프 가드레일, 사후 반영 사용량 제한을 적용. 오픈소스 PoC에서 사용자 컨텍스트 전파, 프롬프트 제어, 호출 라운드 제한 등의 한계를 확인하고 자체 구현으로 전환한 사례.

Salesforce 에이전트 스택(Agentforce, Data 360, Headless 360)은 규칙 강제, 고객 식별, 컨텍스트 선택과 권한 판단을 프롬프트 하나에 맡기지 않고 에이전트의 모델 추론 밖에 둔 전용 계층으로 나눈 사례다. 프롬프트 지시는 맥락에 따라 지켜지지 않을 수 있으므로, 코드로 표현할 수 있는 결정은 로직으로 쓰고 LLM은 의도 파악, 대화 응답과 모호한 입력 처리처럼 추론이 필요한 단계에 남기는 것이 Salesforce의 설계 권고다. 아래는 2026-10-27에 Salesforce 공식 문서, 블로그와 공개 저장소로 대조한 구성이다. 제품 상태는 대조일 기준이며, 이 구성이 실제 신뢰성을 얼마나 높였는지는 독립적으로 검증하지 않았다.

- **규칙 강제**: Agent Script는 LLM 추론을 쓸 지점과 결정적 로직을 따를 지점을 지정하는 에이전트 정의 언어이고, Python이나 YAML처럼 들여쓰기로 범위를 정한다. 컴파일러가 스크립트를 직렬화된 실행 계획인 Agent Graph로 바꾸면, Atlas Reasoning Engine이 세션 상태에 따라 그래프를 순회하면서 노드마다 프롬프트 지시가 있으면 LLM을 호출하고 없으면 결정적으로 실행한다. 이는 그래프 노드 기준의 구분이며, Salesforce는 실행 수명주기에서 LLM을 부르는 지점으로 서브에이전트 분류, 다음 행동 결정, 응답 생성, 근거성 검증을 포함한 여덟 곳을 든다. `before_reasoning`은 서브에이전트의 수명주기 블록을 한 번 도는 parse마다 시작 시점에 예외 없이 실행되고, `after_reasoning`은 추론 루프가 끝난 뒤 실행된다. 한 사용자 턴에서도 진입 시와 도구 호출 뒤마다 parse가 다시 일어날 수 있다. 공개 저장소의 예시는 `before_reasoning`에서 고객 확인 액션을 실행해 결과를 변수에 담고, `after_reasoning`에서 미확인이면 신원 확인 서브에이전트로 전환한다. 다만 `is_displayable: True`인 액션이 흐름에 있으면 LLM이 그 출력을 내보내기로 한 즉시 추론 루프를 빠져나가 `after_reasoning`이 실행되지 않으므로, Salesforce는 반드시 실행할 로직을 다음 서브에이전트의 `before_reasoning`에 두라고 권고한다. 그렇다고 `before_reasoning`에 전환을 두면 parse마다 무조건 실행되어 루프가 생기고, 외부 API 호출이나 레코드 쓰기 같은 부작용 있는 액션도 parse마다 다시 실행되므로 재실행해도 되는 경우가 아니면 이 블록에 두지 않는다. TDX 2026(2026-04)에 언어 명세, 문법, 파서와 컴파일러를 공개 저장소(Apache-2.0)로 열었고, 런타임은 대조일 기준 공개되지 않았다. 규칙을 자연어가 아니라 실행 경로에서 강제한다는 점에서 [[Production-Agent-Architecture-Guardrails|코드 레벨 Hook과 루프 가드레일]]과 같은 축이다.
- **고객 식별**: Data 360(이전 이름 Data Cloud)은 수집(ingestion)과 Zero Copy를 함께 써 기업 데이터를 연결하고, 설정한 match rule로 여러 원천의 레코드가 같은 사람인지 판정한다. 일치 방식에는 오타나 다른 표기를 허용하지 않는 Exact, 형식이 달라도 같은 정보면 일치로 보는 Normalized, 오타와 약간 다른 철자를 허용하는 Fuzzy가 있다. 방식별로 적용할 수 있는 필드는 Trailhead 자료 사이에서도 설명이 달라 조직 설정에서 확인한다. 원천 레코드는 바꾸지 않은 채 통합 프로필을 만들고 unified link 객체가 원천과 프로필을 이으며, 원천 값이 충돌하면 reconciliation rule이 프로필에 들어갈 값을 고른다. 고객 식별을 모델 추론이 아니라 데이터 계층의 규칙으로 처리하는 구조이며, 식별을 데이터 이동과 분리하는 일반 계약은 [[Customer-Data-Activation-Pipeline|고객 데이터 통합과 활성화 파이프라인]]에 있다.
- **컨텍스트 선택**: Data 360의 Agent Context Engine(ACE)은 요청마다 요청자, 에이전트, 목적과 엔터티를 식별하고(Resolve), 관계형, 검색, 그래프, RAG 같은 조회 경로를 고르며(Plan), 관련성, 권위, 최신성과 출처로 근거의 순위를 매기되 충돌은 드러낸 채 둔다(Reconcile). 이어 조회나 행동 전에 접근, 마스킹, 동의와 목적 통제를 적용하고(Govern), 승인된 근거, 작업 상태, 메모리와 인용을 Context Pack으로 묶은 뒤(Compile), 상호작용 기록에서 승격, 갱신, 만료할 것을 평가한다(Learn). 대화 기록은 자동으로 기업 메모리가 되지 않고 승인된 사실만 장기 메모리로 올라가며, 메모리는 출처를 추적하고 다른 에이전트가 의존하기 전에 사람 확인을 요구하게 할 수 있다. 2026-10-20 발표 기준 preview이고, 지원 플랫폼에서는 Google ADK, AWS Bedrock, LangGraph, OpenAI SDK로 만든 에이전트도 같은 컨텍스트를 받을 수 있다고 밝혔다. 아래 면접 포인트의 자동 메모리 비활성화와 달리 메모리를 쓰되 승격 조건을 두는 방식이며, 근거 선택의 일반 원리는 [[Context-Engineering|컨텍스트 엔지니어링]]에 있다.
- **권한**: Salesforce가 공개한 플랫폼 설계는 실행 단계마다 신원을 전파한다. 에이전트가 사용자를 대리하면 그 사용자의 신원이 모든 하위 상호작용으로 이어지고, 자율 에이전트는 자체 시스템 신원을 쓴다. 토큰은 필요한 권한으로만 범위를 정하고, 에이전트가 요청을 어떻게 구성하든 기반 접근 모델이 허용한 데이터만 돌려주며, 제약을 하나라도 충족하지 못하면 행동을 막거나 제한한다. 원리는 [[Production-Agent-Architecture-Orchestration#환경을 넘는 위임은 호출자의 권한을 보존한다|환경을 넘는 위임의 호출자 권한 보존]]과 같다.
- **외부 접근**: Salesforce는 2026-04 Headless 360 발표에서 플랫폼 기능을 API, MCP 도구와 CLI 명령으로 노출한다고 밝혔다. Headless 360 MCP 서버(대조일 기준 베타)는 실행할 수 있는 작업을 찾는 discover, 작업의 전체 명세를 돌려주는 describe, 고른 작업을 실행하는 dispatch와 읽기 전용 작업만 실행하는 dispatch_readonly 네 도구만 노출해, 작업 수가 릴리스마다 늘어도 도구 표면을 작고 안정적으로 유지한다. 도구 정의를 필요할 때 불러오는 [[Claude-Code-Extension-Reference|Claude Code Tool Search]]나 찾은 도구를 목록에 활성화하는 [[Palantir-MCP-Discovery-and-Context|Palantir MCP tool search]]와 달리 노출 도구 자체를 고정한다. Salesforce 호스팅 MCP 서버는 사용자별 인증을 요구하고 필드 수준 보안, 객체 권한과 공유 규칙을 모든 도구 호출에 적용한다. MCP, API, CLI와 함께 Headless Toolkit의 네 기술을 이루는 스킬은 자주 쓰는 여러 단계의 작업 흐름을 AI 도구에서 부르는 명령 하나로 묶는다. Salesforce는 Apex, Flow, Lightning 같은 애플리케이션 개발용 스킬 모음을 [[Agent-Skills|Agent Skills 명세]]의 `SKILL.md` 형식을 따르는 공개 저장소 forcedotcom/sf-skills(Apache-2.0)로 배포하며, 저장소는 Claude Code, Codex, Cursor처럼 스킬을 지원하는 코딩 에이전트에서 쓸 수 있고 릴리스 사이에 스킬 이름과 구조가 바뀌거나 스킬이 빠질 수 있다고 밝힌다.

## 면접 포인트

Q. 단발 LLM 호출과 프로덕션 에이전트의 차이는?
- 단발 호출과 작업 위임은 요구하는 신뢰 수준이 다르다.
- 신뢰는 **분업, Lazy Load, Defense in Depth, 명시적 지식, eval, 고가용성** 6축으로 만든다.

Q. LLM의 비결정성을 어떻게 통제하는가?
- 정의의 명확성(Metric Registry/DBT)으로 **입력 분산**을 줄이고
- 4겹 안전망(Role/Gate/Rule/Hook)으로 **실행 분산**을 차단하며
- Eval 회귀 테스트로 **변경 분산**을 검출한다.

Q. 멀티 에이전트는 왜 필요한가? 단일 거대 에이전트로 안 되는가?
- 컨텍스트 폭증, 권한 비대화, 실패 범위 확산.
- 분업은 선택지다. 워커별 권한, 컨텍스트와 장애 격리를 실제로 구현하고 추가 조율 비용과 비교해야 한다.

Q. 자동 메모리를 끄는 이유는?
- 무엇을 기억하는지 불투명 → 회사 기준과 어긋난 답변이 누적될 위험. 명시적, 버전 관리되는 정의만 정책으로 인정한다.

Q. 프롬프트에 규칙을 더해도 지켜지지 않으면 어떻게 하는가?
- 자연어 지시는 행동을 유도할 뿐 실행을 강제하지 못하고, 지시가 많을수록 준수율이 떨어질 수 있다. IFScale(arXiv 2507.11538, 2025-07)은 20개 모델에 보고서 작성 과제의 키워드 포함 지시를 최대 500개까지 줬고, 500개에서는 최고 성능의 프런티어 모델도 정확도가 68%에 그쳤다. 저하 양상은 세 가지로 나뉘었고 모델 크기, 추론 능력과 상관을 보였으며, 모두 평가 당시 모델 기준의 결과다.
- 코드로 표현할 수 있는 판단은 실행 경로의 로직으로, 고객 식별은 데이터 계층의 일치 규칙으로, 근거 선택과 권한 검사는 전용 계층으로 옮기고 모델에는 추론이 필요한 단계만 남긴다(위 Salesforce 사례).
- 옮긴 규칙은 자연어 지시보다 실행 시점이 분명하지만 놓인 위치에 따라 실행되지 않을 수 있고(위 `after_reasoning` 조건) 실행돼도 성공을 보장하지 않으므로, 규칙이 실제로 실행되고 위반 요청을 거절하는지는 테스트로 확인한다([[Context-Engineering#Advisory와 강제 검증|Advisory와 강제 검증]]).

## 출처
- [Introducing Muse: The World's First Personal AI Agent Built for Everyone — Meta](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)
- [How We Built Safety Into Muse — Meta, Tarek Sheasha](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)
- [The Biggest Launch Since ChatGPT (Muse) — YouTube, Cleo Abram](https://www.youtube.com/watch?v=1LRvMRC_pfY)
- [AI에게 어디까지 맡겨도 될까? | Muse 인터뷰 핵심과 알렉스의 해석 — YouTube, 커리어해커 알렉스](https://www.youtube.com/watch?v=csKkl4qlzSc)
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)
- [Grafana에서 자연어로 장애 원인을 분석하기: LLM 에이전트 기반 SRELens 개발기 — LY Corporation 기술블로그](https://techblog.lycorp.co.jp/ko/analyzing-incident-root-causes-in-grafana-using-natural-language-with-llm-agent)
- [Salesforce Architects, Hybrid Reasoning with New Agentforce Builder and Agent Script](https://architect.salesforce.com/docs/architect/fundamentals/guide/hybrid-reasoning-agentforce-builder-agent-script)
- [TDX 2026 Roundup: Agentforce Edition — Salesforce](https://www.salesforce.com/blog/tdx-2026-roundup-agentforce-edition/)
- [agentscript — GitHub, Salesforce](https://github.com/salesforce/agentscript)
- [What Is Data 360 (Formerly Data Cloud)? — Salesforce](https://www.salesforce.com/data/guide/)
- [Salesforce Trailhead, Data and Identity in Data 360, Understand Identity Resolution Rulesets](https://trailhead.salesforce.com/content/learn/modules/data-and-identity-in-salesforce-cdp/select-identity-resolution-match-rules)
- [Salesforce Trailhead, Explore Data 360 Core Functionality, Unify Your Data with Effective Identity Resolution Strategies](https://trailhead.salesforce.com/content/learn/projects/explore-data-cloud-core-functionality/unify-your-data)
- [How Data 360 Builds Trusted Context: The Enduring Layer for Enterprise AI — Salesforce Engineering](https://engineering.salesforce.com/how-data-360-builds-trusted-context-the-enduring-layer-for-enterprise-ai/)
- [Turning data into trusted, shared context with the Agent Context Engine — Salesforce](https://www.salesforce.com/blog/agent-context-engine-trusted-shared-context/)
- [Building an Enterprise Agent Platform: Enforcing Identity, Data, and API Governance — Salesforce Engineering](https://engineering.salesforce.com/building-an-enterprise-agent-platform-enforcing-identity-data-and-api-governance/)
- [Introducing Salesforce Headless 360. No Browser Required. — Salesforce](https://www.salesforce.com/news/stories/salesforce-headless-360-announcement/)
- [Salesforce Trailhead, Salesforce Headless Toolkit, Explore Headless Tools and Functionality](https://trailhead.salesforce.com/content/learn/modules/headless-tools-and-functionality/explore-headless-tools-and-functionality)
- [Salesforce Trailhead, Salesforce Headless Toolkit, Learn About Salesforce APIs, CLIs, and Skills](https://trailhead.salesforce.com/content/learn/modules/headless-tools-and-functionality/learn-about-salesforce-apis-clis-and-skills)
- [Salesforce - Beta connector — Claude by Anthropic](https://claude.com/connectors/salesforce-headless-360)
- [sf-skills — GitHub, Salesforce](https://github.com/forcedotcom/sf-skills)
- [How Many Instructions Can LLMs Follow at Once? — arXiv](https://arxiv.org/abs/2507.11538)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Software-3-0|Software 3.0]]
- [[AX-Transformation|AX 조직 전환]]
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
- [[Agentic-Commerce|에이전트 커머스 (Muse 구매 승인과 결제 경로)]]
- [[Agent-Swarm-Containment|에이전트 군집 격리 (AI로 AI를 감독하는 구조와 한계)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (근거 선택, 지시 밀도와 강제 검증)]]
- [[Customer-Data-Activation-Pipeline|고객 데이터 통합과 활성화 파이프라인 (고객 식별 단계의 데이터 계약)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (MCP Tool Search)]]
- [[Palantir-MCP-Discovery-and-Context|Palantir MCP의 도구 발견과 context]]
- [[MCP-Security-Boundaries|MCP 보안 경계 (서버 자격 증명, 요청 검증과 게이트웨이)]]
- [[Agent-Skills|에이전트 스킬 (Agent Skills 명세와 호스트별 로딩)]]
