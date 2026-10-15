---
tags: [finops, llm, cost-optimization, observability, bedrock]
status: done
category: "비용&운영(FinOps)"
aliases: ["LLM Cost Optimization", "LLM 비용 최적화"]
---

# LLM 비용 최적화 — 가시성, 시뮬레이션, 레버 스택

LLM 운영 비용 그래프는 방치하면 거의 항상 우상향한다. 절감의 출발점은 레버 적용이 아니라 **가시성 확보**다. 프로바이더 콘솔 집계는 일별 토큰과 비용 합계 수준에 그치는 경우가 많아(사례 시점의 Bedrock 콘솔 기준 API별 분해 미제공), 비용은 보이는데 원인이 보이지 않는 상태에서는 어디부터 줄일지 결정할 수 없다. 순서는 가시성, 원인 분석, 옵션 시뮬레이션, 레버 적용이고, 다음 레버도 같은 메트릭 위에서 검증한다.

## 1. 가시성 — API별 토큰 메트릭을 호출 단에서 직접 수집

콘솔 합계로 답할 수 없는 질문: 토큰을 가장 많이 쓰는 API는 무엇인가, input/output/cache_read/cache_write 비중은 어떤가, 시간대별 분포는 어떤가.

- **호출 리스너에서 수집** — LLM 클라이언트의 리스너 훅(예: LangChain4j ChatModelListener)에서 매 호출의 토큰 수, 요청 수, 지연, 에러를 endpoint, model, 토큰 type 태그와 함께 Prometheus 카운터로 기록
- **요청 경로 태깅** — 서블릿 필터가 요청 경로를 ThreadLocal에 담아 LLM 호출이 어느 API에서 났는지 연결
- **카디널리티 통제** — allowlist에 등록된 경로만 태그로 남기고 나머지는 other로 버킷화 (태그 폭발 방지)
- **단가는 코드가 아니라 대시보드 변수로** — 비용 계산을 Grafana 변수(토큰 단가)로 옮기면 단가가 바뀌어도 재배포 없이 변수만 수정
- 산출한 비용은 프로바이더 콘솔 청구액과 대조해 검증

### Bedrock의 비용 귀속과 사용량 관측을 나눈다

2026-10-07 AWS 공식 문서 기준이다. 아래 CloudWatch 지표와 invocation logging은 `bedrock-runtime` 호출 기준이며, 다른 endpoint에도 같은 수집 범위가 적용된다고 가정하지 않는다.

| 확인할 질문 | 자료 | 해석 경계 |
|---|---|---|
| 어느 팀과 역할에 비용을 귀속할 것인가 | CUR 2.0의 `line_item_iam_principal`, 활성화한 IAM principal 비용 할당 태그 | 호출 역할과 팀의 대응 관계가 필요하다. 여러 업무가 역할 하나를 공유하면 역할만으로 API별 비용을 나눌 수 없다 |
| 토큰 소비와 오류가 언제 늘었는가 | `AWS/Bedrock`의 `InputTokenCount`, `OutputTokenCount`, 캐시 읽기/쓰기 토큰 지표와 호출, 오류 지표 | 사용량 신호다. 토큰 종류별 단가와 청구 비용을 별도로 대조한다 |
| 어떤 요청과 응답이 비용을 만들었는가 | Model invocation logging 또는 애플리케이션 호출 계측 | Invocation logging은 기본 비활성이다. 활성화하면 입력과 출력 본문도 저장될 수 있으므로 목적, 접근 권한과 보존 기간을 먼저 정한다 |

IAM principal 귀속은 CUR 2.0 export의 `Include caller identity (IAM principal) allocation data`를 켜야 한다. 팀별 집계에 쓸 태그는 IAM 사용자나 역할에 붙인 뒤 Billing의 비용 할당 태그로 활성화한다. 태그를 붙인 principal이 Bedrock API를 한 번 이상 호출해야 활성화 후보에 나타나며, 태그 표시와 활성화에는 각각 최대 24시간이 걸릴 수 있다. 활성화된 태그는 Cost Explorer에서도 그룹화할 수 있다. 역할별 행이 추가되므로 export 크기 증가도 고려한다.

