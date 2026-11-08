---
tags: [cicd, gitlab, ai, agent, devsecops, governance]
status: done
verified_at: 2026-11-09
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitLab Duo Agent Platform", "DAP", "GitLab 에이전트 플랫폼", "GitLab Flows"]
---

# GitLab Duo Agent Platform

GitLab Duo Agent Platform(DAP)은 이슈, merge request(MR), 파이프라인, 보안 스캔 결과처럼 GitLab이 이미 가진 SDLC 데이터를 컨텍스트로 삼아 AI 에이전트를 개발 전 과정에 붙이는 플랫폼이다. GitLab과 파트너는 이를 코드 작성만 빠르게 하는 코딩 보조 도구와 구분해, 코드 리뷰, 파이프라인 수정, 취약점 분류처럼 코드 앞뒤 단계까지 에이전트를 붙이는 플랫폼으로 소개한다. 아래 기능 이름, 등급과 상태는 2026-11-09에 확인한 GitLab 공식 문서 기준이며 기능마다 도입 버전, 등급과 beta 여부가 다르다. 도입 순서와 트레이드오프는 공식 문서가 아니라 이 구조에서 끌어낸 판단 기준이다.

## 에이전트와 플로우

- **에이전트(agent)**: 공식 정의는 특정 작업을 돕고 복잡한 질문에 답하는 AI 도우미다. 켠 에이전트는 Chat에서 쓴다.
- **플로우(flow)**: 공식 정의는 하나 이상의 에이전트가 함께 복잡한 문제를 푸는 조합이다. 트리거 이벤트로 시작할 수도 있고, 이슈의 Implement 버튼, Agentic Chat이나 파이프라인 화면의 수정 버튼처럼 사람이 직접 시작할 수도 있다. 예를 들어 Developer flow는 이슈를 받아 백그라운드에서 MR까지 만들고, IDE의 Software Development flow는 실행 중 멈추거나 계획을 고치게 할 수 있다.

해석하자면 에이전트는 사람과 주고받으며 일하는 단위이고, 플로우는 여러 단계를 묶어 사람이 중간 단계를 일일이 지시하지 않아도 진행되는 단위다. 이 구분은 공식 정의가 아니라 이해를 돕는 틀이다. 결과는 MR, 코드 제안이나 코멘트처럼 사람이 검토하고 병합 여부를 정하는 산출물로 끝나는 경우가 많다.

UI에서 실행한 플로우는 CI/CD로 실행되어 runner에서 돈다. GitLab.com은 기본으로 hosted runner를 제공하지만 최상위 그룹에 IP 제한이 있으면 hosted runner로 플로우를 실행할 수 없다. Self-Managed나 직접 운영하는 runner는 `gitlab--duo` 태그가 필요하다. IDE에서 실행한 플로우는 로컬에서 돈다.

## 기본 제공 구성

| 구분 | 문서에 나온 이름 |
|---|---|
| 기본(foundational) 에이전트 | Planner, CI Expert, Security Analyst, Data Analyst, Flow Creator, Onboarding Agent, Permissions Assistant, Support Assistant |
| 기본 플로우 | Code Review, Fix CI/CD Pipeline, Developer, Software Development, Convert to GitLab CI/CD(Jenkins 이전), SAST False Positive Detection, Resolve SAST Vulnerability, Secret False Positive Detection, Security Review, Recommend Reviewers, Generate Workplan, Agentic Breaking Change Resolution, Vulnerability Context Flow |

등급과 상태는 항목마다 다르다. 2026-11-09 개요 표 기준으로 SAST False Positive Detection, Secret False Positive Detection, Resolve SAST Vulnerability, Security Review, Agentic Breaking Change Resolution, Security Analyst와 Permissions Assistant는 Ultimate 전용이고, Flow Creator와 Recommend Reviewers는 Premium과 Ultimate다. CI Expert, Support Assistant, Security Review와 Agentic Breaking Change Resolution은 beta나 experimental 목록에 있다. 도입 전에 개요의 기능 표에서 현재 등급과 상태를 다시 확인한다.

