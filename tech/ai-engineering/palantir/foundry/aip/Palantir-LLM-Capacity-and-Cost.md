---
tags: [palantir, aip, rate-limit, capacity, cost]
status: done
verified_at: 2026-11-16
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

### 기본 한도표는 모델, backend와 환경을 함께 맞춘다

2026-11-03 공식 enrollment rate limits 표에서 확인한 예다. Claude Haiku 4.5의 commercial Medium 기본값은 다음과 같다.

| Backend | Enrollment TPM | Enrollment RPM | Per-user TPM / RPM |
| --- | --- | --- | --- |
| Anthropic | 1,500,000 | 750 | 1,000,000 / 100 |
| Amazon Bedrock | 1,100,000 | 300 | 1,000,000 / 100 |

이 두 backend만 활성화하고 표의 기본값을 그대로 적용하는 가정이라면 enrollment 합계는 2,600,000 TPM과 1,050 RPM이다. 이 합계를 사용자 한 명의 한도로 옮기지 않는다. 실제 한도는 Resource Management의 enrollment 설정과 user/project 제한을 함께 확인한다.

USG 행은 해당 모델과 backend가 지원하는 impact level에만 적용한다. **Experimental** 표시는 그 backend의 실험적 제공 상태이며, 표에 행이 있어도 해당 환경과 접근 요건을 충족해야 한다. Gemma 4 26B A4B, Gemma 4 31B, NVIDIA Nemotron 3 Nano 30B와 Nemotron 3 Super 120B의 Bedrock 기본 한도는 provider capacity 예약을 뜻하지 않는다.

이 절은 기본 한도표만 추가 대조한 범위다. 기존 비용, 예약 용량과 override 설명의 확인일은 유지하며 실제 enrollment 설정이나 부하 처리량은 시험하지 않았다. 위 Haiku 4.5 값은 2026-11-16 수집한 표에서도 같다.

### 같은 모델도 backend별 기본 한도가 크게 다르다

2026-11-16 수집한 같은 표 기준이다. 표의 backend는 Anthropic, Amazon Bedrock, Azure, Google Vertex, OpenAI, xAI, Fireworks와 Palantir-hosted이며 USG 행은 따로 둔다. Medium tier 기본값을 비교하면 다음과 같다.

| 모델 | Backend별 Medium enrollment 기본값 |
| --- | --- |
| GPT-5.5 | Azure 4,000,000 TPM/2,000 RPM, OpenAI 3,000,000 TPM/1,500 RPM, Amazon Bedrock 250,000 TPM/60 RPM |
| Claude Opus 5.5 | Google Vertex 5,000,000 TPM/2,000 RPM, Amazon Bedrock 3,000,000 TPM/300 RPM, Anthropic 1,000,000 TPM/200 RPM, Azure 1,000,000 TPM/100 RPM |

모델 이름만으로 처리량을 추정하지 않고 활성화한 backend의 행을 찾는다. 이 비교는 기본 한도의 차이이며 backend 간 응답 품질, 지연 시간이나 비용을 비교한 결과는 아니다.

Per-user 기본값이 해당 행의 enrollment 값보다 큰 경우도 있다. GPT-5.5의 Amazon Bedrock 행은 per-user 1,000,000 TPM/1,000 RPM, Medium enrollment 250,000 TPM/60 RPM이다. User 귀속 요청에는 enrollment 한도도 함께 적용되므로, 이 모델에 Bedrock backend만 활성화한 Medium 환경이라면 사용자 한 명이 per-user 수치만큼 쓸 수 없다. 여러 backend를 활성화하면 enrollment 한도가 합산되므로 비교 대상은 그 합계다. USG는 impact level에 따라 행이 나뉘기도 한다. Gemini 3.6 Flash의 Google Vertex USG Medium 기본값은 IL2/IL4가 12,000,000 TPM, IL5가 7,000,000 TPM이다.

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

예를 들어 공식 문서는 GPT-4o로 보낸 24 token 문장을 `24 × 43 / 10,000 = 0.1032` compute-seconds로 계산한다. 43은 단가표의 GPT-4o North America input 단가와 같은 값이다. Token은 AIP가 아니라 요청을 받은 backing model이 세므로 같은 문장도 provider와 모델에 따라 token 수가 달라질 수 있다. 문서의 평균 약 4자라는 설명은 언어를 밝히지 않으므로 한국어나 코드의 token 수 추정에 그대로 쓰지 않는다.

### 비용은 요청한 resource에 귀속된다

LLM compute-seconds는 사용량을 요청한 개별 application resource에 붙는다. Pipeline Builder에서 AIP로 pipeline 설명을 만들면 그 pipeline에 귀속되는 식이다. AIP Assist나 Error Explainer처럼 한 resource로 귀속할 수 없는 사용은 사용을 시작한 사용자의 user folder에 귀속된다. 비용 화면에서 user folder 항목이 커지면 개인 사용 패턴을, 특정 resource가 커지면 그 workflow의 입력 크기를 먼저 본다.

Token 사용량의 주된 동인은 보내는 정보량과 출력 길이다. Pipeline Builder 설명에서는 선택한 transform node 수가 늘수록 설정 텍스트가 늘어 token이 늘고, AIP Assist에 긴 코드 생성을 요청하면 output token이 늘며, AIP Logic에 큰 텍스트를 붙이면 input token이 는다. Token을 쓰는 앱은 AIP Assist, Logic, Error Enhancer, Code Assist, Analyst, AI FDE, Workshop, Quiver와 Pipeline Builder의 LLM 도구, 그리고 Python과 TypeScript 라이브러리를 통한 Language Model Service 직접 호출이다.

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
