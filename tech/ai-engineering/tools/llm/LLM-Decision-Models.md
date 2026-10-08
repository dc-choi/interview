---
tags: [ai, llm, decision-model, classification, routing, calibration]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["Decision Models", "결정 모델", "System One Models", "Jev", "Clef"]
---

# 결정 모델 (Decision Models, System One)

## 정의

결정 모델은 텍스트를 생성하지 않고, 판단 대상(`state`)과 미리 정한 질문을 받아 질문마다 허용된 선택지 각각의 확률을 돌려주는 모델이다. TypeSafe는 이 부류를 System One 모델이라 부르며, 소프트웨어가 바로 쓸 수 있는 빠르고 구조화된 결정을 내리도록 만든 모델로 설명한다. 2026-10-06 기준 구현 예는 TypeSafe의 Jev와 Cloudflare가 2026-10-01 공개한 Clef, Clef-flash이며, Cloudflare는 Clef가 Jev API와 호환된다고 밝힌다.
생성형 LLM으로 분류하면 답을 토큰으로 생성하며, 구조화 출력 기능을 쓰지 않으면 파싱과 형식 오류 처리도 맡아야 한다. 결정 모델은 출력이 스키마의 선택지로 닫혀 있고 디코드 없이 선택지별 확률을 응답 필드로 바로 주므로, 그 확률을 근거로 자동 처리, 확인 요청, 사람 검토를 코드에서 나눌 수 있다. 대신 새 라벨이나 설명, 근거 문장은 만들지 못하므로 디버깅은 질문 분해와 라벨 데이터로 한다.

## 동작 원리

### 입력: state와 질문 스키마

요청은 `state`(텍스트나 JSON)와, 직접 정한 ID를 키로 하는 `questions` 맵으로 이루어진다. 아래는 TypeSafe API에 보내는 요청 하나로 긴급도, 담당 팀, 심각도를 함께 묻는 예다.

```json
{
  "model": "jev-latest",
  "state": "Checkout has been failing for every customer for the last hour.",
  "questions": {
    "urgent": { "type": "noul", "instructions": "Is this support request urgent?" },
    "team": { "type": "choice", "instructions": "Which team should handle this request?",
              "criteria": { "billing": "Payments and refunds", "technical": "Outages and errors" } },
    "severity": { "type": "score", "instructions": "How severe is the customer impact?",
                  "criteria": ["No impact", "Minor", "Major", "Critical"] }
  }
}
```

응답의 `answers`는 같은 ID로 질문별 결과를 돌려준다.

| 타입 | 묻는 것 | 반환 (TypeSafe API 문서 기준) | 제약 (Jev) |
|---|---|---|---|
| `noul` | 예, 아니오 | `noul`: 예일 확률 0~1, `confidence` 없음 | `criteria`로 true와 false의 의미 보강 |
| `choice` | 정의한 선택지 중 하나 | `choice`, 선택지별 `probabilities`, `confidence` | 선택지 최대 255개 |
| `score` | 순서 있는 척도 위의 위치 | 0부터 매긴 단계 번호의 확률 가중 평균 `score`, `legend`, `probabilities`, `confidence` | 단계 2~10개 |

Jev 문서 기준으로 같은 요청의 질문은 서로 독립적으로, 병렬로 평가되므로 질문을 더하거나 빼도 다른 질문의 답은 바뀌지 않고 응답 시간도 대개 크게 늘지 않는다. 쓸지 모르는 질문까지 한 번에 보내고 필요한 답만 코드가 고르는 Speculative fan-out이 이 성질을 쓴다. 한 답에 따라 다음 질문을 바꾸는 조건 흐름은 코드가 맡는다.

### 왜 빠르고 싸게 나오는가