AWS Budgets의 알림 설정만으로 호출이 차단되지는 않는다. Budget Actions는 별도 구성할 수 있지만 청구 반영과 알림에 지연이 있어 정확한 실시간 지출 상한을 보장하지 않는다. 운영 설계에서는 [[Budget-Alert|예산 알람]]과 함께 호출 경로의 요청 수, 출력 길이, 재시도와 에이전트 반복 상한을 따로 둔다. 비용 귀속 자료는 누가 얼마나 썼는지를 설명하며, 그 사용이 유효했는지는 작업 성공률과 재작업량으로 따로 확인한다.

### 같은 모델을 공유하는 서비스의 비용 분리

2026-10-07 AWS 공식 문서 기준, `bedrock-runtime`의 `InvokeModel`과 `Converse`에는 application inference profile을 사용해 애플리케이션이나 워크로드별 비용을 나눌 수 있다. Profile을 만든 것만으로 기존 호출이 분리되지는 않는다. Profile에 비용 할당 태그를 붙이고 Billing에서 활성화한 뒤, 호출의 `modelId`에 해당 profile ARN을 전달해야 한다. 같은 모델을 쓰는 사진 분석과 대화 요약도 서로 다른 profile과 태그로 귀속할 수 있다.

System-defined cross-Region profile은 여러 리전으로 요청을 라우팅하는 리소스이고, application profile은 사용자가 비용과 사용량 추적을 위해 만드는 리소스다. Application profile은 단일 리전의 모델 또는 cross-Region profile을 참조할 수 있으므로 비용 분리와 리전 라우팅을 같은 기능으로 취급하지 않는다. 모델마다 profile이 필요해 모델 버전과 귀속 단위가 늘면 관리할 profile 수도 늘어난다.

Cost Explorer와 CUR의 profile별 금액은 집계된 청구 자료이며 요청 한 건의 비용을 제공하지 않는다. 개별 요청의 토큰과 지연은 위의 호출 계측으로 보완한다. 또한 application profile은 Responses와 Chat Completions API에서 지원되지 않으므로 그 API의 비용 귀속에 그대로 적용하지 않는다.

## 2. 원인 분석 — 파레토 집중을 찾는다

- 사례: 속성 추출 단일 API가 전체 LLM 토큰의 약 92%, 나머지 전부 합쳐 10% 미만. 최적화 대상은 사실상 하나였다.
- 비용 집중의 전형은 프롬프트가 유독 커서가 아니라 **동일한 대형 고정 prefix를 고빈도로 반복 전송**하는 호출 패턴이다. 요청이 고정 15K 토큰에 변동 2K 토큰 구조라면 매 호출 입력의 약 88%가 같은 내용의 재계산이다.

## 3. 옵션 선정 — AI 비용 시뮬레이션, 산술은 결정론 경로로

LLM 비용 최적화의 일반 레버는 셋이다: Prompt Caching, 모델 다운사이즈, Batch API.

- 옵션을 직관으로 고르는 대신, 레포지토리 소스와 모델 가격표를 입력으로 LLM에 비용 시뮬레이션을 시킨다. 역할은 분리한다 — **호출 패턴 추출과 시나리오 구성까지만 LLM에 맡기고, 최종 금액 산술은 위임하지 않는다**. LLM에 산술까지 맡기면 그럴듯한 숫자를 지어낼 수 있으므로, 금액은 실측 토큰량과 단가를 곱하는 결정론 경로로 계산하고 콘솔 수치와 대조한다.
- 입력: 코드에서 추출한 호출 패턴, 모델별 단가표(input/output/cache_read/cache_write), 실측 일일 토큰 분포. 출력: 옵션별 예상 절감율, 적용 우선순위, 옵션 간 의존성.
- 우선순위 판단 기준: 정확도 영향(검증 공수), 코드 변경량, 호출 패턴과 가격 모델의 정합성, 단독 적용 효과 크기. 동일 프롬프트 반복에 고빈도 호출 패턴이면 통상 Prompt Caching이 1순위다 — 정확도 무영향에 변경량이 가장 작다.
- 예측을 실측과 대조하면 가격 모델 자체의 신뢰도가 검증된다 (사례: 히트율 예측치와 실측치가 1%p 차이). 신뢰도가 확인되면 다음 레버의 시뮬레이션 결과도 같은 신뢰도로 쓸 수 있다.

## 4. 레버 스택 — 독립적이되 효과는 누적