- **코드 리뷰**: Code Review flow는 버그, 보안 취약점, 데이터 손실 같은 정확성 문제를 찾으면 코멘트를 남긴다. 보안, 성능, 유지보수성 같은 추가 관점은 custom review instruction으로 지정한다. 19.5부터 승인이나 변경 요청도 beta로 할 수 있으며 기본으로 꺼진 `duo_code_review_decisions` feature flag가 필요하다. GitLab Duo의 승인은 필수 승인 수에 포함되지 않는다.
- **파이프라인 수정**: Fix CI/CD Pipeline flow는 실패한 파이프라인의 로그를 분석한다. 19.2 GA 기준으로 MR에 연결된 파이프라인이면 source branch에 inline 코드 제안을 달고, 수정이 MR diff 밖의 파일에 닿거나 MR이 없는 파이프라인이면 새 MR을 만든다. 코멘트만 남기는 경우도 있다.
- **취약점 분류와 조치**: SAST False Positive Detection은 SAST 결과 중 Critical과 High 심각도 취약점의 오탐(false positive)을 판정하고, Resolve SAST Vulnerability는 취약점의 수정 MR을 제안한다. 둘 다 Ultimate 기능이다. 오탐 판정도 확률적 판단이므로 판정 표본을 사람이 다시 확인한다.
- **AI Catalog**: 에이전트와 플로우를 찾고 만들고 공유하는 중앙 목록이다. 항목은 public, private, restricted로 공개 범위를 정하고 버전을 고정해 쓴다. 그룹이나 프로젝트에서 켜려면 Maintainer 이상 역할이 필요하다.

## 트리거와 실행 신원

트리거는 플로우나 외부 에이전트가 언제 실행될지 정한다. 문서가 나열한 이벤트는 다음과 같다.

- 서비스 계정 멘션, 이슈나 MR 담당자 지정, 리뷰어 지정
- 파이프라인 상태(실행, 성공, 실패, 취소)
- MR 이벤트(승인, 생성, ready 표시, 병합 충돌)와 work item 생성, 상태 변경
- 예약 실행(19.4 beta, GitLab.com과 Self-Managed)

이벤트 트리거는 사람이 일으킨 이벤트에만 반응한다. bot 사용자, 서비스 계정이나 다른 플로우의 행동으로는 트리거가 시작되지 않는다. 예외는 19.6에 추가된 트리거 설정의 세션 종료 시 work item 상태 변경으로(같은 설정은 세션의 draft MR을 ready로 표시할 수도 있다), feature flag(`dap_software_factory`, `ai_flow_trigger_chaining`)로 켜야 하며 기본은 꺼져 있다. 이 설정이 바꾼 상태는 다른 트리거를 시작할 수 있고, 연쇄의 깊이와 너비 제한이 순환을 멈추지만 순환 안의 각 세션은 그대로 실행된다. 기본 제한은 연쇄 실행으로 비용과 변경이 불어나는 경로를 줄이는 효과가 있다고 해석할 수 있으나, 문서는 이유를 적지 않는다.

플로우는 플로우의 서비스 계정과 실행을 일으킨 사용자를 합친 일회성 composite identity로 실행된다. 역할은 사용자 역할과 서비스 계정의 Developer 역할 중 더 제한적인 쪽을 따르고, 접근 가능한 프로젝트도 사용자와 서비스 계정 양쪽이 접근할 수 있는 곳으로 좁혀진다. 결과적으로 사용자가 할 수 없는 일은 플로우도 할 수 없고, 서비스 계정에 넓은 권한을 줘도 요청한 사용자의 권한을 넘지 않는다. 이 신원은 UI와 IDE의 Agentic Chat과 예약 트리거에는 적용되지 않으므로 그 경로의 권한은 따로 확인한다. 서비스 계정은 최상위 그룹에 만들어지며 이름은 custom 플로우가 `ai-<flow_name>-<top_level_group_name>`, 기본 플로우가 `duo-<flow_name>-<top_level_group_name>`과 비슷한 형태다.

## 컨텍스트: 검색이 아니라 관계 탐색

GitLab Orbit은 GitLab 데이터와 코드를 그래프로 만들어 에이전트에 주는 소프트웨어 생명주기 컨텍스트 그래프다. 스키마 문서가 예로 드는 데이터는 그룹, 프로젝트, 사용자, MR, 파이프라인, work item, 보안 finding과 파일, 디렉터리, 정의, import, 호출 관계이며, 노드 유형과 관계는 릴리스마다 바뀔 수 있다. 공식 예시 질문은 이 CVE가 그룹의 어느 프로젝트에 영향을 주고 어떤 수정이 운영까지 갔는지다. 개념적으로는 임베딩 유사도로 비슷한 조각을 찾는 벡터 검색과 달리 명시된 관계를 따라가는 탐색에 가깝다([[GraphRAG-Retrieval|GraphRAG]]). 이 대비는 Orbit 문서의 서술이 아니라 해석이다. Premium과 Ultimate 기능이며, REST, MCP와 Orbit MCP 질의는 19.5부터 GitLab Credits를 소비하지만 Orbit CLI로 만든 로컬 그래프 질의는 소비하지 않는다. 2026-11-09 확인한 Orbit 문서는 beta나 GA 상태를 적지 않는다.

