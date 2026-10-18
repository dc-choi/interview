---
tags: [palantir, ai-fde, agent, skill, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI FDE와 AIP Skills"]
---

# AI FDE의 문맥, 도구와 재사용 지침

AI FDE는 Foundry를 대화형으로 조작하는 개발 agent다. 별도 service account가 아니라 현재 사용자의 session과 권한으로 실행하며 AIP enablement가 필요하다. Ontology 변경에는 Global Branching enablement가 권장된다. 코드를 async function으로 배포하는 [[Palantir-Pro-Code-Agents]]와 실행 모델이 다르다.

## Mode와 capability는 문맥 구성이다

Mode는 data integration/connection, Ontology/function, exploration, governance, machine learning과 OSDK React 같은 작업 범위에 맞춰 문서와 도구를 고른다. Capability는 mode 전환, 질문, 계획, 문서/skill 로드, context 관리와 실제 domain 동작 같은 세부 기능이다.

사용자나 agent가 mode를 바꿀 수 있고 Manage capabilities를 켜면 agent도 활성 도구를 조정할 수 있다. 따라서 처음 고른 mode를 영구적인 권한 경계로 보지 않는다. 실제 서버 permission과 tool approval은 별도다.

Context는 처음 최소 상태에서 시작해 resource 첨부, drag/drop, 문서 bundle과 search tool로 늘린다. Datasets/functions/branches/interfaces/actions/object types 등을 넣을 수 있다. Chat outline은 prompt/응답/tool과 message token 수를 보여주며 요약/삭제로 context를 관리한다. 문맥 감소가 이미 수행한 외부 변경의 취소를 뜻하지 않는다.

## Approval과 서버 인가는 서로 다른 검사다

Default/main 변경, unbranched resource 생성과 dataset build 같은 부수효과에는 tool approval이 필요하다. 공식 security 문서는 Ontology Action, app/widget 생성, publish/tag는 매번 확인하고 branch-aware file edit/build는 feature branch에서 auto-approve될 수 있다고 설명한다. Session의 branch/project 범위 pre-approval도 가능하다. 실제 도구별 설정을 확인한다.

기본 변경은 branch proposal/PR로 제시하지만 승인된 mutation이 언제나 harmless하거나 자동 rollback된다는 뜻은 아니다. 대표 sample로 transform/function preview, CI와 생성 자원을 검토하고 production 반영을 따로 판단한다.

Session은 작성자만 접근하며 생성 때 사용자가 접근 가능한 marking을 적용한다. 이후 그 marking 접근을 잃으면 session도 못 열고 권한을 회복하면 다시 열 수 있다. API/audit와 LLM 사용량은 사용자 identity에 귀속된다. AI FDE가 사용자의 권한을 넘어선 service identity를 갖는 구조로 설명하지 않는다.

## Skill은 활성화와 실제 로드를 구분한다

AIP skill은 name/적용 description/Markdown body로 구성하며 project/folder의 permission을 상속한다. Description은 언제 지침을 로드할지 결정하는 입력이므로 구체적인 작업 조건을 적는다. Skill을 session에 추가하고 enable한 뒤 Load skills capability도 켜야 자동 로드할 수 있다.

This session에 추가한 skill은 해당 session만 유지된다. Personal skill set에 저장하면 새 session에 기본 추가하며 enable 상태도 저장한다. Skill set 저장의 Apply to current session은 기본 선택돼 현재 목록을 교체하므로 session-only skill이 빠질 수 있다.

**Skill을 disable해도 이미 conversation에 로드한 지침은 남는다.** 신규 자동 loading 차단과 기존 문맥 제거를 구별한다. Shared skill의 저장 권한과 지침 내용도 함께 검토한다.

## Pre-fill URL은 시작 문맥을 전달한다

`/workspace/ai-fde/prefill`의 prompt, 반복 가능한 skillRid와 autoStart를 URL encode해 전달한다. 기본 autoStart=false여서 사용자가 검토한 뒤 보낸다. true는 prompt/skill 중 하나가 있어야 의미가 있고 page load 때 작업을 시작하지만 기존 tool approval을 우회하지 않는다.

긴 공통 지침은 skill로, 선택 객체나 구체 수정 요청은 prompt로 나누면 링크 전체를 고치지 않고 공통 절차를 갱신할 수 있다. URL에 넣은 문맥은 공유/기록 경로에 노출될 수 있으므로 민감한 원문을 무분별하게 넣지 않는 것은 이 전달 방식에서 도출한 설계상 주의다.

## 생성 품질과 기반 자원 사용을 관찰한다

작업을 작은 단계로 나누고 필요한 context/tool만 제공한다. Agent의 preview와 test 성공을 최종 업무 정확성으로 확정하지 않는다. Function 변경은 AIP Evals 사례와 기준으로 전후를 비교한다.

AI FDE는 짧은 간격으로 수십 작업을 연속/동시 실행할 수 있어 사람의 조작 빈도에서 드러나지 않던 storage I/O/capacity, CPU/GPU와 network 병목을 만들 수 있다. 사용자 세션 수와 작업 병렬성을 함께 고려한다. 벤더의 개발 효율 소개를 실측 성능 보증으로 사용하지 않는다.

## AIP Evolve는 후보 개선과 검토를 연결한다

Jupyter/RStudio의 workspace agent는 terminal 실행, package 설치와 파일 작성 같은 local tool을 사용한다. 2025년 11월 experimental 안내에서는 shutdown/restart 뒤 chat history를 보존하지 않았으므로 코드/model output을 따로 sync해야 했다. AI FDE session의 보존/권한 계약과 workspace 안의 임시 대화를 같은 것으로 취급하지 않는다.

AIP Evolve는 target/goal/validation strategy/iteration limit를 정해 여러 AI FDE agent가 모델 전환, 비용/지연/평가 개선안을 탐색하게 한다. Ontology에 Marketplace product 설치와 target/test 자원 접근이 필요하다. Agent graph에서 작업과 산출물을 보고 proposal의 baseline/candidate 비교, confidence와 제한을 검토한 뒤 필요한 Global Branch proposal을 확인한다. Resume으로 추가 지침과 함께 계속할 수 있다.

공식 cost optimization 화면의 특정 모델 교체와 비용 절감률은 10개 사례를 사용한 예시다. 이를 모든 workload에서 같은 효과가 나는 검증 결과로 일반화하지 않는다. 후보가 통과한 사례의 범위와 production 반영 판단은 분리한다.

AI FDE의 Evals tool은 suite/function 둘 다 고쳐 실패를 해결할 수 있다. 2026년 4월 지원은 manual primitive/array/struct/model/object/set과 built-in/custom evaluator였고 object-set-backed case/multi-target/run dataset/Marketplace evaluator는 제외됐다. 평가 기준을 약하게 바꿔 pass한 경우를 실제 품질 개선과 구분하고 suite 변경도 함께 review한다.

AI FDE의 Automate tool은 2026년 8월 time/object condition, Action/Logic/notification effect, retry/fallback, scope와 pause/resume을 지원했지만 time-series/stream/dataset/metric condition과 function/agent effect, 기존 automation에 effect 추가, history/manual run/telemetry는 제외했다. Downstream 대기 test의 timeout을 실제 미실행 확정으로 해석하지 않는다. 도구의 지원은 Automate 앱 전체 기능과 다르다.

## 출처

- [Palantir, AI FDE](https://www.palantir.com/docs/foundry/ai-fde/overview)
- [Palantir, Modes and capabilities](https://www.palantir.com/docs/foundry/ai-fde/modes-and-capabilities)
- [Palantir, Navigation](https://www.palantir.com/docs/foundry/ai-fde/navigation)
- [Palantir, AIP skills](https://www.palantir.com/docs/foundry/ai-fde/aip-skills)
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