| 레버 | 효과 | 전제, 비용 |
|---|---|---|
| Prompt Caching | 반복 입력 비용 방어 | 고정/변동 분리 선행, 정확도 무영향 — [[LLM-Prompt-Caching]] 정본 |
| 응답 캐싱 (호출 자체 제거) | 중복 요청 소거 | 결과 재사용 허용 범위 판단 |
| 모델 다운사이즈 | 단가 절감 | 정확도 검증 필수 |
| Batch API | 비동기 할인 단가 | 지연 허용 워크로드만 |

- 각 레버는 독립 적용 가능하고 효과는 누적된다. 다만 Bedrock batch inference 경로에서는 아래처럼 캐시 할인과 batch 할인이 같은 요청에 겹치지 않는다. 사례의 시뮬레이션 기준으로 전 단계 누적 시 90% 이상 절감을 예상했다 (예측치).
- 의존성: 캐싱을 먼저 적용해야 이후 레버(다운사이즈, Batch)의 효과가 같은 메트릭 위에서 분리 측정된다.

### Bedrock에서 지연을 허용하는 대량 작업

2026-10-13 AWS 공식 문서 기준이다. 기존 카탈로그 일괄 태깅이나 문서 요약처럼 즉시 응답이 필요 없는 작업은 다음 경로를 같은 요청 표본의 실측 토큰으로 비교한다(운영 제안).

| 경로 | 호출 방식 | 비용 근거 | 확인할 제약 |
|---|---|---|---|
| Batch inference | S3에 둔 JSONL(`recordId`, `modelInput`)을 job으로 제출하고 결과를 S3에서 받는다 | 가격표 기준 일부 모델은 on-demand보다 50% 낮은 단가 | Prompt caching 미지원. Tool calling과 structured output은 AWS 문서끼리 표기가 달라 소규모 job으로 확인. 지원 모델과 리전은 batch 전용 표로 확인 |
| Flex service tier | Runtime 요청에서 service tier를 `flex`로 지정한다 | 처리 시간이 더 걸려도 되는 작업을 위한 할인 단가 | 지원 여부는 모델 카드로 확인. 모델의 on-demand quota를 Standard, Priority 요청과 공유 |
| On-demand와 prompt caching | 반복되는 고정 prefix를 캐시에서 읽는다 | 캐시에서 읽은 토큰만 cache read 단가 | 적중 비보장. 모델에 따라 캐시 쓰기 단가가 입력 단가보다 높음. [[LLM-Prompt-Caching]] 정본 |

Bedrock의 prompt caching은 on-demand 추론 endpoint에서만 지원되고 batch inference API에서는 지원되지 않는다. 그래서 Bedrock batch inference 경로에서는 위 레버 스택의 캐시 할인과 batch 할인을 같은 요청에 겹쳐 계산하지 않는다. Anthropic API의 Message Batches는 prompt caching 할인과 batch 할인이 겹칠 수 있다고 안내하고 캐시 적중은 best-effort로 설명하므로, 겹침 여부는 제공자와 API 경로별로 확인한다. Structured output은 2026-10-13 기준 batch inference 안내가 미지원으로, structured output 안내의 기능 표가 지원으로 적어 AWS 문서끼리 다르므로 소규모 job으로 확인하기 전에는 schema 강제를 가정하지 않는다(운영 제안). Batch 지원 모델과 리전은 별도 표로 제공되며, 2026-10-13 표에 있는 Anthropic 모델 중 최신 행은 Claude Opus 5, Sonnet 4.6, Haiku 4.5다. Prompt caching 지원 표에 있는 Opus 5.5, Sonnet 5.5, Haiku 5.5는 batch 표에 없으므로 모델을 정하기 전에 두 표를 함께 확인한다(운영 제안). 요청을 실제로 처리한 tier는 CloudWatch 지표의 `ResolvedServiceTier` 차원에서 확인하고, API 응답과 CloudTrail 이벤트에도 처리된 요청의 service tier 설정이 남는다.

Batch inference를 고르면 다음을 job 운영 계약으로 둔다.

