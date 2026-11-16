---
tags: [palantir, ai-fde, agent, skill, governance]
status: done
verified_at: 2026-11-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI FDE와 AIP Skills"]
---

# AI FDE의 문맥, 도구와 재사용 지침

AI FDE는 Foundry를 대화형으로 조작하는 개발 agent다. 별도 service account가 아니라 현재 사용자의 session과 권한으로 실행하며 AIP enablement가 필요하다. Ontology 변경에는 Global Branching enablement가 권장된다. 코드를 async function으로 배포하는 [[Palantir-Pro-Code-Agents]]와 실행 모델이 다르다.

Model은 enrollment에서 활성화된 것만 쓸 수 있고, 2026-11-16 수집한 overview는 Anthropic, OpenAI, Google, xAI model을 native tool API와 함께 first-class로 지원한다고 적는다. 같은 문서는 AIP 기능 가용성이 바뀔 수 있고 고객마다 다를 수 있다고 덧붙이므로 실제 선택지는 enrollment에서 확인한다. First-class 지원 목록을 사용 가능한 model 전체로 보지 않으며, 등록 model의 사용 조건은 [[Palantir-Registered-Models-and-Provider-Proxies|모델 등록과 provider proxy]]에서 본다.

## Mode와 capability는 문맥 구성이다

Mode는 data integration/connection, Ontology/function, exploration, governance, machine learning과 OSDK React 같은 작업 범위에 맞춰 문서와 도구를 고른다. Capability는 mode 전환, 질문, 계획, 문서/skill 로드, context 관리와 실제 domain 동작 같은 세부 기능이다.

사용자나 agent가 mode를 바꿀 수 있고 Manage capabilities를 켜면 agent도 활성 도구를 조정할 수 있다. 따라서 처음 고른 mode를 영구적인 권한 경계로 보지 않는다. 실제 서버 permission과 tool approval은 별도다.

Mode는 사용자가 Modes 메뉴에서 직접 고르거나, 과제만 설명하면 agent가 prompt를 보고 골라 그 mode의 context와 tool을 정한다. Mode에 따라 function 작성 언어나 Pipeline Builder 대신 transforms를 쓸지 같은 추가 설정이 붙는다. 공식 navigation 문서는 과제에 필요한 tool만 켜야 model이 더 잘 동작한다고 안내한다.

Mode 목록에는 Foundry 동작 방식에 대한 일반 질문을 다루는 Platform Q&A도 있다. 세부 설정은 data integration의 Python transforms/Pipeline Builder, function editing의 언어, machine learning의 Model Studio(no-code)/pro-code와 선호 코드 편집 환경이며, agent는 이 선택으로 읽을 문서와 호출할 tool을 정한다. 2026-11-16 수집한 modes 문서 기준이다.

Capability는 하나 이상의 tool에 대응하며 agent capability와 domain capability로 나뉜다. Agent capability는 mode 전환, 객관식/자유 서술 질문, 실행 전 계획 초안, 문서/skill 로드, context/capability 관리처럼 agent가 자신을 관리하고 소통하는 기능이다. Domain capability는 filesystem의 폴더 생성, resource 탐색과 이동, Notepad 문서 편집, solution design diagram 편집, ontology object에 대한 Action 실행처럼 Foundry에서 실제로 수행하는 동작이며 공식 목록은 이것으로 한정하지 않는다. 계획 검토나 질문 기능이 있어도 변경 작업은 아래 security 문서 기준의 approval과 사용자 권한 범위에서 따로 통제된다. 개별 domain capability별 approval 동작은 도구 설정에서 확인한다.

Context는 처음 최소 상태에서 시작한다. 공식 overview는 이 최소 초기 상태를 관련 없는 정보가 추론을 흐리는 context pollution을 막고 model의 능력과 지식 경계를 통제하는 설계로 설명한다. 이후 resource 첨부, drag/drop, 문서 bundle, media 업로드와 search tool로 늘린다. 입력란 위 ribbon에서는 datasets/functions/branches/interfaces/action types/object types 같은 Foundry resource를 고를 수 있다. Chat outline은 prompt/응답/tool과 message token 수를 보여주며 요약/삭제로 context를 관리한다. 문맥 감소가 이미 수행한 외부 변경의 취소를 뜻하지 않는다.

## Approval과 서버 인가는 서로 다른 검사다

Default/main 변경, unbranched resource 생성과 dataset build 같은 부수효과에는 tool approval이 필요하다. 공식 security 문서는 Ontology Action, app/widget 생성, publish/tag는 매번 확인하고 branch-aware file edit/build는 feature branch에서 auto-approve될 수 있다고 설명한다. Session의 branch/project 범위 pre-approval도 가능하다. 검색과 정의 읽기 같은 read-only 작업은 auto-approve되며, 기본값은 production workflow에 영향을 줄 수 있는 작업을 자동 승인하지 않는 쪽이다. 실제 도구별 설정을 확인한다. 서버 인가는 OSDK app 생성, ontology 편집, dataset build와 code repository 작업에 똑같이 적용되고 권한 오류도 사용자가 직접 수행할 때와 같다. 그래서 AI FDE에서 권한 오류가 나면 agent 설정이 아니라 사용자의 Foundry 권한부터 확인한다.