Clef는 Qwen 기반 모델을 고정한 채 라우팅 헤드와 rank-256 LoRA 어댑터를 학습한 구조로, 입력을 한 번 처리(prefill)한 뒤 스키마가 허용한 선택지를 병렬로 채점한다. 결정 단계가 비자기회귀(non-autoregressive)라 토큰을 하나씩 만드는 디코드가 없다. 모델은 질문마다 허용된 선택지 하나당 logit 하나를 내고, 질문별 softmax로 확률을 만든다. 출력 길이만큼 늘어나는 디코드 구간([[LLM-Inference-Bottlenecks#프리필과 디코드는 병목이 다르다|프리필과 디코드]])을 건너뛰므로 비용과 지연은 주로 입력 크기를 따른다. 2026-10-06 확인 기준 Jev는 출력 토큰을 과금하지 않고, Workers AI 가격표도 Clef에 입력 토큰 단가만 둔다.

### 확률과 confidence 읽기

- 보정(calibration)된 확률은 0.8을 받은 결과들이 약 80% 실제로 일어난다는 집단 수준의 성질이며 개별 답을 보장하지 않는다. TypeSafe는 보정된 확률을 내도록 학습하는 방법으로 RLCD(Reinforcement Learning for Calibrated Decisions)를 들고, Cloudflare는 유효한 스키마 출력을 label smoothing을 건 cross-entropy로 학습하고 Brier loss로 보정을 다듬으며, RLCD를 인접한 순서 선택지에 부분 점수를 주는 보조 최적화 목표로 쓴다. 이름은 같아도 두 학습에서 맡는 역할이 다르다. 그래도 보정은 학습 목표일 뿐이므로 자기 도메인에서 다시 측정한다([[LLM-Abstention|LLM Abstention]]).
- Choice의 `confidence`는 최고 확률이 균등 분포 `1/n`보다 얼마나 위에 있는지를 0(균등)부터 1(확실)로 잰 `(p_max - 1/n) / (1 - 1/n)`이다. 선택지 3개에서 (0.6, 0.3, 0.1)과 (0.6, 0.2, 0.2)는 둘 다 0.4이므로 2등 후보와의 차이가 중요하면 `probabilities`를 직접 본다.
- Score의 `confidence`는 가장 가능성 높은 단계에서 먼 단계에 실린 확률일수록 더 많이 깎인다. Noul은 `confidence`를 주지 않으며 필요하면 `|2p - 1|`을 쓰도록 안내한다.

## 예시: 어디에 쓰는가

선택지가 미리 닫혀 있고 입력만 보고 판정할 수 있는 판단이 대상이다.

- **에이전트 분기**: 다음 행동, 호출할 함수, 추천할 스킬을 고르는 if 문 자리. 흐름과 부작용은 코드에 두고 모델에는 좁은 결정만 맡긴다.
- **라우팅과 트리아지**: 요청 의도로 핸들러를, 작업 난이도로 모델 티어를 고르고([[LLM-Model-Tiers|모델 티어 라우팅]]), 지원 티켓의 긴급도, 담당 팀, 심각도를 한 요청으로 판정한다.
- **모더레이션과 가드레일**: LLM 입출력 검사, 피싱 도메인, 봇 트래픽, 신고 콘텐츠 분류. Clef 계열은 이미지도 받으므로 스크린샷 같은 시각 입력도 판정할 수 있다.
- **RAG 보조**: 검색된 passage가 답할 수 있는지, 인용이 원문과 맞는지 판정하고 재랭킹에 쓴다.

확률을 쓰는 분기는 행동마다 문턱을 다르게 둔다. 아래 0.6과 0.85는 TypeSafe 문서의 예시값이며 자기 데이터로 다시 정한다.

```python
intent = response["answers"]["intent"]
if intent["confidence"] < 0.6:
    route_to_human()                    # 확신이 낮으면 자동 처리하지 않는다
elif intent["choice"] == "approve_transfer" and intent["confidence"] <= 0.85:
    ask_user_to_confirm()               # 되돌리기 어려운 행동은 더 높은 문턱
else:
    handle(intent["choice"])
```

Noul의 문턱도 오판 비용으로 정한다. 예와 아니오의 처리 비용이 같으면 0.5에서 자르고, 잘못된 예가 비싸면(담당자 호출, 환불) 올리고, 놓친 예가 비싸면(안전 문제 미탐) 내린다.

### 도구 기록을 선별하는 압축

결정 모델은 요약문을 새로 쓰는 대신 도구 호출과 결과를 남길지 고를 수 있다. `fast-jev-compaction`의 공개 README에서 확인한 설계(2026-10-06)는 호출과 결과를 ID로 짝지은 뒤, 호출 보존과 결과 원문 보존을 각각 `noul`로 묻는다. 결과를 남기거나, 호출과 결과 앞부분만 남기거나, 둘을 함께 제거한다. 첫 메시지와 최근 메시지는 보호하며 출력의 사용자, 어시스턴트 텍스트는 유지한다.

- **원문 유지와 무손실은 다르다:** 남긴 내용이 원문이어도 필요한 도구 결과를 잘못 제거할 수 있다. 확률은 삭제해도 된다는 증거가 아니다.
- **판정 입력과 출력 이력은 다르다:** 판정용 `state`에서는 도구 결과 본문을 짧은 상태 표시로 대체한다. 입력 상한을 맞추려고 오래된 입력이나 텍스트를 줄이면 모델이 보는 판단 근거도 줄어든다.
- **호출 비용을 합산한다:** 질문을 여러 요청으로 나누면 같은 `state`가 반복 전송된다. 입력 토큰, 보존 품질과 압축 뒤 과업 성공률을 함께 비교한다.
- **실패 시 원본을 보존한다:** 공개 패키지는 API 실패와 잘못된 응답 등에서 예외를 내고 호출자가 폴백을 정하게 한다. 이는 README에 명시된 동작이며 이 문서에서 실행 검증한 결과는 아니다.

### OpenAI Decisions API의 요청과 실행 경계

2026-10-09 공식 문서 기준, Decisions API는 public beta이며 `POST /v1/decisions`에서 `gpt-6-luna`를 사용한다. 텍스트와 이미지를 평가하지만 임의의 설명문이나 추출 객체 생성은 Responses API의 Structured Outputs, 인자를 포함한 도구 호출 요청은 function calling의 영역이다. 기존 Jev와 Clef 비교의 가격, 버전과 성능 기준일은 유지한다.

- **입력 계약:** Jev의 `state`와 질문 맵을 그대로 보내지 않는다. 공통 근거는 `input`, 질문은 `questions` 배열로 전달하며 질문별 `name`으로 답을 식별한다.
- **질문 타입:** `predicate`는 조건이 참일 추정 확률, `choice`는 제공한 선택지, `score`는 순서가 있는 단계 인덱스의 확률 가중 평균을 돌려준다.
- **이미지 제약:** 이미지에는 inline base64 data URL을 사용한다. 외부 이미지 URL과 `file_id`는 지원하지 않는다.
- **거부 처리:** 질문별 답이 `type: refusal`일 수 있으므로 확률이나 선택값을 읽기 전에 답의 타입을 검사한다. 거부를 낮은 점수나 기본 선택지로 바꾸어 실행하지 않는다.

모델과 추론 노력을 고르는 라우터에 쓸 때도 판정과 실제 호출 설정 적용을 분리한다. 이는 위 API 계약을 이용한 설계 예시다. 선택 결과가 런타임에서 지원되는지 확인하고, 라벨 표본의 품질 합격률과 라우터를 포함한 전체 비용, 지연을 비교한다. 소수 예제에서 그럴듯한 모델을 골랐다는 사실만으로 비용 절감률이나 과업 성공을 보장하지 않는다.

## 트레이드오프

### Jev와 Clef 비교 (2026-10-06 확인)

| 항목 | Jev | Clef | Clef-flash |
|---|---|---|---|
| 제공 | TypeSafe API, 가중치 공개 안내 없음 | Workers AI, Hugging Face 가중치(Apache 2.0) | Workers AI, Hugging Face 가중치(Apache 2.0) |
| 크기, 기반 모델 | 확인한 공식 문서에 표기 없음 | 27B, Qwen3.8-27B | 9B, Qwen3.5-9B |
| 입력 | 텍스트와 JSON(이미지, 오디오, 비디오 입력 없음) | 텍스트, JSON, 이미지(Workers AI 입력 스키마 기준 요청당 최대 4장) | 텍스트, JSON, 이미지(Workers AI 입력 스키마 기준 요청당 최대 4장) |
| 컨텍스트 | 요청당 64k, `state`와 가장 긴 질문 합계 32k | 65,536 토큰 | 65,536 토큰 |
| 입력 100만 토큰당 | $0.042, 출력 토큰 과금 없음 | $0.24 | $0.09 |
| 지연 중앙값 / p95 (Cloudflare 측정) | 524.1 / 536.0 ms | 209.3 / 238.6 ms | 38.8 / 122.4 ms |

Clef의 모델 설명과 Hugging Face 모델 카드는 비디오도 읽는다고 적지만, Workers AI 입력 스키마에는 비디오 필드가 없다. Workers AI는 Free와 Paid 플랜 모두에 하루 10,000 뉴런을 과금 없이 주고 00:00 UTC에 초기화한다. 이 할당은 계정의 모든 Workers AI 모델 사용이 함께 쓴다. Clef는 입력 100만 토큰당 21,818 뉴런, Clef-flash는 8,182 뉴런이라 할당을 한 모델에만 쓸 때 하루 과금 없는 범위는 계산상 각각 약 46만, 약 122만 입력 토큰이다. 초과분은 Paid 플랜에서 1,000 뉴런당 $0.011이고 Free 플랜은 초과하면 요청이 실패한다. 지연은 Cloudflare가 43개 평가를 돌리며 잰 값으로 하드웨어, 네트워크 포함 여부, 입력 길이가 공개되지 않았고, TypeSafe는 Jev의 end-to-end 응답 시간을 70~500ms로 밝힌다.

- 텍스트만 판단하고 관리형 API의 낮은 입력 단가가 중요하면 Jev, 이미지 판단이나 자체 호스팅, 자체 미세조정이 필요하거나 서비스가 이미 Cloudflare Workers에서 돈다면 Clef 계열이 후보다. Jev는 고객 데이터로 미세조정이나 LoRA 적응을 하지 않는다. Cloudflare는 Clef와 함께 RL 미세조정 서비스를 발표했는데, 발표 기준 처음에는 Cloudflare의 FDE(forward-deployed engineer) 팀과 함께 진행하고 셀프 서비스 플랫폼은 이후 계획이다. 가중치가 Apache 2.0이라 직접 미세조정할 수도 있다.
- 확인한 예시 기준으로 Jev는 `POST https://api.typesafe.ai/v1/systemone`, Clef는 Workers AI의 `@cf/cloudflare/clef` 실행 경로(REST 또는 `env.AI.run`)를 쓴다. 호환은 요청 본문 형식 수준으로 보고, 교체할 때 엔드포인트, 인증, 모델 ID를 바꾼 뒤 응답 필드와 문턱을 다시 검증한다.
- Workers AI의 Clef 계열은 요청당 질문을 1~64개 받고 토큰 한도를 넘는 긴 `state`를 잘라 처리한다. Hugging Face 모델 카드는 모든 질문의 선택지를 함께 채점한다고 설명하므로, Jev에서 기대던 질문 간 독립성이 유지되는지는 질문을 더하거나 뺀 회귀 세트로 확인한다.

### 정확도 비교 (Cloudflare 측정, 2026-10-01 발표)

| 평가 (지표) | Clef | Clef-flash | Jev |
|---|---|---|---|
| BFCL (case exact) | 98.47 | 98.76 | 95.75 |
| BANKING77 (macro-F1) | 94.20 | 90.93 | 79.74 |
| CLINC150+OOS (macro-F1) | 97.43 | 66.77 | 89.27 |
| When2Call (accuracy) | 72.37 | 65.58 | 80.97 |
| BRIGHT (nDCG@10) | 45.91 | 39.26 | 47.52 |

Cloudflare가 Jev Decision Index의 평가 가운데 10개를 골라 직접 잰 결과에서 다섯 개를 옮겼다. 도구 호출 형식(BFCL)과 BANKING77 의도 분류에서는 Clef 계열이 앞선다. CLINC150+OOS는 Clef가 앞서지만, 범위 밖(out-of-scope) 질의 탐지를 포함한 이 평가에서 Clef-flash는 Jev보다도 크게 낮다. 도구를 부를지, 되물을지, 답할 수 없다고 할지를 고르는 When2Call과 추론이 필요한 검색인 BRIGHT에서는 Jev가 앞선다. 표에 옮기지 않은 ToolRet, API-Bank, Home appliances, Amazon ESCI, PhishNChips에서는 Clef와 Clef-flash가 모두 Jev보다 높았고, Cloudflare는 TypeSafe 자체 워크플로 평가 네 영역 중 세 영역에서 Clef가 Jev를 앞섰다고 밝히며, 같은 표에서 Clef-flash는 한 영역만 앞서고 한 영역은 동률이다. 한쪽 벤더가 고른 평가와 조건이므로 채택은 자기 과업의 라벨 데이터로 정한다.

### 로컬 결정 모델: Laya

2026-10-06에 확인한 Laya 저장소는 입력과 질문을 한 번의 forward pass로 채점하는 비자기회귀 결정 엔진을 제공한다. `choice`, `score`, `noul` 형태의 결정을 내고 영어, 다국어와 특정 워크플로에 맞춘 체크포인트를 구분한다. 첫 사용에는 가중치 다운로드가 필요하므로 로컬 추론과 최초 설치의 네트워크 요구를 나눠 본다.

- **학습 전후를 구분한다:** 제작자가 공개한 typed-decisions 평가(네 워크플로, 2,000개 결정)에서 기본 영어 체크포인트 정확도는 0.362, 해당 과업에 미세조정한 체크포인트는 0.766이다. 제작자 평가이며 다른 언어와 업무에서의 우위를 보장하지 않는다.
- **실행 계층과 모델을 구분한다:** `laya-mlx`는 Apple Silicon용 독립 MLX 포트다. 추론과 가중치 변환을 제공하고 학습은 상위 Laya 프로젝트가 맡는다. 체크포인트와 정밀도가 다르면 확률도 달라질 수 있다.
- **언어와 비용을 다시 잰다:** 다국어 체크포인트가 있다는 사실만으로 한국어 업무 정확도가 충분하다고 판단하지 않는다. 같은 라벨 표본에서 정확도, 양성 재현율, 보정과 전체 지연을 비교한다. 로컬 실행도 하드웨어, 전력, 운영과 재학습 비용이 있으므로 API 청구액이 없다는 이유만으로 총비용을 0으로 잡지 않는다.

게임 데모의 처리 속도는 입력 표현, 모델, 장비와 네트워크 조건에 의존한다. 특정 데모의 속도 배수를 문서 분류나 고객 문의 판정의 정확도 우위로 바꾸지 않는다.

## 한계

- **닫힌 선택지**: 선택지 밖 입력도 어떤 선택지로든 확률이 배분된다. 해당 없음 선택지나 관련성을 묻는 `noul`을 따로 둔다. 입력에 답의 근거가 없는 질문(미래 성과 예측 등)에도 확률은 나온다.
- **Jev 1.13의 알려진 약점**: 의도가 아니라 쓴 질문 그대로 답한다. 범위 단어, 부정, 암묵적 조건을 글자 그대로 읽고 적지 않은 조건은 추론하지 않으며, 이중 부정과 복잡한 간접 지시에서는 덜 안정적이다. 세기, 산술, 날짜 비교에 약하고, 결정과 무관한 내용이 많은 `state`에서 정확도가 떨어진다. Choice 선택지 순서가 답에 영향을 주고 앞쪽 선택지로 기우는 경우가 관찰됐다.
- **프롬프트 인젝션**: Jev 1.13은 `state`를 기본적으로 적대적으로 다루지 않으며, 모델을 조종하려고 쓴 내용이 답을 움직일 수 있다. 판정 대상을 공격자가 쓰는 모더레이션 경로에서는 단일 판정만으로 되돌릴 수 없는 행동을 실행하지 않는다([[LLM-Application-Security#LLM01 프롬프트 인젝션|프롬프트 인젝션]]).
- **언어**: Jev 문서는 영어가 주 학습 언어이고 CJK를 포함한 다른 언어는 같은 수준이 아니라며, 비영어 워크로드는 자기 콘텐츠로 먼저 시험하라고 안내한다. Clef의 언어별 성능은 확인한 공식 자료에 없다.

## 운영 체크포인트

- 결정이 입력만으로 판정 가능하고 선택지가 닫혀 있는가. 아니면 생성형 LLM이나 사람에게 둔다.
- 넓은 질문을 원자적인 질문으로 쪼갰는가. 넓은 질문은 여러 판단을 한 답 뒤에 숨기므로 좁은 답을 받아 가중 합산은 코드에서 한다.
- 행동별 문턱을 오판 비용으로 정하고, 라벨 데이터에서 confidence 구간별 정확도를 그려 확인했는가. 확신이 낮은 사례는 사람이나 더 비싼 추론 모델로 넘기고 그 결과를 라벨로 회수한다.
- 라벨 없이 다른 LLM과의 일치율만 봤다면 그것은 정확도가 아니라 일치율이다. 사람 라벨 표본으로 확인한다([[Eval-LLM-Judge|LLM 판정기]], [[Eval-Golden-Set-and-Deploy-Gates|골든셋]]).
- 모델 버전을 고정했는가. `jev-latest`는 최신 안정 릴리스(2026-10-06 기준 `jev-1.13.0`)를 가리키는 별칭이라 버전이 바뀌면 문턱을 다시 검증한다.
- 선택지 순서를 섞어도 답이 유지되는지, 인젝션 문장을 넣은 회귀 샘플에서 판정이 버티는지 확인했는가.
- `state`에서 결정에 필요 없는 필드를 코드로 걸러 보내는가. 입력 토큰이 비용과 정확도를 함께 좌우한다.

## 출처

- [OpenAI API, Decisions](https://developers.openai.com/api/docs/guides/decisions)
- [OpenAI API Reference, Create a decision](https://developers.openai.com/api/reference/resources/decisions/methods/create)
- [fast-jev-compaction — GitHub, tamaratran](https://github.com/tamaratran/fast-jev-compaction) — 도구 호출과 결과 선별 설계, 판정 입력 축소와 실패 경계
- [Introducing Clef: our open-source decision models, and new RL fine-tuning platform — Cloudflare Blog](https://blog.cloudflare.com/clef-decision-models/)
- [Laya — GitHub, NandhaKishorM](https://github.com/NandhaKishorM/laya) — 로컬 결정 엔진, 체크포인트와 과업별 미세조정 평가
- [laya-mlx — GitHub, mizorewww](https://github.com/mizorewww/laya-mlx) — 독립 MLX 포트와 정밀도, 언어별 체크포인트의 한계
- [Introducing System One Models & Jev — TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [Cloudflare Workers AI, clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- [Cloudflare Workers AI, clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
- [Cloudflare Workers AI, Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Hugging Face, Cloudflare/clef](https://huggingface.co/Cloudflare/clef)
- [TypeSafe Docs, API reference](https://docs.typesafe.ai/api)
- [TypeSafe Docs, Models](https://docs.typesafe.ai/models)
- [TypeSafe Docs, Primitives](https://docs.typesafe.ai/primitives)
- [TypeSafe Docs, Noul](https://docs.typesafe.ai/primitives/noul)
- [TypeSafe Docs, Score](https://docs.typesafe.ai/primitives/score)
- [TypeSafe Docs, Confidence](https://docs.typesafe.ai/confidence)
- [TypeSafe Docs, AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer)
- [TypeSafe Docs, How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Docs, Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing)
- [TypeSafe Docs, Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)
- [TypeSafe Docs, Cookbooks](https://docs.typesafe.ai/cookbooks)
- [TypeSafe Docs, Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
- [When2Call: When (not) to Call Tools — arXiv](https://arxiv.org/pdf/2504.18851)
- [BRIGHT: A Realistic and Challenging Benchmark for Reasoning-Intensive Retrieval — arXiv](https://arxiv.org/pdf/2407.12883)
- [An Evaluation Dataset for Intent Classification and Out-of-Scope Prediction — arXiv](https://arxiv.org/abs/1909.02027v1)
## 관련 문서

- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]] — 확신이 낮은 요청만 상위 티어로 넘기는 에스컬레이션
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]] — 질문 분류 뒤 체인 선택, Function Calling
- [[LLM-Generation-Mechanics-Decoding|LLM 추론과 디코딩]] — Logit과 softmax, 토큰 분포와 확신도의 구분
- [[Agent-Ready-Data|에이전트용 데이터 준비]] — 모델 확신 대신 데이터 신호로 구동하는 임계 라우팅
- [[Eval-LLM-Judge|LLM 판정기]] — 다른 모델과의 일치율과 사람 라벨 교정
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]] — 라벨 세트와 회귀 관문
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 프롬프트 인젝션과 가드 모델 우회