- 출력 record 순서는 입력과 같다고 보장되지 않으므로 `recordId`로 원본과 결합한다. `recordId`를 생략하면 Bedrock이 출력에 추가하므로, 원본과 결합하려면 업무 식별자로 만든 고유 값을 직접 넣는 편이 안전하다(운영 제안).
- 추론 오류가 난 줄은 `modelOutput` 대신 `error`를 담는다. Job 상태와 record별 성공을 구분하고 `manifest.json.out`의 성공과 오류 record 수, 입력과 출력 토큰 수를 청구 자료와 대조한다(운영 제안).
- Job 검증 단계는 S3 접근 권한, JSONL 형식, 파일 크기와 record 수를 보지만 `modelInput`이 모델 요청 형식과 맞는지는 확인하지 않는다. 작은 표본을 on-demand로 먼저 호출해 요청 형식과 출력 파싱을 확인한다(운영 제안).
- `timeoutDurationInHours`는 24~168시간이다. 제한 시간 전에 시작하지 못한 job은 `Expired`, 시간 안에 일부 record를 처리하지 못한 job은 `PartiallyCompleted`가 되므로 미처리와 오류 record만 모아 다시 제출한다. 남은 record가 모델별 job 최소 record 수보다 적으면 다음 job에 합치거나 on-demand로 처리한다(운영 제안).
- Job당 최소와 최대 record 수, 입력 파일과 job 크기는 모델별 batch inference quota로 확인한다. Job 상태 변화는 polling 대신 EventBridge 알림으로 받을 수 있다.

### Bedrock MU 예약 용량은 사용률과 해지 조건으로 비교한다

부분 검증(2026-10-16): 아래 비용식과 해지 조건은 **Provisioned Throughput by Model Units** 기준이다. Model Unit(MU)으로 처리 용량을 확보하고 시간당 과금한다. MU는 해당 모델의 분당 입력 토큰 처리량과 출력 토큰 생성량을 나타낸다. 지원 모델과 리전을 먼저 확인하고, 다른 모델에서도 MU 하나가 같은 처리량을 낸다고 가정하지 않는다.

MU 방식은 무약정, 1개월과 6개월 옵션이 있으며 지원 조건은 모델별로 확인한다. 무약정은 언제든 삭제할 수 있지만, 약정이 있으면 해당 기간에는 삭제할 수 없고 약정이 끝나도 리소스를 삭제할 때까지 과금이 계속된다. 단순히 요청이 많다는 이유로 on-demand보다 저렴하다고 판단하지 않는다.

별도 유형인 **Provisioned Throughput by Tokens**에 위 MU 비용식과 삭제 조건을 그대로 적용하지 않는다. Tokens 방식은 자동 갱신을 취소하면 현재 약정 기간까지 유지되고 만료 시 자동 삭제된다. 취소해도 현재 약정 기간의 요금은 추론 실행 여부와 관계없이 부과되므로, 구매한 유형과 갱신 상태부터 확인한다.

비교용 비용은 `MU 수 × MU당 시간 단가 × 유지 시간`으로 계산하고, 같은 기간의 실제 입력/출력 토큰에 대한 on-demand 비용과 대조한다. 평균 사용량뿐 아니라 입력과 출력 각각의 피크, 유휴 시간과 품질 조건을 함께 본다(운영 점검 제안). 이 절은 공식 문서 대조이며 용량 구매, 부하 시험과 실제 절감액 검증은 수행하지 않았다. 기존 사례와 다른 기능의 검증 기준은 유지한다.

### 오픈 웨이트 소형 모델을 직접 서빙할 때

다운사이즈를 API의 하위 티어가 아니라 오픈 웨이트 소형 모델을 상시 인스턴스에 직접 서빙하는 방식으로 하면 과금 단위가 토큰에서 인스턴스 사용 시간으로 바뀐다. 2026-10-14 SageMaker AI 가격표는 실시간 추론을 선택한 인스턴스의 사용량으로 과금하고, 가격 예시도 인스턴스를 띄워 둔 시간 전체로 계산한다. 요청이 드문 경로에 GPU 인스턴스를 상시 띄우면 비용 대부분이 요청이 없는 시간에서 나온다.

비교용 단순 모델로 상시 인스턴스의 요청당 비용은 `시간당 인스턴스 비용 / 시간당 실제 요청 수`다. 분모에는 최대 처리량이 아니라 실제 유입량을 넣고, 같은 요청 표본의 API 토큰 비용과 비교해 손익분기 유입량을 구한다. 가용성을 위해 인스턴스를 여러 대 두면 분자도 그만큼 커진다.

크기는 평가를 통과하는 범위에서 내린다(운영 제안).