기본 변경은 branch proposal/PR로 제시하지만 승인된 mutation이 언제나 harmless하거나 자동 rollback된다는 뜻은 아니다. 대표 sample로 transform/function preview, CI와 생성 자원을 검토하고 production 반영을 따로 판단한다.

Session은 작성자만 접근하며 생성 때 사용자가 접근 가능한 marking을 적용한다. 이후 그 marking 접근을 잃으면 session도 못 열고 권한을 회복하면 다시 열 수 있다. API/audit와 LLM 사용량은 사용자 identity에 귀속되며, 사용량 추적과 rate limiting도 사용자 단위로 적용된다. 활동은 AI FDE session log와 표준 Foundry audit log 양쪽에 남는다. AI FDE가 사용자의 권한을 넘어선 service identity를 갖는 구조로 설명하지 않는다.

## Skill은 활성화와 실제 로드를 구분한다

AIP skill은 name/적용 description/Markdown body로 구성하며 project/folder의 permission을 상속한다. Description은 언제 지침을 로드할지 결정하는 입력이므로 구체적인 작업 조건을 적는다. Skill을 session에 추가하고 enable한 뒤 Load skills capability도 켜야 자동 로드할 수 있다.

This session에 추가한 skill은 해당 session만 유지된다. Personal skill set에 저장하면 새 session에 기본 추가하며 enable 상태도 저장한다. Skill set 저장의 Apply to current session은 기본 선택돼 현재 목록을 교체하므로 session-only skill이 빠질 수 있다.

**Skill을 disable해도 이미 conversation에 로드한 지침은 남는다.** 신규 자동 loading 차단과 기존 문맥 제거를 구별한다. Shared skill의 저장 권한과 지침 내용도 함께 검토한다.

관리자는 Control Panel의 AI FDE extension에서 enrollment별로 skill을 promote해 새 session에 기본으로 켤 수 있다. 대상은 enrollment의 모든 AI FDE 사용자나 선택한 user group이며, group 대상은 선택한 group 중 하나에만 속해도 해당한다. 사용자는 자기 skill set이나 현재 session에서 promoted skill을 끌 수 있고 그 선택이 enrollment 기본값보다 우선한다. 따라서 promotion은 팀 관례를 새 session에 기본 활성화로 배포하는 수단이지 모든 session에 강제되는 정책이 아니다. 활성화된 skill도 실제 로드는 앞의 description 판단과 Load skills capability를 따른다.

Promotion은 skill resource의 접근 권한을 바꾸지 않아 사용자에게 그 skill의 view 권한이 따로 있어야 한다. Skill은 지침만 제공하고 권한을 더하지 않으므로, promoted skill을 따를 때도 AI FDE는 사용자의 기존 data/operation 권한 안에서만 동작한다. 권한 부여가 필요한 작업을 skill 배포로 해결하려 하지 않는다.

## Pre-fill URL은 시작 문맥을 전달한다

`/workspace/ai-fde/prefill`의 prompt, 반복 가능한 skillRid와 autoStart를 URL encode해 전달한다. 기본 autoStart=false여서 사용자가 검토한 뒤 보낸다. true는 prompt/skill 중 하나가 있어야 의미가 있고 page load 때 작업을 시작하지만 기존 tool approval을 우회하지 않는다.

긴 공통 지침은 skill로, 선택 객체나 구체 수정 요청은 prompt로 나누면 링크 전체를 고치지 않고 공통 절차를 갱신할 수 있다. URL에 넣은 문맥은 공유/기록 경로에 노출될 수 있으므로 민감한 원문을 무분별하게 넣지 않는 것은 이 전달 방식에서 도출한 설계상 주의다.

## 생성 품질과 기반 자원 사용을 관찰한다

AI FDE는 action을 실행하고 결과를 관찰해 다음 action을 정하는 closed-loop로 동작한다. 공식 overview가 예로 드는 자기 검증 수단에는 transform preview, function preview와 Code Repositories의 CI check 확인이 있다. 이 자기 검증을 업무 결과의 검수로 해석하지 않는다.

작업을 작은 단계로 나누고 필요한 context/tool만 제공한다. Agent의 preview와 test 성공을 최종 업무 정확성으로 확정하지 않는다. Function 변경은 AIP Evals 사례와 기준으로 전후를 비교한다.