GitLab MCP 서버(19.5 GA, `https://<host>/api/v4/mcp`)는 외부 MCP 클라이언트가 GitLab 데이터를 쓰게 하며, 19.6부터 opt-in `orbit` toolset으로 그래프 질의 도구를 제공한다. 반대 방향으로 custom 에이전트가 외부 MCP 서버를 쓰는 기능은 beta나 experimental로 표시되어 있다([[MCP|MCP]]).

## 외부 에이전트와 모델 선택

- **외부 에이전트**: Claude Code, Codex, Amazon Q Developer, Gemini 같은 에이전트를 GitLab이 관리하는 외부 에이전트로 등록해 이슈, epic, MR에서 멘션이나 지정으로 실행한다. CI/CD 파이프라인에서 headless로 돌며 Premium과 Ultimate 기능이다. 문서는 활성화에 GitLab support 문의가 필요하다고 적고 있고, custom 외부 에이전트는 Self-Managed에서만 feature flag로 쓸 수 있다.
- **Self-hosted 모델**: 18.8부터 DAP를 self-hosted 모델로 GA 지원한다. AI Gateway와 LLM을 모두 직접 운영하는 구성은 완전히 격리된 네트워크에서 동작할 수 있어 폐쇄망 조직의 선택지가 되며, 오프라인 라이선스에는 별도 add-on이 필요하다. 이 구성에서는 외부 에이전트를 쓸 수 없다.

## 거버넌스와 비용

- **도구 통제**: 도구와 접근 유형마다 Always Allow, Always Ask, Always Deny를 정한다. 최상위 그룹(Owner)과 프로젝트(Maintainer 이상)에서 설정하며 프로젝트 규칙은 그룹과 같거나 더 엄격하게만 둘 수 있다. beta 기능이다. 백그라운드 접근에는 Always Allow와 Always Deny만 있고, 규칙이 없는 도구는 Always Allow가 기본이다. Developer flow 같은 백그라운드 플로우에 규칙을 강제하려면 19.3에 추가되어 기본으로 꺼진 `duo_workflow_background_tool_governance` feature flag가 필요하다(2026-11-09 문서 이력 기준).
- **세션**: 실행한 에이전트와 플로우의 상태와 실행 데이터를 AI > Sessions에서 본다. runner에서 돈 플로우는 CI/CD job 로그도 남는다. 세션은 마지막 활동 30일 뒤 삭제되므로 장기 감사 근거로는 따로 보존한다.
- **AI 감사 이벤트**: 에이전트 활동을 한곳에서 보는 감사 이벤트 보고서가 beta로 있고, 저장은 기본으로 꺼져 있어 Owner나 Security Manager가 켜야 한다.
- **비용**: GitLab Credits로 과금한다. 포함 크레딧은 사용자별이고 다른 사용자와 나눠 쓸 수 없다. 별도로 구매하는 월 commitment pool은 구독의 모든 사용자가 공유하고, 이를 다 쓰면 on-demand 크레딧이 적용된다. 청구는 root namespace나 최상위 그룹 단위다. 개별 사용자 소비는 usage cap으로 제한할 수 있다고 문서가 안내한다.

## 도입 순서와 트레이드오프

1. 코드 리뷰나 파이프라인 수정처럼 결과가 MR이나 코멘트로 끝나 사람이 검토하기 쉬운 기본 플로우 하나로 시작한다.
2. 효과를 DORA의 소프트웨어 딜리버리 지표(2026-11-09 dora.dev 기준 변경 리드 타임, 배포 빈도, 실패 배포 복구 시간, 변경 실패율, 배포 재작업률의 5개)처럼 딜리버리 전체 흐름으로 본다. 예전 4개 지표의 복구 시간(MTTR)은 실패 배포 복구 시간으로 이름과 정의가 바뀌었고 일반 장애 복구 시간과 같지 않다([[Software-Productivity-Measurement|소프트웨어 생산성 측정]]). MR당 절감 시간만 보면 코딩 단계 밖의 병목이 가려진다.
3. 자동 실행을 늘릴 때 도구 통제의 백그라운드 규칙, 백그라운드 강제 feature flag와 감사 이벤트 저장을 먼저 켠다. 도구 통제를 켰다는 사실만으로 트리거가 시작한 플로우가 막힌다고 보지 않는다.
4. 반복되는 절차가 확인되면 custom 에이전트와 플로우를 AI Catalog에 올려 재사용한다.

