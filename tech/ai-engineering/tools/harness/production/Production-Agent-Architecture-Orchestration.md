---
tags: [ai, agent, architecture, orchestration]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Orchestration", "프로덕션 에이전트 분업과 오케스트레이션"]
---

# 프로덕션 에이전트 아키텍처: 분업과 오케스트레이션

컴포넌트 분업과 라우팅 계약, 환경을 넘는 위임의 권한 보존, 핵심 엔진의 구현 선택과 Lazy Load 컨텍스트를 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## 컴포넌트 분업

단일 에이전트에 도구와 책임이 늘어 라우팅 정확도나 컨텍스트 관리가 어려워졌을 때 분업을 검토한다. 역할 분리는 선택지이며, 추가 호출과 조율 비용까지 비교한다. 아래 표는 구성 예시다.

| 컴포넌트 | 역할 | 비고 |
|---|---|---|
| **Listener** | 외부 채널(슬랙 등) 이벤트 수신 | 상시 실행, LLM 미사용 |
| **Dispatcher** | 잡담/유효 요청 분류, 중복, 세션 관리 | 가벼운 모델(예: Sonnet) |
| **Parent Worker** | 요청 의도 정리, 라우팅, 재확인 | 요청자, 범위, 개념, 취소분 포함/제외, 합의된 사실 등의 컨텍스트 |
| **Sub-agents** | 단순 분석, 복잡 분석, 검색, 보고서, 시각화, 시트 출력 | 도메인별 워커, 권한 분리 |

Parent의 핵심 책무는 **정보 부족 시 재확인**이다. 모호한 요청을 추측으로 채우면 다층 안전망이 무용지물이 된다. 예: "거래 뽑아줘" → "숙박만요, 아니면 전체요?", "취소분 포함요?"로 분기.

**라우팅과 대화 전달은 별도 계약이다.** supervisor는 collaborator의 역할과 책임을 명확히 구분하고 겹침을 줄인다. 설계 점검에서는 전문 에이전트가 바뀐 뒤에도 후속 질문의 대상과 조건이 이어지는지 확인하고, 각 에이전트에 전달할 대화 범위와 민감정보를 제한한다. 역할 이름이나 프롬프트 분리만으로 데이터 접근 권한이 격리되지는 않는다.

관리형 API의 한 예로 Bedrock Agents Classic의 `AssociateAgentCollaborator`는 `relayConversationHistory`에 `TO_COLLABORATOR` 또는 `DISABLED`를 받는다(2026-10-07 공식 문서 확인). 같은 날 사용자 가이드는 Classic의 신규 고객 이용이 닫혀 있다고 안내하므로, 이 예시를 신규 도입 권고로 해석하지 않는다. 기존 에이전트의 단계적 연결과 대화 전달 계약을 이해하는 참고로 쓴다.

### 환경을 넘는 위임은 호출자의 권한을 보존한다

클라우드, 사내 시스템과 SaaS를 연결하는 에이전트는 연결 가능성과 실행 권한을 따로 확인한다. 다음은 IBM의 공개 신원 관리 원칙을 적용한 설계 점검이다(2026-10-10 확인).

- 사용자와 실행 에이전트를 구분해 식별하고, 누가 어떤 작업을 위임했는지 남긴다. 공유 키 하나로 모든 행동을 같은 주체의 작업으로 기록하지 않는다.
- 도구 호출에 필요한 범위와 수명으로 자격증명을 제한하고, API와 도구 실행 시점에 권한을 검사한다. 상위 에이전트가 요청을 전달했다는 이유로 하위 시스템의 권한 검사를 생략하지 않는다.
- 위임, 실행과 감사 기록을 연결한다. 중앙에 정책을 정의했어도 각 환경에서 실제로 거절되는지, 권한 회수가 반영되는지는 별도 시험으로 확인한다.

하이브리드 배치나 하나의 신원 시스템을 채택한 사실만으로 이 통제가 완성되지는 않는다. 제품 소개의 통제 목표와 실제 배포 환경에서 확인한 동작을 구분한다.

## 핵심 엔진: 프레임워크 vs 자체 구현

오케스트레이션 엔진을 LangChain 같은 범용 프레임워크에 계속 맡길지, 자체 구현할지는 성숙도에 따라 갈린다. 프레임워크는 빠르게 PoC를 세우는 데 강하지만, 프로덕션에서 제어권, 디버깅, 성능 튜닝을 가져오려면 추상화가 오히려 족쇄가 된다.

- PoC 단계: 프레임워크로 빠르게 검증
- 프로덕션 핵심 엔진: ReAct(추론과 행동을 번갈아 도는 루프) 방식 기반으로 자체 구현해 운영
- 자체 엔진은 매 턴 tool-calling으로 탐색, 행동 방향을 직접 정하고, 폴더 구조와 메타데이터를 컨텍스트로 받아 Progressive Disclosure 방식으로 필요한 만큼씩 파고든다 → [[RAG-Retrieval-Engineering]]

판단 기준은 통제 가능성이다. 핵심 루프의 동작을 한 줄까지 설명, 수정할 수 있어야 비결정성을 통제할 수 있다.

## Lazy Load 컨텍스트

Parent가 모든 규칙을 메모리에 들고 있으면 세션당 수십만 토큰이 낭비된다. 헤드리스 모드(매 요청마다 새 세션 생성)에서는 더 치명적이다.

전략은 Parent가 규칙 본문이 아닌 **주소만** 보유하는 것.

```
Parent: "SQL 작업이면 #sql-rules 참조"
        "보고서면 #report-rules 참조"
              ↓
Sub-agent가 자기 규칙만 런타임에 로드
```

부작용 효과:
- **유지보수**: 한 워커 규칙만 수정 → 다른 워커 무영향
- **권한 분리**: 보고서 워커의 BigQuery 직접 접근은 실제 도구와 자격증명 권한으로 제한한다. 규칙 파일 분리만으로 접근이 차단되지는 않는다.
- **토큰 절감**: 세션당 200K+ 절약 가능

## 출처
- [Agentic AI identity management — IBM](https://www.ibm.com/solutions/agentic-ai-identity-management)
- [Amazon Bedrock, Use multi-agent collaboration with Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html)
- [Amazon Bedrock API Reference, AssociateAgentCollaborator](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_AssociateAgentCollaborator.html)
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain/Inform/Verify/Correct/HITL)]]
- [[Agent-Spec-Writing|에이전트 스펙 작성법]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (구조화 조회, Progressive Disclosure 탐색)]]
