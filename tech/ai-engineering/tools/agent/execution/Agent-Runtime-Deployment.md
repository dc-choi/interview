---
tags: [ai, agent, runtime, harness, claude-managed-agents]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Runtime Deployment", "Eve", "Mecatl", "Strands Harness SDK", "OpenCode 2.0", "Claude Managed Agents", "Tines 3B"]
---

# 에이전트 런타임의 정의, 상태와 배포 경계

에이전트 런타임은 모델 호출을 실제 도구 실행, 권한 검사, 상태 저장과 사용자 채널에 연결한다. 모델의 추론 능력이 좋아져도 작업 관리나 재개, 접근 통제가 자동으로 해결되지는 않는다.

## 정의와 실행 환경을 분리한다

| 층 | 관리할 계약 | 대표 확인 항목 |
|---|---|---|
| 에이전트 정의 | 지침, 모델, 도구, 스킬과 위임 관계 | 변경 이력, 도구 입력 검증과 테스트 |
| 실행 루프 | 호출, 승인, 압축, 예산과 종료 | 무한 재시도, 취소 전파와 실패 보고 |
| 영속 상태 | 세션, 이벤트와 완료한 작업 | 재시작 복구, 동시 쓰기와 중복 부수효과 |
| 실행 환경 | 로컬 프로세스, 샌드박스와 서버 | 자격 증명, 파일과 네트워크 접근 |
| 클라이언트 | 터미널, 웹과 메시지 채널 | 연결 단절 뒤 재접속과 사용자 권한 |

파일 기반 정의는 변경을 리뷰하기 쉽게 하지만 격리를 대신하지 않는다. 저장한 대화 이력도 외부 결제나 배포가 한 번만 실행됐다는 증거는 아니다.

## 팀이 기대는 업무 자동화는 정의와 실행 상태가 드러나는 workflow로 운영한다

