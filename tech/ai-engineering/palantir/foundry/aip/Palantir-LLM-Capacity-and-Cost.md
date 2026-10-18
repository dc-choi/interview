---
tags: [palantir, aip, rate-limit, capacity, cost]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP LLM 용량과 비용"]
---

# AIP의 모델 용량, 제한과 비용

용량 제한은 TPM/RPM, 사용량 비용은 모델별 token→compute-seconds 변환으로 다룬다. 같은 token 수라도 input/output, model, Foundry region과 계약에 따라 비용이 다르며 compute-seconds를 응답의 실제 경과 시간으로 읽지 않는다. 이 문서는 공식 기준이며 실제 enrollment 한도나 청구액을 조회한 결과는 아니다.

## 요청은 project 또는 user 중 한 경로로 제한한다

| Attribution | 적용 제한 | 대표 경로 |
|---|---|---|
| Project | Enrollment + 해당 project | Pipeline, Logic, Automate, chatbot, Workshop |
| User | Enrollment + 해당 user | AI FDE, Assist, Analyst, native Explain/Generate와 외부 IDE |

두 경로를 모든 요청에 세 겹으로 적용하지 않는다. Capacity attribution과 청구 attribution의 구체적 자원은 제품별로 확인한다. Saved/embedded Analyst 같은 비용 귀속 예외도 [[Palantir-AIP-Analyst]]에서 다룬다.

Model capacity는 모델별 독립이다. Default medium 외 large/XL 등 tier가 있으며 enabled backend의 enrollment limit을 더한다. Geo-restricted나 USG impact level별 수치가 다를 수 있다. 전용 rate table의 per-user default와 actual Resource Management 값을 확인하고 표 수치를 고객 환경의 보장으로 옮기지 않는다.

## Project percentage는 예약량이 아니다

Default project limit은 조정 가능하며 같은 category에 여러 project를 넣어도 category 전체가 한 share를 공동 소비하는 방식이 아니라 **각 project에 그 percentage를 적용**한다. Model override로 base 0%와 허용 model percentage를 조합할 수 있다. Project 100%는 shared capacity를 모두 예약했다는 뜻이 아니며 다른 자원과 경쟁한다.

Per-user override는 default→model→group의 specificity를 적용한다. Group override가 여러 개면 해당 user/model의 resulting limit 중 최고값을 사용한다. 예를 들어 global user default 40%, matching group limit 10%/35%라면 35%이며 global 40%와 다시 max하지 않는다. Override는 published default와 혼합하지 않고 대체한다. Group override 제거 시 enrollment setting, 그것도 없으면 published default로 돌아간다.

User limit은 percentage 또는 absolute TPM/RPM을 사용할 수 있다. 50,000TPM/10RPM 미만은 일부 AIP feature를 깨뜨릴 수 있어 경고하고 0TPM/0RPM 설정은 현재 지원하지 않는다. Project model 0%와 user model 0을 같은 기능으로 취급하지 않는다.

## Interactive 보장과 reserved capacity를 구분한다

Batch는 enrollment/project capacity의 최대 80%를 사용하고 적어도 20%를 interactive에 남기는 구조다. Preview/Workshop/chatbot 같은 interactive와 pipeline/Automate batch의 분류를 확인한다. Interactive가 항상 별도 20%만 사용할 수 있다는 뜻은 아니다.

Reserved capacity는 model의 TPM/RPM 일부를 예약해 project별로 배분한다. 예약 소진 뒤 shared pool과 기존 project/enrollment 제한으로 fallback한다. 예를 들어 전체 100만TPM 중 25만을 예약하면 shared는 75만이며 total이 늘어나지 않는다.

확인일 기준 reserve는 total의 최대 50%, 이후 total이 줄면 기존 reserve를 새 total의 최대 95%까지 유지할 수 있다. Resource Management Administrator가 구성한다. 추가 reservation service 비용은 없다고 설명하지만 추가 token 사용 비용은 발생하고 향후 신규 사용/모델 정책은 바뀔 수 있다. 과거 99.9% uptime 소개를 100% 가용성 SLA로 사용하지 않는다.

2025년 5월과 2026년 1월 공지는 reserve를 기존 enrollment capacity에 추가되는 양으로 설명했다. 현재 전용 문서는 total 내 예약 구조로 설명하므로 과거 추가 용량 설명을 현재 설정의 계산에 사용하지 않는다. 당시에도 모든 model/provider의 reserved availability를 보장하지 않는 예외가 있었다.

## Usage 화면과 cost 화면을 함께 본다

AIP usage & limits는 minute별 token/request와 per-model threshold, project/user를 조사한다. 최대 2주 범위를 minute 수준으로 보고 6시간 미만에서는 project/resource segmentation을 볼 수 있다. 이 화면은 비용 분석용이 아니며 Analysis에서 All LLMs/Group by source로 daily cost를 본다.

한도에 닿으면 경쟁 project/model을 찾고 schedules를 분산하며 stable 반복 logic의 tool 호출량을 줄이거나 여유 model을 평가한다. Geography를 줄이거나 더 큰 tier로 바꾸는 선택은 기술 용량뿐 아니라 기존 legal/data routing 조건을 함께 확인해야 한다.

## Token 변환 단가에는 적용 조건이 있다

Compute usage 표는 AWS-hosted Foundry와 특정 default 계약 기준이며 모든 고객에게 적용되지 않는다. Input/output/region, 긴 context 구간과 model version을 맞춰 계산한다. 일부 모델은 threshold 이상 context에 다른 input/output rate를 사용하므로 단일 고정 단가를 곱하지 않는다.

기본 계산은 `inputTokens × inputRate / 10,000 + outputTokens × outputRate / 10,000`이며 cache/reasoning/다른 modality의 계약은 별도 실제 usage를 확인한다. 기존 표에는 retired/legacy 모델의 수치도 남아 있을 수 있어 **단가표 등재가 현재 사용 가능하다는 증거는 아니다**. Availability/enablement와 rate table을 따로 대조한다.

Daily AIP Token Usage export는 model/resource/token type/compute/currency를 연결한다. LLM token 외 dataset query, function과 Ontology compute가 함께 드는 workflow는 해당 비용도 합쳐 본다. Context의 도구 정의와 큰 결과를 반복 전송하는 agent에서는 질문 수만 세면 비용을 과소평가할 수 있다.

## 출처

- [Palantir, LLM capacity management](https://www.palantir.com/docs/foundry/aip/llm-capacity-management)
- [Palantir, LLM enrollment rate limits](https://www.palantir.com/docs/foundry/aip/llm-enrollment-rate-limits)
- [Palantir, Compute usage with AIP](https://www.palantir.com/docs/foundry/aip/aip-compute-usage)
- [Palantir, May 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-05)
- [Palantir, January 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-01)

## 관련 문서

- [[Palantir-AIP-Model-Availability|모델과 환경별 가용성]]
- [[Palantir-AIP-Analyst|Agent token과 backend compute]]
- [[Palantir-Logs-and-Usage-Governance|사용량 export와 권한]]
