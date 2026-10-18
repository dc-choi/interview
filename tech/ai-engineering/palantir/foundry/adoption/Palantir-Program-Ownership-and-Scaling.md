---
tags: [palantir, foundry, adoption]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Foundry Program의 책임과 확장 단계

Foundry Program은 business/technical stakeholders가 데이터, Ontology, 플랫폼과 use case의 성공을 함께 책임지는 운영 체계다. 중앙 팀은 cross-project 의사결정을 맡으면서 domain별 구현과 self-service를 지원한다. 단계와 role은 권장 예시이며 모든 조직에 같은 인원이나 직함을 의무화하지 않는다.

| 단계 | 집중할 조건과 책임 |
| --- | --- |
| Phase1, use case | 소수 production use case에서 시작한다. 경험 있는 사람이 여러 role을 겸할 수 있지만 program vision, 데이터/Ontology와 governance 책임은 명시한다. |
| Phase2, scaling 기반 | use case/user가 늘면 intake/prioritization, communication, 교육, Ontology backlog, 공통 ingestion/metadata/health checks와 권한 구조를 표준화한다. |
| Phase3, autonomy | platform 운영, permissions/compliance, compute/storage 비용과 내부 support를 전담한다. vendor 의존을 줄일 조사/지원 능력을 갖춘다. |
| Phase4, 지속 확장 | 일상 운영과 개발을 내부에서 맡고 domain의 자립성을 높인다. 데이터/Ontology 역할을 세분화하고 향후1~3년 roadmap에 맞춰 확장한다. |

## 책임을 나누는 기준

Head of Program은 executive strategy, vision, use case 승인과 전사 feedback loop를 맡는다. Program Manager는 requirements, roadmap/prioritization, cross-team risk/resource/change와 OKR/KPI를 운영한다. Head of Data Governance는 목적, 규제/보호 요구, 품질/SLA와 review 기준을 정의한다. 초기에 Data/Ontology Lead가 겸할 수 있으나 늦어도 Phase3에 전담을 권한다.

Data Lead는 source connection, ingestion backlog와 health/quality 기준, source와 Ontology 사이 architecture를 책임진다. Ontology Lead는 조직의 operation을 반영한 공통 모델과 장기 roadmap, change/permission 기준을 맡는다. 둘의 연결이 끊기면 실제 데이터와 operational model이 달라질 수 있어 함께 use case를 scope한다.

Phase2의 Data Source Developer는 source별 연결/raw project, cleaning library와 자동화, 일상 실패/alert/escalation을 소유한다. 공통 표준을 유지할 중앙 팀 구성을 권한다. Ontology Manager는 공통 모델과 backlog, 영향 분석 및 use case/source 협업을 맡고 성숙 단계에서는 domain별로 나눌 수 있다. Data Governance Administrator는 정책을 group/role/review와 monitoring으로 실행한다. Education & Training Expert는 출시와 맞춘 교육, role별 skills gap/assessment, onboarding과 train-the-trainer를 운영한다.

Phase3의 Head of Platform은 enterprise IT와 Foundry architecture/권한/compliance/비용을 연결한다. IT Services Owner는 cross-platform integration, custom resource/Spark/YARN 설정, 변경과 비용 관측을 맡는다. Permissions Manager는 IdP/SAML groups와 권한 적용을, Technical Compliance Manager는 project 시작 전 목적/source/access 적합성과 RV 구조를 확인한다. Agent Administrator는 agent 설치/설정/공유를 중앙 통제하고 upstream Data Owner와 SLA를 나눈다. Support Services는 business workflow와 Spark를 이해하고 triage/repro/evidence/escalation 및 개선 feedback을 제공한다.

CoE는 영구 대행 조직보다 전문가의 임시 rotation이다. 어려운 pipeline/model/UI/운영의 초기 역량을 보강하되 domain의 장기 owner를 대체하지 않는다. Phase4 Production Engineer는 production PR/build/release와 health monitoring, Pipeline Developer는 source→공통 Ontology 변환, Object View Developer는 domain 요구를 view로 만들고 change process를 관리한다.

역할을 실제 job title로 그대로 복제하기보다 decision owner, 실행 owner, 장기 유지 owner와 escalation을 지정한다. 기술 실력 외에 domain 이해, 설명/문서화, cross-team 협업을 평가한다. governance는 workflow 목적, 영향을 받는 사람, 최소 데이터, 접근/감사/보존을 설계 초기에 포함한다.

동일 본문 canonical alias: [program-overview](https://www.palantir.com/docs/foundry/foundry-adoption/program-overview).

## 출처

- [Palantir, foundry-adoption](https://www.palantir.com/docs/foundry/foundry-adoption)
- [Palantir, phase-1](https://www.palantir.com/docs/foundry/foundry-adoption/phase-1)
- [Palantir, phase-1-roles](https://www.palantir.com/docs/foundry/foundry-adoption/phase-1-roles)
- [Palantir, phase-2](https://www.palantir.com/docs/foundry/foundry-adoption/phase-2)
- [Palantir, phase-2-roles](https://www.palantir.com/docs/foundry/foundry-adoption/phase-2-roles)
- [Palantir, phase-3](https://www.palantir.com/docs/foundry/foundry-adoption/phase-3)
- [Palantir, phase-3-roles](https://www.palantir.com/docs/foundry/foundry-adoption/phase-3-roles)
- [Palantir, phase-4](https://www.palantir.com/docs/foundry/foundry-adoption/phase-4)
- [Palantir, phase-4-roles](https://www.palantir.com/docs/foundry/foundry-adoption/phase-4-roles)
- [Palantir, program-team-development-phases](https://www.palantir.com/docs/foundry/foundry-adoption/program-team-development-phases)

## 관련 문서

- [[Palantir-Program-Governance-Processes]]
- [[Palantir-Connection-Operations]]