개인 비서형 에이전트에 일정과 Markdown 지침으로 예약 작업을 맡기면 한 사람의 업무는 쉽게 자동화된다. 그러나 팀이 그 작업에 기대기 시작하면, 설정한 사람이 자리에 없거나 연결한 외부 API가 실패했을 때 다른 사람이 상태를 보고 고칠 수 있어야 한다. 문제는 Markdown 형식이 아니라 개인 계정에 묶여 정의, 실행 상태와 실패 정책이 공유되지 않는 실행이다(해석). 그래서 여러 시스템을 잇고 중간에 AI 판단이 들어가는 업무 처리는 입력, 판단, 승인과 허용한 행동을 정의로 드러내고 실행 상태를 런타임이 관리하는 workflow로 운영한다. 중소기업 소프트웨어 컨설팅에서 AI 도입 요청을 받아 온 발표자는 이런 요청이 대화형 기능보다 CRM, 결제와 내부 앱을 잇는 workflow로 되풀이된다고 설명한다(Builder's Day 2026 발표 기준).

| 구성 요소 | 내용 | 점검 제안 |
|---|---|---|
| 타입이 있는 입력 | 실행마다 들어오는 데이터의 구조를 정한다 | 구조가 맞지 않는 입력을 AI 노드 앞에서 거르는가 |
| AI 판단 노드 | 노드마다 모델, 고정 프롬프트와 동적 입력을 정한다 | 결정 범위가 좁으면 저렴한 모델로 충분한가, 오판 비용은 얼마인가, AI 출력이 입력으로 받은 후보 목록 안의 값인지 코드로 검증하는가 |
| 규칙과 사람 검토 | 승인 관문을 흐름 안에 둔다 | 누가 승인을 끄거나 바꿨는지 남는가 |
| 허용한 행동 | 연결할 도구를 workflow와 함께 선언한다 | 선언한 행동 목록과 실제 자격 증명 범위가 일치하고, 런타임이 선언 밖의 호출을 거부하는가 |

예: 청소 업체의 작업 배정에서는 들어온 작업과 가용 팀 목록을 받은 AI 노드가 팀을 고르고, 사람이 승인하면 예약을 확정해 팀에 알린다. 입력의 타입과 프롬프트가 고정되어 결정 범위가 좁으므로 발표자는 이 노드에 비용이 낮은 경량 모델을 썼다.

workflow 정의를 실행하는 런타임은 다음을 맡는다.

- 상태를 저장해 API 장애나 중단 뒤에도 멈춘 지점부터 이어 가고, 며칠이 걸릴 수 있는 사람 승인을 기다린다.
- 실패 정책을 workflow에 드러낸다. 발표의 예는 외부 API가 내려가면 몇 분마다 재시도하고, 두 시간이 지나도 실패하면 workflow 전체를 실패로 끝내는 것이다.
- workflow의 상태와 입력, 출력을 OpenTelemetry 같은 trace로 남겨 실패를 진단하고 프롬프트와 컨텍스트를 고치는 근거로 쓴다.

지속 실행의 일반 원리는 [[Durable-Workflow|지속 실행 워크플로]]에 있다. 재시도하는 외부 호출은 같은 업무 키로 멱등하게 만든다([[Harness-Anatomy#상태 복구와 외부 작업의 중복 방지는 별도다|상태 복구와 중복 방지]]). 승인 대기에는 작업 시각을 기준으로 기한과 만료를 두고, 거절되면 재배정이나 수동 처리로 넘기며, 예약 직전에 선택한 팀의 가용성을 다시 확인한다([[Durable-Workflow#승인 대기의 접수와 처리 완료를 구분한다|승인 대기의 상태 전이]]). 대기 중인 실행은 시작할 때의 정의 버전으로 끝내 승인 관문을 없앤 새 정의가 소급되지 않게 한다(설계 점검).

workflow 정의를 애플리케이션 코드와 함께 Git에 두면 리뷰, 버전 관리, QA 환경의 시험과 변경 이력 감사가 가능하다. 발표자는 자사 플랫폼 외에 Vercel의 [[#파일 구조로 정의하는 Eve|Eve]] 같은 프레임워크로도 같은 결과를 낼 수 있다고 본다(Eve의 지속 실행과 승인 대기 지원은 확인하지 않음). 사람 승인 대기열의 다른 예는 [[LLM-Workflow-Patterns-Chain-vs-Agent#콘텐츠 초안과 승인 대기열|콘텐츠 초안과 승인 대기열]], 노드별 모델 선택의 비용과 오판 비용은 [[LLM-Model-Tiers|모델 티어 라우팅]]에서 다룬다.

외주로 고객사 업무에 AI 자동화를 넣을 때는 workflow 정의, 승인 관문, 실패 정책과 trace 확인 방법을 납품물에 포함해 만든 사람 없이도 고객 팀이 운영하고 고칠 수 있게 한다. 런타임 계정, API 자격 증명과 trace 저장소는 고객 명의로 두고, trace에 남길 고객 데이터의 마스킹과 보존 기간을 정한다. 고객 업무를 개인 계정의 비서 루틴에 걸어 두지 않는다([[Dev-Outsourcing-Engagement#발주자의 계약 전 점검표|외주 통제권 점검]], 적용 제안).

## 파일 구조로 정의하는 Eve

2026-10-16 공식 소개와 agent-files 문서 대조 기준이다. Eve는 Markdown 지침과 스킬, TypeScript 도구를 디렉터리에서 발견해 에이전트로 구성한다. `instructions.md`가 기본 지침이고, `agent.ts`에서 모델과 런타임을 설정한다. `tools/`, `skills/`, `channels/`, `subagents/`는 기능의 배치를 드러낸다. 스킬은 관련 작업에 맞춰 불러온다.

도입 시에는 파일이 존재하는 것, 빌드가 인식한 것과 실제 호출된 것을 따로 확인한다. 같은 이름의 도구 충돌과 자식의 지침 및 권한 상속 여부도 점검한다. 이번 정리는 공식 구조 확인이며 배포와 장애 복구를 실행한 검증은 아니다.

## 자체 인프라에서 실행하는 Mecatl

2026-10-16 공식 저장소 기준, Mecatl은 모델 공급자, 저장소, 파일 시스템과 클라이언트를 실행 루프에서 분리한다. gRPC와 HTTP/SSE 연결, 도구 승인, 훅, 압축과 하위 에이전트를 제공한다. 외부 저장소의 세션과 이벤트로 프로세스 교체 뒤 저장한 작업을 복구한다.

Kubernetes 참조 런타임은 **Redis에 상태와 이벤트를 저장하고 Kubernetes lease로 세션별 단일 쓰기를 조정**한다. Redis만으로 실행 소유권을 정한다는 의미로 읽지 않는다. 임대 만료, 기존 작업자의 지연 종료와 외부 부수효과의 멱등성은 실제 배포에서 추가 검증할 조건이다.

## 조립된 하네스와 SDK를 구분하는 Strands

2026-10-16 공식 문서 기준, Strands harness는 도구, 문맥 관리, 세션, 메모리와 훅을 조합한 기본 구현이다. Strands Harness SDK는 그 구성을 직접 만드는 층이다. Python과 TypeScript에서 시작하며 모델 공급자를 교체할 수 있다.

기본 하네스로 시작해 필요한 항목만 바꾸는 것과, 실행 구조를 처음부터 구성하는 것은 유지할 책임이 다르다. 모델 선택의 자유가 공급자별 도구 호출, 캐시와 오류 응답의 동등성을 보장하지 않는다. [[Strands-Conversation-State|대화와 세션 상태]]에서 저장과 동시 쓰기 경계를 함께 본다.

## 공유 서비스와 Code Mode를 사용하는 OpenCode 2.0

2026-10-16 V2 공식 문서에서 MCP의 Code Mode 기본 사용과 백그라운드 하위 에이전트 호출을 대조했다. `execute`에서 여러 도구를 호출하고 중간 결과를 가공해 모델에 반환할 정보를 줄인다. 백그라운드 호출은 자식 세션을 시작한 뒤 부모가 계속 진행하도록 한다.

제공된 GeekNews 2026-10-15 발췌는 TUI, 웹과 데스크톱을 단일 백그라운드 서비스로 연결하는 개편, OpenAPI 연결, 80개 이상 내부 플러그인과 핫 리로드를 소개한다. 이 항목들의 전체 릴리스 구현은 이번에 대조하지 않았다. V1과의 플러그인 API, 서버 프로토콜과 설정 호환성을 확인한 뒤 이전한다.

## 플러그인 스킬을 관리형 런타임으로 옮기는 Claude Managed Agents

2026-10-21 Claude Platform 공식 문서와 `anthropics/financial-services` main(574ed36, 2026-09-21 커밋)의 earnings-reviewer cookbook 대조 기준이다. 스크립트는 읽어서 대조했고 배포와 실행은 하지 않았다. 같은 에이전트를 데스크톱 플러그인으로도 배포하는 구성은 [[Claude-Code-Domain-Applications#금융 참조 구현은 같은 스킬을 두 실행 경로로 배포한다|금융 참조 구현]]을 본다.

- **배포 순서**: `scripts/deploy-managed-agent.sh <slug>`는 cookbook의 `agent.yaml`에서 파일 참조를 풀고 스킬을 `/v1/skills`에 올린 뒤, 하위 에이전트를 먼저 만들고 오케스트레이터를 `/v1/agents`에 POST한다. 오케스트레이터는 플러그인과 같은 프롬프트 파일에 헤드리스 실행 지시를 덧붙여 쓰고, 하위 에이전트 셋은 cookbook에만 있는 인라인 프롬프트를 쓴다. 스크립트는 프롬프트 파일의 frontmatter를 떼지 않아 플러그인용 `tools` 줄도 시스템 프롬프트에 그대로 들어간다
- **권한 배치**: cookbook README의 3계층 격리 표는 비신뢰 입력인 실적 콜 속기록과 보도자료를 Read와 Grep만 가진 transcript-reader에, FactSet과 Daloopa 커넥터를 model-updater와 오케스트레이터에, 쓰기 권한을 커넥터 없는 note-writer에 둔다. 도구 설정의 주요 경계는 이 표와 맞는다. 커넥터는 `default_config`로 서버의 도구를 모두 켜므로 표의 읽기 전용은 설정이 아니라 표기이고, Create Agent의 `mcp_toolset`은 도구별 `configs`로 켤 도구를 정할 수 있다. cookbook은 `permission_policy`도 두지 않아 Permission policies 문서의 기본값대로 MCP 도구는 호출마다 승인(`always_ask`)을 기다리는데, 참조 스크립트 `orchestrate.py`는 승인 요청을 처리하지 않으며, 승인에 답하는 클라이언트가 없으면 세션은 응답을 무기한 기다린다. 워크플로우 엔진이 승인을 일괄 허용하면 그 단계는 감독이 되지 못한다(설계 점검)
- **분리의 한계**: Multiagent 문서 기준 MCP 서버는 에이전트마다 선언하지만 모든 에이전트가 같은 샌드박스, 파일시스템과 자격 증명 보관소를 쓰고, transcript-reader 밖의 세 에이전트도 Read를 가진다. note-writer는 원문을 직접 열지 말라는, model-updater는 신뢰할 출처만 읽으라는 프롬프트 지시만 받고, 오케스트레이터가 물려받는 플러그인 프롬프트는 오히려 속기록 전문을 직접 불러오라고 지시한다. 그래서 cookbook README가 밝힌 오케스트레이터의 비신뢰 문서 비접촉은 도구 설정으로도 프롬프트로도 보장되지 않는다. 도구 목록으로는 [[LLM-Application-Security#적응형 공격과 피해 반경 제한|Agents Rule of Two]] 방향의 분리지만, 오케스트레이터는 커넥터와 비신뢰 문서를 함께 다루고 위임과 인계로 상태 변경을 일으킬 수 있어 오케스트레이터 스레드(한 컨텍스트) 기준의 조건을 만족하지 않는다. transcript-reader도 도구를 가지고 그 출력이 텍스트로 오케스트레이터에 들어가므로 [[LLM-Application-Security#듀얼 LLM 격리 (Dual-LLM 패턴)|Dual-LLM 격리]]도 아니다. 공식 문서에서 하위 에이전트의 보고를 클라이언트가 검증한 뒤 넘기는 단계는 확인하지 못했다. 격리에 가깝게 하려면 오케스트레이터에는 속기록을 직접 불러오라는 플러그인 프롬프트 대신 관리형 전용 프롬프트를 주고, 커넥터 도구 가운데 속기록, 보도자료나 공시 본문을 돌려주는 것이 있으면 `configs`로 끈다. reader는 원문을 붙인 별도 세션으로 돌리고 워크플로우 엔진이 그 출력에서 수치와 열거값처럼 정해진 값만 코드로 검증해 오케스트레이터 세션에 넣으며 자유 텍스트는 사람이 검토한다. 쓰기 가능한 공유 파일시스템이 에이전트 사이의 통로가 되는 경로([[Agent-Swarm-Containment#멘탈 모델 — 쓰기 가능한 공유 자원은 곧 메시지 보드|공유 자원과 메시지 보드]])도 함께 막는다(설계 점검)
- **인계 신호**: 에이전트 간 인계(`handoff_request`)를 라우팅하는 `scripts/orchestrate.py`는 회사 워크플로우 엔진으로 바꿔야 할 참조 구현이다. 인계 요청은 오케스트레이터의 텍스트 출력에서 파싱하므로, 처리한 문서에 심어 둔 요청을 오케스트레이터가 되풀이하면 섞일 수 있다. 스크립트는 대상 에이전트 허용 목록과 페이로드 스키마 검증으로 이를 줄이고, 운영에서는 문서를 인용해 만들 수 없는 전용 도구 호출이나 타입이 정해진 SSE 이벤트로 인계를 내보내라고 권한다. 그렇게 바꿔도 인젝션이 모델을 움직여 그 도구를 부르게 하는 경로는 남으므로 허용 목록과 페이로드 검증은 유지한다(설계 점검)
- **API 필드 변화**: 저장소 루트 README는 하위 에이전트 위임(`callable_agents`)을 research preview로 표시하고, 스크립트는 하위 에이전트 본문에도 빈 `callable_agents`를 넣는다. 공식 release notes에서는 multiagent orchestration이 2026-05-06 public beta가 됐고, 현재 Create Agent 레퍼런스(`POST /v1/agents`)에는 `callable_agents`가 없으며 위임을 `multiagent` 필드(`coordinator` 또는 `multiagent_20261001` 타입)로 받는다. API가 `callable_agents`를 거절하는지 무시하는지는 확인하지 못했고, 거절한다면 하위 에이전트를 포함한 모든 생성 요청이 영향을 받는다. `coordinator` 타입은 지정한 하위 에이전트에 위임하고 advisor 모델에 물을 수 있지만 workflow 실행을 시작하거나 하위 에이전트를 직접 정의하지 못한다. `multiagent_20261001` 타입은 inline agent가 기본으로 켜지고 inline agent는 세션이 실행하는 에이전트(여기서는 오케스트레이터)의 모델, 도구, MCP 서버와 스킬을 쓰므로, 에이전트별 권한 분리를 유지하려면 `subagents`의 `inline_agents`를 `{"type": "disabled"}`로 두고 `predefined_agents`에 하위 에이전트를 넣는다. workflow를 쓰지 않으면 `workflows`를 `{"type": "disabled"}`로 끄고, 쓰면 그쪽 `inline_agents`도 끄고 `predefined_agents`를 하나 이상 둔다(inline agent를 끈 설정의 목록이 비면 요청이 400 오류로 실패한다)
- **출력 스키마**: `output_schema`는 현재 Create Agent 레퍼런스에 없는 필드이고, 배포 스크립트는 이를 모든 요청 본문에서 지운다. 스크립트 머리 주석과 `scripts/validate.py`는 이 스키마로 reader의 JSON을 하네스에서 검증한다고 적지만, 확인한 스크립트, 훅과 CI 어디에서도 그 래퍼나 validate.py를 호출하지 않는다. 배포된 reader는 필드와 길이 제한을 담은 스키마를 받지 못하고 스키마 검증 JSON만 반환하라는 프롬프트 지시를 받는다. `scripts/test-cookbooks.sh`는 dry-run 요청 본문의 형식만 검사하고 `output_schema`가 남으면 실패로 본다. reader 결과를 코드로 검증하려면 위 분리의 한계처럼 별도 세션의 출력을 워크플로우 엔진이 검증해 넘기고, 배포 전에는 `--dry-run`(API 호출 없이 요청 본문 출력) 결과를 현재 레퍼런스와 대조한다(운영 제안)

## 일회용 샌드박스의 파일 상태를 트랜잭션으로 남기는 Tines 3B

Tines 3B는 앱, 에이전트와 자동화를 만들고 운영하는 워크플로 플랫폼이다. 공식 소개 페이지는 워크플로의 각 단계가 다음 단계와 완전히 격리된 컴퓨터로 동작하고, 자격 증명은 투명 프록시로 런타임에 주입돼 빌더나 AI에게 보이지 않는다고 설명한다(2026-10-27 확인). 단계마다 새 Linux 샌드박스를 쓰고 버리면 저장소 clone이나 SQLite 파일처럼 단계를 넘어 남아야 하는 파일 상태가 문제가 된다. 3B를 만든 팀의 시각으로 쓴 2026-10-10 설계 글(Shayon Mukherjee)은 이를 버전 있는 파일시스템으로 푼다.

- **실행 단위 트랜잭션:** 샌드박스 실행과 그 실행의 파일 변경을 DB 트랜잭션처럼 다뤄, 전부 반영되거나 아무것도 반영되지 않는다. 실패한 단계는 아무것도 공개하지 않는다.
- **불변 스냅샷과 포인터:** 볼륨은 한 번 쓰면 바뀌지 않는 스냅샷들과 현재 스냅샷을 가리키는 포인터다. 새 스냅샷은 바뀐 노드만 다시 쓰고 나머지는 이전 스냅샷과 공유한다(copy-on-write). 포크는 같은 스냅샷을 가리키는 두 번째 포인터라 큰 볼륨도 싸게 분기하지만, 브랜치 사이의 파일 병합은 하지 않는다.
- **동시 공개:** 공개는 포인터에 대한 compare-and-swap이다. 서로 다른 파일의 변경은 새 스냅샷 위에 다시 적용하고, 같은 파일의 변경은 경로를 밝힌 충돌로 실패한다. 각 단계는 실행 내내 시작할 때의 스냅샷 하나만 읽는다. 충돌 처리의 정확한 의미는 아직 다듬는 중이라고 밝힌다.
- **저장 계층:** 쓰기 로그를 겸하는 append-only pack과 LSM 트리 색인을 쓰고, 그룹 커밋으로 여러 쓰기가 fsync 한 번을 나눠 쓰며, 봉인한 pack을 S3로 올린다. 로그의 끝은 EBS 볼륨 하나에 있어 볼륨을 잃으면 백그라운드 S3 사본 기준으로 약 1분 전 시점까지만 복구된다는 점과, 파일을 열 때 파일 전체를 로컬로 복사해 큰 파일에서 비용이 크다는 점을 한계로 밝힌다.

에이전트 런타임에 옮기면 작업 하나의 성공 판정과 그 작업이 남긴 파일 상태의 공개를 같은 단위로 묶는 설계다(해석). 이 방식이 막는 것은 실패한 실행의 부분 쓰기와 동시 실행의 같은 파일 덮어쓰기다. 글이 설명한 충돌 판정은 쓴 파일 기준이라, 실행 중 다른 실행이 파일 A를 바꿔 먼저 공개해도 A를 읽고 B만 쓴 실행은 충돌 없이 그 위에 공개될 수 있다(write skew, 해석). 설정 파일과 그 설정으로 만든 산출물처럼 여러 파일에 걸친 불변식은 한 파일에 담아 같은 파일 충돌로 잡히게 하거나, 공개된 스냅샷에서 불변식을 다시 검사하는 단계를 둔다(설계 점검). 외부 API 호출 같은 파일시스템 밖의 부수효과는 되돌리지 않으므로 멱등성과 승인 경계는 따로 설계한다. 쓰기 2ms 미만, 읽기 약 1ms라는 지연은 자체 운영 수치이며 이번에 재현하지 않았다.

## 코드와 평가를 묶어 배포하는 Cursor Agent SDK

2026-11-02 공식 발표 대조 기준, Cursor Agent SDK는 Markdown 지침, TypeScript 도구, 외부 연결과 eval을 하나의 프로젝트로 관리한다. PR이나 업무 이벤트로 동작하고, 하위 에이전트 위임, 평가와 이벤트 replay를 지원한다. 지침도 일반 코드처럼 변경 이력과 리뷰의 대상이 된다.

배포는 Cursor 관리 인프라와 자체 인프라가 구분된다. `agent-sdk deploy`는 관리 인프라에 URL을 만들며, 자체 실행은 단일 Node 프로세스를 컨테이너로 묶을 수 있다. 비밀과 연결을 관리하는 기능이 있어도 승인 범위와 외부 도구의 실제 권한이 자동으로 안전해지는 것은 아니다. 배포 경로, 재시도와 부수효과, 평가 입력과 운영 입력의 차이를 검토한다(운영 제안). 이번에는 배포하지 않았다.

## 작업 관리의 병목을 평가한다

코딩 에이전트의 품질은 작업 성공률과 사용자의 개입량으로 확인한다. 2026-10-09 공개 경험 글인 「Why Are Coding Agents So Dumb?」는 병렬화 부족, 모델별 위임 부재, 읽기 어려운 계획과 반복 승인 비용을 지적한다. 특정 시점의 사용 경험이며 모든 제품의 현재 결함을 입증한 결과는 아니다.

- 독립 작업은 병렬화할 수 있지만 같은 파일과 Git 상태를 바꾸는 작업은 소유권과 순서를 먼저 정한다.
- 모델 라우팅은 가격뿐 아니라 오판 비용, 재작업과 컨텍스트 인계 비용을 포함한다.
- 반복적인 확인을 줄일 때도 파일 시스템과 네트워크 경계는 실행 계층에서 강제한다.
- 완료 보고는 계획 항목의 체크보다 실행 결과와 산출물에 연결한다.

## 출처

- [Introducing eve — Vercel](https://vercel.com/blog/introducing-eve)
- [Agent Files — vercel/eve](https://github.com/vercel/eve/blob/main/docs/reference/agent-files.md)
- [Mecatl — Stacklok](https://github.com/stacklok/mecatl)
- [Strands Agents, Strands harness](https://strandsagents.com/docs/user-guide/harness/)
- [OpenCode, V2 Intro](https://opencode.ai/v2/docs/)
- [OpenCode, MCP servers](https://opencode.ai/v2/docs/mcp-servers)
- [OpenCode, Tools](https://dev.opencode.ai/v2/docs/tools/)
- [Why Are Coding Agents So Dumb? — Michael Lynch](https://mtlynch.io/why-are-coding-agents-so-dumb/)
- [Claude Platform Docs, Create Agent](https://platform.claude.com/docs/en/api/beta/agents/create)
- [Claude Platform Docs, Multiagent orchestration](https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration)
- [Claude Platform release notes — Claude Platform Docs](https://platform.claude.com/docs/en/release-notes/overview)
- [Claude Platform Docs, Permission policies](https://platform.claude.com/docs/en/managed-agents/permission-policies)
- [anthropics/financial-services — Anthropic](https://github.com/anthropics/financial-services) — 2026-10-21 main(574ed36) 기준 루트 `README.md`, `managed-agent-cookbooks/README.md`, earnings-reviewer cookbook(`managed-agent-cookbooks/earnings-reviewer/`의 `README.md`, `agent.yaml`, `subagents/*.yaml`), 루트 `scripts/`의 `deploy-managed-agent.sh`, `orchestrate.py`, `validate.py`, `test-cookbooks.sh`, `check.py`, 루트의 `.githooks/pre-commit`과 `.github/workflows/`, `plugins/agent-plugins/earnings-reviewer/agents/earnings-reviewer.md` 대조
- 사용자 제공 GeekNews 발췌: 2026-10-11 Eve와 코딩 에이전트, 2026-10-15 Mecatl과 OpenCode 2.0, 2026-10-16 Strands Harness SDK. 게시물 URL은 제공되지 않았다.
- [Tines 3B — Tines](https://www.tines.com/3b) — 공식 소개 페이지, 단계별 격리 실행과 프록시 자격 증명 주입을 2026-10-27 확인
- [A versioned filesystem for disposable sandboxes — Shayon Mukherjee](https://www.shayon.dev/post/2026/283/versioned-filesystem-for-disposable-sandboxes/) — 2026-10-10 개인 블로그의 설계 글, 트랜잭션 공개, 스냅샷과 포크, 충돌 처리와 한계를 2026-10-27 대조
- 사용자 제공 GeekNews 알림 요약(2026-10-16~27): Tines 3B의 버전 관리 파일시스템. 게시물 URL은 확인하지 못했고 위 원문으로 대조했다.

- [Introducing the Agent SDK — Cursor](https://cursor.com/blog/agent-sdk) — 2026-10-20 GA 발표, 2026-11-02 코드 정의, eval/replay와 배포 경로 부분 대조.
- [Could this just be a markdown file? — Builder's Day, CJ Brewer](https://builders.day/stream?session=cj-brewer) — 세션 페이지의 행사일 2026-10-26(사전 녹화 공개)을 2026-11-08 확인. 발표자는 workflow DSL과 관리형 런타임을 제공하는 Swirls AI의 공동창업자다. YouTube 영상(rBhzu8_qGjQ, 2026-10-27 업로드)의 00:05~21:06 로컬 음성 전사와 설명란을 2026-11-08 대조했고, 모델의 판단 정확도와 비용 주장은 검증하지 않음

## 관련 문서

- [[Agent-Declarative-Runtime|선언형 에이전트 런타임]]
- [[Harness-Anatomy|하네스 구성요소]]
- [[Agent-Loop-Engineering|루프와 정지 조건]]
- [[Strands-Conversation-State|Strands 대화와 세션 상태]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agentic-Verification|에이전트 기반 검증]]
- [[Claude-Code-Domain-Applications|금융 참조 구현의 두 배포 경로]]
