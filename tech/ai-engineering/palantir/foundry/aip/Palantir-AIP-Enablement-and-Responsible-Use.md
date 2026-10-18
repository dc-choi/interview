---
tags: [palantir, aip, governance, privacy, evaluation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP 활성화와 책임 있는 사용"]
---

# AIP 활성화와 책임 있는 사용의 경계

AIP는 Ontology와 developer toolchain 위의 모델/Logic/chatbot/agent/evaluation 기능을 묶는다. Platform 기능 설명, 조직이 선택한 통제와 실제 실행 보장을 구분한다. 아래는 공식 제품 문서 대조이며 enrollment의 통제와 법적 적합성을 시험한 결과는 아니다.

## Enrollment, 조직과 모델을 각각 활성화한다

신규 enrollment는 기본 AIP가 켜지지만 2024년 이전 시작 환경은 수동 enablement가 필요할 수 있다. AIP/core assistant와 custom workflow builder capability는 별도 허용 계층이다. User group은 Everyone/selected/Nobody, organization은 allowlist로 제한한다. **Resource project의 모든 organization marking에서 AIP가 켜져야 그 resource에 활성화된 것으로 본다.** Application access에서 앱 UI 활성화도 별도 필요할 수 있다.

Model family Enabled/Disabled/Disallowed를 구분한다. Disabled는 관리자가 약관 수락 후 켤 수 있지만 법/지역/인프라 제약의 Disallowed는 지원 경로가 필요하다. Subprocessor 최초 승인과 그 약관 안의 추가 family enablement도 다르다. 조직별 family 제한과 experimental toggle+family 두 조건을 함께 확인한다. Family disable은 이를 쓰는 기존 workflow를 깨뜨릴 수 있다.

## Marking allowlist는 request token을 검사한다

Enrollment policy는 Palantir-provided family와 override 없는 registered model에 적용한다. Token에 가능한 mandatory markings가 모두 allowlist 안에 있어야 하며 실제 prompt에 그 data를 넣지 않았어도 토큰에 다른 marking이 있으면 거부한다. 무표식 token은 이 검사를 통과하고 allowlist는 최소 하나 marking을 선택해야 저장할 수 있다.

Scoped session은 토큰 marking을 줄이는 경로다. Registered model override는 중앙 policy와 교집합을 취하지 않고 완전히 대체하며 더 느슨한 Allow any data도 가능하다. 실제 선택 모델의 policy를 확인한다. 이는 읽은 결과의 외부 사용과 로그 보호를 모두 대신하는 통제가 아니다.

## Vendor의 제3자 모델 정책은 지정 범위에 적용한다

공식 AIP policy는 Palantir가 제공하는 third-party-hosted model service에 prompt/completion 보관/학습 미사용과 provider personnel 접근 제한을 기술적/계약적으로 확보한다고 설명한다. 모델별 regional endpoint와 geography는 기술적 제약을 따르며 고정 지역을 모든 모델에 일반화하지 않는다.

이를 사용자가 임의로 연결한 BYOM/provider 계정, 고객 proxy와 application log에도 같은 보증이 자동 적용된다는 설명으로 확장하지 않는다. 실제 계약, model routing과 저장 경로를 확인한다. [[Palantir-Logs-and-Usage-Governance]]의 telemetry 보호도 독립이다.

## 책임 있는 사용은 시스템 전체를 대상으로 한다

| 판단 주제 | 사용할 수 있는 기능 | 별도로 정할 것 |
|---|---|---|
| Fairness | Sensitive Data Scanner, subset evaluation, Evals/data health | 보호 속성, 그룹별 기준과 불균형 완화 |
| Explainability | Interpretable tool, Logic debug와 trace | 설명의 근거와 사용자 이해 확인 |
| Reliability | Version/release, deploy/rollback, monitoring와 capacity | 실패 기준, 실제 rollback 범위와 복구 시험 |
| Traceability | Data/Workflow Lineage, audit와 decision record | 기록할 입력/버전/사유와 보존/독자 |
| Collaboration | Roles, shared workspaces와 domain evaluator | 기술/업무/통제 담당자의 책임 |
| Accountability | Action/approval/checkpoint | 승인자, 예외와 인가 강제 경로 |
| Human judgment | Review UI, feedback와 opt-out/fallback 구성 | 자동 실행 범위와 사람의 중단/재심 권한 |

이 표는 capability와 설계 책임의 연결이다. Check를 만들었다고 release gate가 자동 강제되는 것은 아니며([[Palantir-Model-Deployment-and-Monitoring]]), Action을 제공했다고 모든 실행이 사람의 확인을 요구하지도 않는다. Audit, log delivery와 traceability의 실제 계약은 전용 문서를 따른다. Debug의 모델 reasoning은 설명 자료이며 사실과 정확한 내부 인과의 증거로 단독 사용하지 않는다.

먼저 해결해야 할 문제와 허용할 자동화 범위를 정하고, 기술적으로 가능한 최적화라도 사람/업무/법적 맥락에서 적합한지 검토한다. 좋은 aggregate metric으로 집단별 오류를 가리지 않고, 제한과 적용 조건을 domain 전문가와 함께 정한다. 이는 공식 responsible-AI 원칙을 적용하기 위한 설계 해석이며 플랫폼만 도입하면 충족되는 인증이 아니다.

## Prompt는 사례와 실행으로 평가한다

Task/context/output/constraint를 명시하고 필요한 예시를 제공한다. 복잡한 작업을 단계로 나누고 대표 입력에서 prompt/model을 반복 비교한다. 더 긴 context나 강한 role 문구만으로 결과 품질이 개선된다고 전제하지 않는다. 실행 인가와 데이터 제약은 prompt가 아닌 서버 통제로 남긴다.

공식 시작 자료에는 Learning portal의 Introduction to Foundry & AIP, Scoping Use Cases, Speedrun: Your First AIP Workflow가 있다. 이는 후속 학습 후보이며 이 문서를 읽었다고 연결 강의를 수강한 것으로 기록하지 않는다.

## 출처

- [Palantir, AIP overview](https://www.palantir.com/docs/foundry/aip/overview)
- [Palantir, AIP features](https://www.palantir.com/docs/foundry/aip/aip-features)
- [Palantir, Enable AIP features](https://www.palantir.com/docs/foundry/aip/enable-aip-features)
- [Palantir, Control LLM data access with Markings](https://www.palantir.com/docs/foundry/aip/control-llm-data-access-with-markings)
- [Palantir, AIP security and privacy](https://www.palantir.com/docs/foundry/aip/aip-security)
- [Palantir, AI ethics and governance](https://www.palantir.com/docs/foundry/aip/ethics-governance)
- [Palantir, Best practices for LLM prompt engineering](https://www.palantir.com/docs/foundry/aip/best-practices-prompt-engineering)
- [Palantir, Get started with AIP](https://www.palantir.com/docs/foundry/aip/getting-started-with-aip)

## 관련 문서

- [[Palantir-Security-and-Governance|보안과 통제의 전파]]
- [[Palantir-AIP-Evaluation-Suites|품질 평가의 판정 기준]]
- [[Palantir-Registered-Models-and-Provider-Proxies|외부 모델과 고객 proxy]]