- **통합 데이터 모델과 종속**: 이슈부터 배포까지 한 제품이 가진 데이터를 바로 컨텍스트로 쓰는 것이 장점이지만, 그 이점은 GitLab에 SDLC를 모았을 때만 생긴다. 저장소, CI와 이슈 관리가 나뉜 조직은 이전 비용과 함께 판단한다.
- **자동 수정의 신뢰**: 파이프라인 수정 제안과 취약점 수정 MR은 승인과 병합을 사람에게 남긴다. Code Review flow의 승인은 필수 승인 수에 들어가지 않으므로 병합 기준은 사람의 리뷰 규칙으로 남는다.
- **기능 상태 편차**: 트리거, 카탈로그와 composite identity는 18.8 GA지만 도구 통제와 감사 이벤트 보고서는 beta, custom 에이전트의 외부 MCP 연결은 beta나 experimental이고, 기본 에이전트와 플로우 일부도 beta나 experimental이다. 도입 전에 인스턴스 버전, 등급과 배포 형태(GitLab.com, Self-Managed, Dedicated)를 확인한다.

GitHub 쪽에서 같은 문제를 푸는 방식은 [[GitHub-Agentic-Workflows|GitHub Agentic Workflows]]다. gh-aw는 읽기 전용 에이전트와 선언한 쓰기(safe outputs)를 job으로 분리하고, DAP의 플로우는 composite identity로 사람과 서비스 계정 권한 중 더 제한적인 범위에서 실행한다. 다만 Agentic Chat과 예약 트리거는 이 신원 밖에 있다.

## 출처

- [GitLab Docs, GitLab Duo Agent Platform](https://docs.gitlab.com/user/duo_agent_platform/)
- [GitLab Docs, Agents](https://docs.gitlab.com/user/duo_agent_platform/agents/)
- [GitLab Docs, Foundational agents](https://docs.gitlab.com/user/duo_agent_platform/agents/foundational_agents/)
- [GitLab Docs, External agents](https://docs.gitlab.com/user/duo_agent_platform/agents/external/)
- [GitLab Docs, Flows](https://docs.gitlab.com/user/duo_agent_platform/flows/)
- [GitLab Docs, Flow execution](https://docs.gitlab.com/user/duo_agent_platform/flows/execution/)
- [GitLab Docs, Foundational flows](https://docs.gitlab.com/user/duo_agent_platform/flows/foundational_flows/)
- [GitLab Docs, Triggers](https://docs.gitlab.com/user/duo_agent_platform/triggers/)
- [GitLab Docs, Composite identity](https://docs.gitlab.com/user/duo_agent_platform/composite_identity/)
- [GitLab Docs, AI Catalog](https://docs.gitlab.com/user/duo_agent_platform/ai_catalog/)
- [GitLab Docs, Sessions](https://docs.gitlab.com/user/duo_agent_platform/sessions/)
- [GitLab Docs, GitLab Orbit](https://docs.gitlab.com/orbit/)
- [GitLab Docs, GitLab MCP server](https://docs.gitlab.com/user/model_context_protocol/mcp_server/)
- [GitLab Docs, GitLab Duo Self-Hosted](https://docs.gitlab.com/administration/gitlab_duo_self_hosted/)
- [GitLab Docs, Tool governance](https://docs.gitlab.com/user/ai-governance/tool-governance/)
- [GitLab Docs, AI audit events](https://docs.gitlab.com/user/ai-governance/ai-audit-events/)
- [GitLab Docs, GitLab Credits](https://docs.gitlab.com/subscriptions/gitlab_credits/)
- [DORA, DORA metrics guide](https://dora.dev/guides/dora-metrics/)
- [DORA, DORA metrics history](https://dora.dev/insights/dora-metrics-history/)
- [GitLab Docs, Software Development Flow](https://docs.gitlab.com/editor_extensions/software_development/)
- [GitLab Docs, Code Review Flow](https://docs.gitlab.com/user/duo_agent_platform/flows/foundational_flows/code_review/)
- [GitLab Docs, Fix failed pipelines](https://docs.gitlab.com/ci/pipelines/fix_pipeline/)
- [GitLab Docs, SAST false positive detection](https://docs.gitlab.com/user/application_security/vulnerabilities/false_positive_detection/)
- [GitLab Docs, GitLab Orbit schema](https://docs.gitlab.com/orbit/schema/)
- [GitLab Docs, GitLab Orbit credit usage](https://docs.gitlab.com/subscriptions/gitlab_orbit_credit_usage/)
- [코딩을 넘어 딜리버리까지! AI Agent가 바꾸는 SDLC와 DevSecOps — 토크아이티, 플래티어(GitLab 파트너) 발표, 2026-10-23](https://www.youtube.com/watch?v=DbBuZWH1TIM)

## 관련 문서

- [[GitHub-Agentic-Workflows|GitHub Agentic Workflows (gh-aw)]]
- [[GitLab-Security-Policies|GitLab 보안 정책]]
- [[DevOps-vs-DevSecOps|DevOps와 DevSecOps]]
- [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]
- [[GraphRAG-Retrieval|GraphRAG]]
- [[MCP|MCP]]
- [[Software-Productivity-Measurement|소프트웨어 생산성 측정]]