전체 통과율과 항목별 회귀를 함께 본다. DevCon 5 시연의 agent 생성 요약 표는 10개 사례의 전체 통과가 1개에서 9개로 늘었지만 severity 일치는 10개에서 9개로 줄었다고 표시한다. 화면의 요약을 실제 실행 기록의 독립 검증으로 간주하지 않으며, 반복 수정에 사용한 사례의 통과율을 새로운 운영 데이터의 정확도로 일반화하지 않는다. (2026-10-18 [시연 7분 55초 화면](https://www.youtube.com/watch?v=pyudERNI1Qo&t=475s) 확인)

같은 시연은 운영자의 거절 이유를 대상 객체와 실행 기록에 연결하고, 실패를 재현하는 평가 사례를 추가한 뒤 Logic을 수정하는 흐름을 보여준다. 피드백 저장, 평가 통과와 production 반영을 각각 확인한다. 이 흐름을 기반 모델의 가중치가 즉시 학습되는 과정으로 설명하지 않는다. ([시연 10분 12초 이후](https://www.youtube.com/watch?v=pyudERNI1Qo&t=612s))

AI FDE는 짧은 간격으로 수십 작업을 연속/동시 실행할 수 있어 사람의 조작 빈도에서 드러나지 않던 storage I/O/capacity, CPU/GPU와 network 병목을 만들 수 있다. 사용자 세션 수와 작업 병렬성을 함께 고려한다. 벤더의 개발 효율 소개를 실측 성능 보증으로 사용하지 않는다.

## AIP Evolve는 후보 개선과 검토를 연결한다

Jupyter/RStudio의 workspace agent는 terminal 실행, package 설치와 파일 작성 같은 local tool을 사용한다. 2025년 11월 experimental 안내에서는 shutdown/restart 뒤 chat history를 보존하지 않았으므로 코드/model output을 따로 sync해야 했다. AI FDE session의 보존/권한 계약과 workspace 안의 임시 대화를 같은 것으로 취급하지 않는다.

AIP Evolve는 target/goal/validation strategy/iteration limit를 정해 여러 AI FDE agent가 모델 전환, 비용/지연/평가 개선안을 탐색하게 한다. Ontology에 Marketplace product 설치와 target/test 자원 접근이 필요하다. Agent graph에서 작업과 산출물을 보고 proposal의 baseline/candidate 비교, confidence와 제한을 검토한 뒤 필요한 Global Branch proposal을 확인한다. Resume으로 추가 지침과 함께 계속할 수 있다.

공식 cost optimization 화면의 특정 모델 교체와 비용 절감률은 10개 사례를 사용한 예시다. 이를 모든 workload에서 같은 효과가 나는 검증 결과로 일반화하지 않는다. 후보가 통과한 사례의 범위와 production 반영 판단은 분리한다.

DevCon 6의 지연 최적화 proposal도 검증 범위와 측정 방법을 함께 읽어야 한다. 최종 화면은 5개 사례를 제시하며 baseline은 평가 실행, candidate는 branch preview에서 측정했다고 명시한다. 실행하지 못한 assembly 경로, delivery 100개 조회 한도와 빠진 provenance 필드도 남아 있다. 개선율과 confidence만으로 동작 보존을 확정하지 않고 미실행 경로와 누락 필드의 업무 영향을 검토한다. (2026-10-18 [시연 15분 24초 이후 화면](https://www.youtube.com/watch?v=GZHSCMz6Aio&t=924s) 확인)

AI FDE의 Evals tool은 suite/function 둘 다 고쳐 실패를 해결할 수 있다. 2026년 4월 지원은 manual primitive/array/struct/model/object/set과 built-in/custom evaluator였고 object-set-backed case/multi-target/run dataset/Marketplace evaluator는 제외됐다. 평가 기준을 약하게 바꿔 pass한 경우를 실제 품질 개선과 구분하고 suite 변경도 함께 review한다.

AI FDE의 Automate tool은 2026년 8월 time/object condition, Action/Logic/notification effect, retry/fallback, scope와 pause/resume을 지원했지만 time-series/stream/dataset/metric condition과 function/agent effect, 기존 automation에 effect 추가, history/manual run/telemetry는 제외했다. Downstream 대기 test의 timeout을 실제 미실행 확정으로 해석하지 않는다. 도구의 지원은 Automate 앱 전체 기능과 다르다.

## 출처

- [Palantir, AI FDE](https://www.palantir.com/docs/foundry/ai-fde/overview)
- [Palantir, Modes and capabilities](https://www.palantir.com/docs/foundry/ai-fde/modes-and-capabilities)
- [Palantir, Navigation](https://www.palantir.com/docs/foundry/ai-fde/navigation)
- [Palantir, AIP skills](https://www.palantir.com/docs/foundry/ai-fde/aip-skills)
- [Palantir, Admin configuration](https://www.palantir.com/docs/foundry/ai-fde/admin-configuration)
- [Palantir, Pre-fill sessions](https://www.palantir.com/docs/foundry/ai-fde/prefill-sessions)
- [Palantir, Security and governance](https://www.palantir.com/docs/foundry/ai-fde/security-and-governance)
- [Palantir, Best practices for using AI FDE](https://www.palantir.com/docs/foundry/ai-fde/best-practices)
- [Palantir, AIP Evolve](https://www.palantir.com/docs/foundry/aip-evolve/overview)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)

## 관련 문서

- [[Palantir-Pro-Code-Agents|배포형 agent의 scope와 비동기 실행]]
- [[Palantir-AIP-Logic-and-Evaluation|평가와 업무 변경]]
- [[Palantir-Organization-and-Session-Controls|Session과 조직 경계]]