1. 실제 질의를 반영한 평가 세트와 도메인 전문가 검토로 합격선을 먼저 정한다.
2. 합격 가능성이 높은 크기의 최신 상위 공개 모델로 시작하고, 합격하면 더 작은 크기로 줄여 다시 평가한다. 2025-05 기준 예로는 7~8B급에서 시작해 5B, 3B급으로 줄인다. 크기 구간은 모델 세대에 따라 바뀐다.
3. 후보의 가중치 메모리 하한을 [[LLM-Inference-Bottlenecks#로컬 추론의 용량과 지연을 따로 계산한다|용량 산식]]으로 먼저 거른 뒤, 대표 문맥 길이와 동시 요청 수에서 KV 캐시와 런타임 할당까지 포함한 최대 메모리가 가속기 하나나 CPU 메모리에 분할 없이 들어가는지 측정한다. 들어가면 모델을 여러 장치에 나누는 서빙 구성이 필요 없다.

GPU를 상시 띄우지 않는 선택지는 다음과 같다(2026-10-14 AWS 문서 기준).

| 선택지 | 맞는 경우 | 확인할 제약 |
|---|---|---|
| Graviton CPU 추론 | GPU 용량을 구하기 어렵거나 지연을 어느 정도 허용하는 소량 워크로드 | AWS Graviton 기술 가이드는 llama.cpp로 Graviton CPU에서 LLM을 추론하는 절차를 제공한다. Graviton3(E), 4, 5는 BFloat16과 MMLA 명령을 지원하고, 이 하드웨어 기능은 Linux 커널 5.10부터 켜진다. 예제는 Q4_0 GGUF를 쓰고, Python 바인딩은 `n_threads`를 vCPU 수로 주지 않으면 절반만 쓴다. arm64 이미지와 의존성은 [[EC2-Compute#Graviton 이전은 이미지, 의존성과 성능을 함께 검증한다\|Graviton 이전 검증]]을 따른다 |
| SageMaker Serverless Inference | 요청 사이에 유휴 구간이 있고 콜드 스타트를 허용하는 경로 | 요청 처리에 쓴 컴퓨트를 ms 단위로 과금하고 요청이 없으면 0으로 줄인다. GPU, VPC 구성과 네트워크 격리는 지원하지 않는다. 메모리는 1~6GB 중 고르고 메모리에 비례해 vCPU가 배정되며, 컨테이너 이미지는 최대 10GB다 |
| 인스턴스 0개 축소 | GPU 엔드포인트가 필요하지만 유휴 시간이 긴 경우 | Inference component를 호스팅하는 엔드포인트만 가능하다. 0에서 다시 늘리는 데 몇 분이 걸리고 그동안 호출은 오류를 받으므로 대기열이나 폴백 경로를 함께 둔다(운영 제안) |

CPU 추론은 소형 모델과 비동기 에이전트 같은 작업에 맞춘다. 소형 모델은 최대 규모 LLM의 능력에 못 미칠 수 있고, 배치를 키우면 처리량은 늘지만 사용자당 지연이 커지므로 도입 전에 사용 사례 적합성을 평가한다(2025-06 AWS Graviton 사례 기준). Graviton 가이드의 Deep Learning Container 추론 서버는 기본적으로 인증 없이 0.0.0.0에 바인딩되므로 사설 네트워크(security group, VPC) 안에 두고, 필요하면 `LLAMA_API_KEY`로 요청마다 bearer 토큰을 요구한다.

트래픽이 적으면 양자화한 소형 모델을 애플리케이션과 같은 인스턴스나 파드에서 실행해 별도 GPU 엔드포인트의 유휴 비용과 단일 장애점을 없애는 구성도 검토할 수 있다. 대신 추론과 애플리케이션이 CPU와 메모리를 나눠 써 서로의 지연에 영향을 주고, 인스턴스 수만큼 모델 메모리가 중복되며, 모델 교체가 애플리케이션 배포와 묶인다. 동시 요청이 많은 경로에는 별도 추론 계층을 둔다(설계 점검).

## 5. 모델 라우팅: 선택 비용과 재시도 비용을 포함한다

요청을 먼저 분류해 모델 하나를 고르는 **사전 라우팅**과, 저비용 모델의 답을 평가한 뒤 필요하면 상위 모델을 호출하는 **캐스케이드**는 비용 구조가 다르다. RouteLLM은 전자의 비용과 품질 절충을, FrugalGPT는 후자의 모델 조합을 연구한 사례다. 연구에서 얻은 절감률을 다른 요청 분포와 모델 조합에 그대로 적용하지 않는다.

다음 식은 제품 가격표가 아니라 비교용 단순 모델이다. `C_s`와 `C_h`는 저비용 모델과 상위 모델의 호출당 비용이며, 입력과 출력 토큰 비용을 모두 포함한다. 여기서는 요청이 어느 경로로 선택되든 각 모델의 평균 호출 비용이 같다고 가정한다. 실제로 어려운 요청에 긴 입력과 출력이 몰리면 이 가정이 깨지므로, 경로별 조건부 평균 비용으로 계산하고 전체 요청을 상위 모델로 처리한 기준 비용과 비교해야 한다.

| 경로 | 요청당 기대 비용 | 가정 |
|---|---|---|
| 상위 모델만 사용 | `C_h` | 비교 기준 |
| 사전 라우팅 | `C_r + (1-p)C_s + pC_h` | 라우터 비용 `C_r`, 상위 모델 선택 비율 `p`, 생성은 한 번 |
| 캐스케이드 | `C_s + C_v + qC_h` | 저비용 모델과 검증을 한 번씩 실행, 검증 비용 `C_v`, 상위 모델 재호출 비율 `q` |

예를 들어 비용을 `C_h=1`, `C_s=0.1`, `C_v=0.05`로 정규화하면 캐스케이드는 `q<0.85`일 때만 상위 모델 단독보다 저렴하다. `q=0.9`면 비용이 `1.05`가 된다. 이는 식에서 계산한 예시이며 실측 절감률이 아니다. 재시도 프롬프트가 길어지거나 검증을 여러 번 하면 그 비용도 추가한다.

비용이 낮아도 품질 합격선을 못 넘으면 후보에서 제외한다. 운영 비교에서는 같은 요청 집단의 합격률, 상위 모델 호출 비율, 총 청구 비용과 종단 지연을 함께 측정한다. 캐스케이드는 상위 모델이 필요한 요청에서 앞선 생성과 검증 시간까지 더해진다. 모델, 프롬프트나 요청 분포가 바뀌면 기존 라우터의 결과도 다시 평가한다.

## 사례 요약

Bedrock 기반 배치 워크로드에서 가시성 대시보드 구축, 92% 파레토 발견, 고정/변동 분리와 1시간 TTL Prompt Caching 적용까지의 결과: 1주 실측 캐시 히트율 98%, 전체 LLM 청구액 64% 절감. Bedrock의 prompt caching은 on-demand 호출에서만 지원되므로 이 사례의 배치는 위 batch inference API가 아니라 on-demand 호출을 모아 처리한 작업으로 읽는다(해석).

## 면접 체크포인트

- 콘솔 합계만으로 최적화를 시작할 수 없는 이유 (API별, 토큰 종류별 분해 부재)
- 메트릭 태그 카디널리티를 통제하는 방법 (allowlist와 other 버킷)
- 단가를 코드가 아니라 대시보드 변수에 두는 이유 (재배포 없는 갱신)
- LLM 시뮬레이션에서 산술을 결정론 경로에 두는 이유
- 레버들의 트레이드오프 (정확도, 코드 변경량, 지연)와 적용 순서 결정 기준
- 캐시 히트율 98%가 전체 비용 64% 절감으로 이어진 구조 (파레토 집중 + 입력 비용 방어)
- 소형 모델을 상시 인스턴스로 직접 서빙하면 비용이 토큰이 아니라 인스턴스 사용 시간에 묶이는 이유와 유휴 비용을 줄이는 선택지 (CPU 추론, 서버리스 추론, 0개 축소)

## 출처

- [Amazon Bedrock User Guide, Purchase a Provisioned Throughput for an Amazon Bedrock model](https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-purchase.html)
- [Amazon Bedrock User Guide, Delete a Provisioned Throughput or cancel auto renew](https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-delete.html)
- [Amazon Bedrock User Guide, Increase model invocation capacity with Provisioned Throughput](https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html)
- [Amazon Bedrock User Guide, Supported Region and models for Provisioned Throughput](https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-supported.html)
- [Amazon Bedrock User Guide, Application inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-application-inference-profiles.html)
- [Amazon Bedrock User Guide, Set up a model invocation resource using inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html)
- [Amazon Bedrock User Guide, Use an inference profile in model invocation](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-use.html)
- [AWS Billing, Using IAM principal for cost allocation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/iam-principal-cost-allocation.html)
- [Amazon Bedrock User Guide, Monitor bedrock-runtime inference using CloudWatch metrics](https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-runtime-metrics.html)
- [Amazon Bedrock User Guide, Monitor model invocation using CloudWatch Logs and Amazon S3](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [AWS Cost Management User Guide, Managing your costs with AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [Amazon Bedrock User Guide, Process multiple prompts with batch inference](https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference.html)
- [Amazon Bedrock User Guide, Format and upload your batch inference data](https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-data.html)
- [Amazon Bedrock User Guide, View the results of a batch inference job](https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-results.html)
- [Amazon Bedrock User Guide, Supported Regions and models for batch inference](https://docs.aws.amazon.com/bedrock/latest/userguide/batch-inference-supported.html)
- [Amazon Bedrock API Reference, ModelInvocationJobSummary](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_ModelInvocationJobSummary.html) (job 상태와 `timeoutDurationInHours` 범위)
- [Amazon Bedrock User Guide, Service tiers for optimizing performance and cost](https://docs.aws.amazon.com/bedrock/latest/userguide/service-tiers-inference.html)
- [Amazon Bedrock User Guide, Prompt caching for faster model inference](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html) (batch inference 미지원, 지원 모델 표)
- [Amazon Bedrock pricing — AWS](https://aws.amazon.com/bedrock/pricing/) (일부 모델의 batch inference 50% 할인)
- [Amazon Bedrock User Guide, Get validated JSON results from models](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html) (기능 표의 batch inference 지원 표기, 모델별 요청 필드)
- [Claude Developer Platform, Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (Message Batches와 prompt caching 할인 중첩, best-effort 캐시 적중)
- [RouteLLM: An Open-Source Framework for Cost-Effective LLM Routing — LMSYS Org](https://www.lmsys.org/blog/2024-07-01-routellm/) (사전 라우팅과 비용, 품질 평가)
- [FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance — arXiv](https://arxiv.org/abs/2305.05176) (LLM 캐스케이드 연구)
- [LLM 비용 64% 절감, 캐시 히트율 98% 달성기 — 무신사 테크블로그 (29CM)](https://techblog.musinsa.com/llm-%EB%B9%84%EC%9A%A9-64-%EC%A0%88%EA%B0%90-%EC%BA%90%EC%8B%9C-%ED%9E%88%ED%8A%B8%EC%9C%A8-98-%EB%8B%AC%EC%84%B1%EA%B8%B0-d568135bd40e)
- [Amazon SageMaker AI pricing — AWS](https://aws.amazon.com/sagemaker/ai/pricing/) (실시간 추론의 인스턴스 사용량 과금과 가격 예시, Serverless Inference의 ms 단위 과금)
- [Amazon SageMaker AI Developer Guide, Deploy models with Amazon SageMaker Serverless Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html)
- [Amazon SageMaker AI Developer Guide, Scale an endpoint to zero instances](https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-zero-instances.html)
- [AWS Graviton Technical Guide, llama.cpp](https://aws.github.io/graviton/machinelearning/llama.cpp.html)
- [Run small language models cost-efficiently with AWS Graviton and Amazon SageMaker AI — AWS Machine Learning Blog](https://aws.amazon.com/blogs/machine-learning/run-small-language-models-cost-efficiently-with-aws-graviton-and-amazon-sagemaker-ai/)
- [EP2: ARCEE.AI small language models, open source and cost efficient AI — AWS for AI podcast, Amazon Web Services](https://www.youtube.com/watch?v=0vkw5TaTYPo) (소형 모델부터 평가하는 크기 선택과 애플리케이션 동거 배치 제안)

## 관련 문서

- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱 (prefix matching, 활용 패턴, 안티패턴)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 종합 (FinOps 라이프사이클)]]
- [[AWS-Pricing|AWS 요금 구조 (종량 과금 차원)]]
- [[Cost-Anomaly|비용 이상 탐지 (베이스라인 모니터링)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅 (다운사이즈 레버)]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리 (활동량과 비용/품질 분리)]]
- [[Recommendation-System-Taxonomy-Content-Based|추천 택소노미 LLM 태깅 (batch backfill 검증 계약)]]
