---
tags: [palantir, aip, llm, evaluation, human-in-the-loop, authorization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir AIP Logic and Evaluation", "팔란티어 AIP 로직과 평가"]
---

# Palantir AIP Logic과 평가

AIP는 업무 데이터와 Ontology 위에 AI 흐름을 연결하는 도구군이다. 그중 Logic은 입력, 모델 호출과 도구, 함수, 조건과 출력을 블록으로 구성하는 함수 개발 환경이다. Evals는 함수의 결과를 사례와 지표로 비교하는 평가 환경이다. 모델의 응답 생성, 업무 변경의 인가와 운영 품질 검증을 각각 설계해야 한다. [AIP overview](https://www.palantir.com/docs/foundry/aip/overview), [Logic overview](https://www.palantir.com/docs/foundry/logic/overview)

2026-10-16 공식 문서 대조 기준이다. 아래 예시는 설계 적용이며 Foundry에서 실행하거나 평가 점수, 권한 거부와 비용을 측정한 결과는 아니다. AIP의 확장성과 개발 효율 소개는 벤더 설명이며 이 기록의 실측 보증이 아니다.

## 모델 호출과 업무 변경을 연결하는 계약

Logic 함수는 문자열과 객체 등을 받아 값, 객체 또는 편집 결과를 만든다. 블록의 출력은 후속 블록의 입력으로 사용한다. Ontology에 편집을 반영하려면 함수를 publish한 뒤 Action을 통해 호출해야 한다. 화면에서 Logic 함수를 호출했다는 사실만으로 편집이 반영되지는 않는다. [Core concepts](https://www.palantir.com/docs/foundry/logic/core-concepts)

| 구성 | 역할 | 설계에서 확인할 것 |
|---|---|---|
| Use LLM | Prompt, 제공 도구와 출력으로 모델 호출 구성 | 필요한 객체 속성만 문맥에 포함했는가? |
| Query objects 도구 | 지정 타입과 속성 조회 | 조회 권한과 반환 범위가 적절한가? |
| Call function 도구 | 모델이 선택한 함수 실행 | 호출 가능한 함수와 입력 계약이 한정돼 있는가? |
| Apply actions 도구 | 모델이 Action 사용 요청 | 대상, 인자와 변경 허용 조건이 적절한가? |
| Apply action 블록 | 모델 선택 없이 지정 Action 호출 | 인자를 명시적으로 연결했는가? |
| Execute function 블록 | 기존 함수 호출 | 이미 있는 계산과 검색을 재사용할 수 있는가? |

LLM은 도구 호출을 요청하고 Logic이 실행한다. 변경이 이미 정해졌다면 모델에게 도구 선택을 반복시키지 않고 Apply action 블록으로 연결할 수 있다. 함수에 Apply action 블록이 있어도 실제 쓰기에는 Action 실행 문맥이 필요하다. [Blocks](https://www.palantir.com/docs/foundry/logic/blocks)

예를 들어 장애 신고를 분류하는 흐름은 `신고 입력 → 유사 사례 조회 → 분류 제안 → 업무 조건 확인 → 담당자 배정 Action`으로 나눈다. 모델이 분류를 제안하는 권한과 담당자를 실제로 바꾸는 권한은 다른 경계다. 서버의 제출 조건, 동시성과 외부 효과는 [[Palantir-Actions-and-Functions]]에서 다룬다.

## 실행 주체와 로그 공개 범위를 함께 정한다

Logic의 기본 실행 모드는 user-scoped다. Project-scoped를 선택하면 권한과 로그 열람 범위가 달라진다. [Execution mode settings](https://www.palantir.com/docs/foundry/logic/execution-mode-settings)

| 모드 | 실행 권한 | 실행 로그 |
|---|---|---|
| User-scoped | 실행 사용자 권한 | 사용자 자신의 실행만 열람, 문서상 24시간 보존 |
| Project-scoped | 함수를 담은 프로젝트 권한 | 프로젝트 접근자에게 공개, run history dataset 설정 가능 |

Project-scoped는 사용하는 자원을 같은 프로젝트로 import해야 하며 사용자는 해당 자원의 markings에도 접근할 수 있어야 한다. Run history dataset은 최근 10,000회 실행을 보존한다고 명시돼 있다. 따라서 모든 Logic 호출을 개인 사용자 권한으로만 실행한다고 일반화하지 않는다. 보존 기간과 로그 접근자는 실제 enrollment 설정에서도 확인한다.

읽기 시점의 행/열 정책은 모델 문맥으로 읽을 수 있는 데이터를 제한하지만 생성된 답과 Ontology 쓰기에 같은 정책을 자동 부착하지 않는다. 출력, 로그와 목적지의 보호를 별도로 구성한다. [Logic security](https://www.palantir.com/docs/foundry/logic/overview), [[Palantir-Security-and-Governance|보안 전파와 읽기 필터의 차이]]

## 모델 데이터 접근 정책은 요청 토큰을 검사한다

AIP의 mandatory Marking allowlist는 prompt에 실린 데이터의 표식만 검사하는 기능이 아니다. 요청 토큰에서 접근 가능한 mandatory markings가 모두 allowlist 안에 있어야 한다. 대화형 사용과 자동화 요청에 같은 검사가 적용된다. [Control LLM data access with Markings](https://www.palantir.com/docs/foundry/aip/control-llm-data-access-with-markings)

| 모델 allowlist | 요청 토큰 markings | 결과 |
|---|---|---|
| A, B | 없음 | 이 검사 통과 |
| A, B | A, B | 이 검사 통과 |
| A, B | A, C | 요청 데이터에 C가 없어도 거부 |

Allowlist는 입력에 특정 marking이 반드시 붙어 있어야 한다는 요구가 아니다. Scoped session으로 토큰의 markings를 줄일 수 있다. 등록 모델의 개별 정책을 설정하면 enrollment 정책과 교집합을 취하는 대신 그 정책을 대체하며, 더 느슨한 설정도 가능하다. 중앙 정책만 확인하지 말고 실제 선택한 모델의 override까지 확인한다.

제3자 호스팅 모델에 대한 prompt/completion 미보관과 학습 미사용은 Palantir가 기술적, 계약적으로 확보한다고 설명하는 정책이다. 이를 임의 외부 모델, BYOM 연결과 고객 앱의 로그에도 적용되는 보편 보증으로 확대하지 않는다. 처리 리전 역시 모델 서비스의 제약에 따라 달라진다. [AIP security and privacy](https://www.palantir.com/docs/foundry/aip/aip-security)

## Staged writes와 사람의 승인은 다르다

Staged writes는 실행 중 편집을 임시로 모으고 같은 실행의 후속 읽기에 보이게 하는 쓰기 방식이다. 중첩된 함수와 Action의 편집도 함께 다룬다. 사람의 승인을 기다리는 기능 자체를 의미하지 않는다. 확인일 기준 beta이며 새 함수의 기본 활성화는 출시 예정으로 적혀 있다. [Staged writes](https://www.palantir.com/docs/foundry/logic/staged-writes)

| 구분 | 편집과 자동화 연결 |
|---|---|
| Legacy Logic | Ontology edits 목록을 반환, Automate의 Logic effect로 연결 가능 |
| Staged-write Logic | 편집 목록 대신 다른 값을 반환 가능, Action type으로 감싸 Automate의 Action effect로 호출 |
| Human-review proposal | Action을 즉시 반영하지 않고 제안으로 두었다가 검토자가 수락하면 실행 |

편집 목록을 반환하던 함수에서 staged writes를 켜면 출력 계약 변경으로 새 major version이 발행된다. 기존 Action과 자동화의 버전 범위는 major 경계를 넘어 자동 갱신되지 않는다. 전환할 때는 생성된 Action type과 자동화 effect까지 연결을 바꿔야 한다. 이 쓰기 방식이 외부 API까지 하나의 트랜잭션으로 만든다고 해석하지 않는다.

고영향 변경은 Automate에서 proposal로 구성하고 변경 대상과 제안 내용을 확인한 뒤 수락하게 할 수 있다. 자동화 통합 문서는 열린 제안을 생성자만 24시간 볼 수 있다는 제한도 명시하므로 장기 승인 대기함이나 여러 검토자 운영을 전제하기 전에 확인한다. [Automate AIP Logic](https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate)

## 평가는 문장 품질과 변경 결과를 함께 본다

Evaluation suite는 test cases, target functions와 evaluation functions의 묶음이다. 사례별 입력과 기대 결과에 대해 평가 함수가 metrics를 계산한다. Logic, chatbot 함수와 코드로 작성한 함수의 버전 또는 모델을 비교하고 반복 실행의 편차를 확인할 수 있다. [AIP Evals](https://www.palantir.com/docs/foundry/aip-evals/overview)

장애 신고 예시에서는 다음처럼 평가 기준을 분리한다. 이 표는 제안 기준이며 제품에 기본 탑재된 통과 지표 목록은 아니다.

| 평가 대상 | 확인 예시 |
|---|---|
| 분류와 근거 | 올바른 유형, 근거 사례 참조, 근거 없는 단정 억제 |
| 도구 선택 | 불필요한 편집 없음, 필수 조회와 입력 충족 |
| 객체 변경 | 올바른 신고에 올바른 담당자 배정, 타 객체 변경 없음 |
| 실패와 거부 | 정보 부족, 접근 거부와 사용자 거절 처리 |
| 운영성 | 지연, 사용량과 재시도 중 중복 효과 |

Ontology 편집을 포함한 test case는 simulation에서 실행해 실제 Ontology를 바꾸지 않는다. 편집 평가는 Boolean/숫자를 반환하는 TypeScript 평가 함수나 intermediate parameters로 구성한다. 생성 객체는 simulation 안에서 식별 속성으로 찾고, 수정 객체는 변경 후 속성을 확인하며, 삭제 객체는 식별자로 검색해 부재를 확인한다. [Evaluate Ontology edits](https://www.palantir.com/docs/foundry/aip-evals/ontology-edits)

이 simulation 설명만으로 외부 호출, 운영 권한과 동시성까지 검증됐다고 결론 내리지 않는다. Production 호출 경로와 거부 조건은 별도 시험한다.

모델과 prompt를 입력 파라미터로 빼면 experiments가 조합별 grid search를 수행한다. 전체 실험은 AIP Evals의 run별, 사례별 결과로 비교한다. Logic의 Most recent run은 조합 전체가 아니라 마지막 run만 보여 준다. [Run experiments](https://www.palantir.com/docs/foundry/aip-evals/experiments)

## 운영에서는 실행 이력과 용량 제한을 함께 본다

Workflow Lineage는 metrics, execution history, distributed tracing, logging과 log search를 제공한다. 성공 응답만 세지 말고 조회, 모델 호출과 Action 실패가 어느 단계에서 났는지 연결한다. [Ontology and AIP observability](https://www.palantir.com/docs/foundry/aip/aip-observability)

모델 용량은 TPM과 RPM으로 관리한다. Project에 귀속되는 Logic, Automate와 Workshop 등의 요청은 enrollment/project 한도를, 사용자 세션에 귀속되는 요청은 enrollment/user 한도를 적용한다. 두 귀속의 한도를 모든 요청에 중첩 적용한다고 설명하지 않는다. Reserved capacity를 소진하면 공유 용량으로 전환하며 이것이 서비스 가용성 100% 보증은 아니다. 사용량 화면도 비용 관리 화면과 구분한다. [LLM capacity management](https://www.palantir.com/docs/foundry/aip/llm-capacity-management)

## 출처

- [Palantir, AIP overview](https://www.palantir.com/docs/foundry/aip/overview)
- [Palantir, AIP Logic overview](https://www.palantir.com/docs/foundry/logic/overview)
- [Palantir, Logic core concepts](https://www.palantir.com/docs/foundry/logic/core-concepts)
- [Palantir, Logic blocks](https://www.palantir.com/docs/foundry/logic/blocks)
- [Palantir, Execution mode settings](https://www.palantir.com/docs/foundry/logic/execution-mode-settings)
- [Palantir, Control LLM data access with Markings](https://www.palantir.com/docs/foundry/aip/control-llm-data-access-with-markings)
- [Palantir, AIP security and privacy](https://www.palantir.com/docs/foundry/aip/aip-security)
- [Palantir, Staged writes](https://www.palantir.com/docs/foundry/logic/staged-writes)
- [Palantir, Automate AIP Logic](https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate)
- [Palantir, AIP Evals overview](https://www.palantir.com/docs/foundry/aip-evals/overview)
- [Palantir, Evaluate Ontology edits](https://www.palantir.com/docs/foundry/aip-evals/ontology-edits)
- [Palantir, Run experiments](https://www.palantir.com/docs/foundry/aip-evals/experiments)
- [Palantir, Ontology and AIP observability](https://www.palantir.com/docs/foundry/aip/aip-observability)
- [Palantir, LLM capacity management](https://www.palantir.com/docs/foundry/aip/llm-capacity-management)

## 관련 문서

- [[Palantir-Actions-and-Functions|Action과 Function 실행 계약]]
- [[Palantir-Security-and-Governance|보안과 거버넌스]]
- [[Palantir-SDK-and-Agent-Tools|SDK와 에이전트 도구]]
- [[Palantir-Workshop-Applications|Workshop 업무 앱]]
- [[Palantir-AIP-Evaluation-Suites|평가 사례, 판정과 결과 보존]]
- [[Palantir-AIP-Observability|운영 실행의 metrics, trace와 로그 검색]]

- [[Palantir-Foundry-Logic|Logic block, branching과 자동화 전환]]
