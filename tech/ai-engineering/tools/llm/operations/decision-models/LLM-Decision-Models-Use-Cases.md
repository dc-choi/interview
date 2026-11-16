---
tags: [ai, llm, decision-model, routing]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Decision Models Use Cases", "결정 모델 활용", "OpenAI Decisions API", "Gemini Decisions API", "Strands Decider"]
---

# 결정 모델: 활용 예시

선택지가 닫혀 있고 입력만으로 판정할 수 있는 분기, 라우팅, 모더레이션과 RAG 보조에 결정 모델을 쓰는 방법과 confidence 문턱, 생성형 LLM 분류를 옮긴 전환 사례, 도구 기록 선별 압축, OpenAI와 Gemini Decisions API의 계약을 다룬다. Jev와 Clef의 가격, 지연과 정확도 비교는 [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]에 있다. 상위: [[LLM-Decision-Models|결정 모델]].

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

### 자체 호스팅 결정 모델도 출력 계약을 따로 확인한다

2026-10-28 Strands Decider 공식 README 기준으로, 로컬 CLI와 HTTP 서버에서 `state`와 질문을 받아 선택, 예/아니오와 척도 점수를 반환할 수 있다. 공개한 Qwen3.5 기반 구조는 언어 생성 head를 pointer head로 바꾸어 한 번의 forward pass에서 선택지를 채점한다. 자유로운 설명문 생성과 구분하며, 이 구조만으로 모든 과업의 정확도나 지연 우위를 보장하지 않는다.

- **선택 확률과 confidence를 구분한다.** README의 choice 예시에서 선택한 항목의 확률은 0.773이고 confidence는 0.659다. 최고 확률을 confidence 필드와 같은 값으로 저장하지 않는다. `noul` 예시는 참일 확률만 반환하므로 모든 질문 타입에 confidence가 있다고 가정하지 않는다.
- **보정은 업무 데이터에서 확인한다.** 공식 평가의 보정 결과를 다른 언어, 입력 길이와 업무의 정답률로 그대로 옮기지 않는다. 실제 라벨 표본에서 점수 구간별 오답과 미처리 비율을 보고 라우팅 문턱을 정하는 것은 적용 제안이다.
- **분류 결과와 실행 권한을 분리한다.** 모델이 승인된 요청이라고 높은 점수로 판단해도 실제 사용자 승인이나 접근 권한이 생기는 것은 아니다. 위 송금 분기 예시도 권한과 거래 승인을 별도로 확인한 실행 경로 안에서만 적용한다.

로컬 실행 가능성은 운영 비용이 없다는 뜻이 아니다. 모델 호스팅과 라우팅을 포함한 전체 지연, 자원 사용량과 업무 성공률을 측정한다. 여기서는 공개 계약만 대조했으며 모델 실행이나 포커 실력, 비용 절감 효과를 검증하지 않았다.

### 생성형 LLM 분류를 결정 모델로 옮긴 사례

2026-11-09 Strands Agents 블로그 기준, Amazon과 AWS 팀은 내부 티켓 시스템에서 Claude Sonnet 4.6이 JSON으로 내던 20개 범주 라벨을 Strands Decider로 옮겼다. 처음 쓴 2B 대신 시험 티켓에서 더 나았던 Gemma 4 기반 E4B를 골랐고, 라벨 적용 문턱을 조정한 뒤 별도 티켓 집합에서 운영 중인 Sonnet보다 좋은 결과를 냈다고 밝힌다. 평가 집합의 크기, 지표와 점수는 공개하지 않았다.

- **입력을 모델 한도에 맞춘다:** 기존 라벨 설명만으로 4,096토큰 문맥을 넘어 20개 라벨을 한두 문장의 판정 기준으로 다시 쓰고, 단일 choice 질문에 `none` 선택지를 더했다. 긴 티켓은 가장 오래된 댓글부터 잘라 넣으므로 잘린 부분에 근거가 있으면 정보가 빠진다.
- **세 단계로 전환한다:** 분류 Lambda가 메시지마다 AppConfig에서 `BEDROCK`(Sonnet만), `DUAL`(두 모델을 병렬 호출하고 Sonnet 결과만 적용하며 비교), `DECIDER`(Decider만)를 읽는다. 실제 트래픽의 불일치를 검토해 오프라인 평가보다 많은 정보를 얻었고, 되돌리는 데는 설정 변경 45초가 걸렸다고 밝힌다. 모델 종류와 무관하게 재사용할 수 있는 섀도 실행 방식이다.
- **직렬화 순서도 확률을 바꾼다:** 내용이 같아도 JSON 키 순서가 다르면 출력 확률이 최대 0.19 달라져 모든 요청의 키를 정렬해 보낸다. 선택지 순서처럼 입력 순서를 회귀 시험 항목에 넣는다.

| 항목 (블로그 공개값) | Sonnet 4.6 | Decider E4B |
|---|---|---|
| 호출당 평균 시간 | 4,215ms | 897ms |
| 티켓당 입력, 출력 토큰 | 6,554, 170 | 2,009, 1 |
| 티켓당 비용 | 약 $0.0222 | 약 $0.0005 |

비용은 us-east-1 공개 정가 기준이다. Sonnet은 Bedrock 글로벌 엔드포인트의 토큰 단가(입력 100만 토큰당 $3, 출력 $15)로, Decider는 SageMaker `ml.g5.xlarge`(A10G 1장, 시간당 $1.408)의 가동 시간으로 계산했다. 요청당 약 640ms라 완전 가동하면 100만 건당 약 $250이지만 급증에 대비한 여유를 두어 약 $500로 잡았고 Lambda 비용은 뺐다. 토큰 과금이 인스턴스 시간 과금으로 바뀌므로 절감액은 가동률에 달려 있다([[LLM-Cost-Optimization#오픈 웨이트 소형 모델을 직접 서빙할 때|직접 서빙 비용]]). 연간 수백만 달러를 아낀다는 전망은 티켓 물량을 공개하지 않아 검증할 수 없다. 100만 건당 차이가 약 $21,700이므로 연 100만 달러를 아끼려면 연간 약 4,600만 건이 필요하다(계산).

작성 팀이 든 적용 조건은 닫힌 목록에서 고르고, 처리량이 높고, 기존 경로의 지연이 중요한 작업이다. 라벨에 설명문이 필요하거나 목록이 매주 바뀌거나 유용한 문맥을 수천 토큰 안에 담을 수 없으면 대체하기 어렵다고 본다. 사례 수치는 작성 팀의 보고이며 재현하지 않았다.

### 도구 기록을 선별하는 압축

결정 모델은 요약문을 새로 쓰는 대신 도구 호출과 결과를 남길지 고를 수 있다. `fast-jev-compaction`의 공개 README에서 확인한 설계(2026-10-06)는 호출과 결과를 ID로 짝지은 뒤, 호출 보존과 결과 원문 보존을 각각 `noul`로 묻는다. 결과를 남기거나, 호출과 결과 앞부분만 남기거나, 둘을 함께 제거한다. 첫 메시지와 최근 메시지는 보호하며 출력의 사용자, 어시스턴트 텍스트는 유지한다.

- **원문 유지와 무손실은 다르다:** 남긴 내용이 원문이어도 필요한 도구 결과를 잘못 제거할 수 있다. 확률은 삭제해도 된다는 증거가 아니다.
- **판정 입력과 출력 이력은 다르다:** 판정용 `state`에서는 도구 결과 본문을 짧은 상태 표시로 대체한다. 입력 상한을 맞추려고 오래된 입력이나 텍스트를 줄이면 모델이 보는 판단 근거도 줄어든다.
- **호출 비용을 합산한다:** 질문을 여러 요청으로 나누면 같은 `state`가 반복 전송된다. 입력 토큰, 보존 품질과 압축 뒤 과업 성공률을 함께 비교한다.
- **실패 시 원본을 보존한다:** 공개 패키지는 API 실패와 잘못된 응답 등에서 예외를 내고 호출자가 폴백을 정하게 한다. 이는 README에 명시된 동작이며 이 문서에서 실행 검증한 결과는 아니다.

### OpenAI Decisions API의 요청과 실행 경계

2026-10-09 공식 문서 기준, Decisions API는 public beta이며 `POST /v1/decisions`에서 `gpt-6-luna`를 사용한다. 텍스트와 이미지를 평가하지만 임의의 설명문이나 추출 객체 생성은 Responses API의 Structured Outputs, 인자를 포함한 도구 호출 요청은 function calling의 영역이다. 기존 Jev와 Clef 비교의 가격, 버전과 성능 기준일은 유지한다. 2026-10-22 정식 공개 뒤의 변화는 아래 절에 있다.

- **입력 계약:** Jev의 `state`와 질문 맵을 그대로 보내지 않는다. 공통 근거는 `input`, 질문은 `questions` 배열로 전달하며 질문별 `name`으로 답을 식별한다.
- **질문 타입:** `predicate`는 조건이 참일 추정 확률, `choice`는 제공한 선택지, `score`는 순서가 있는 단계 인덱스의 확률 가중 평균을 돌려준다.
- **이미지 제약:** public beta 당시에는 이미지에 inline base64 data URL을 사용했고 외부 이미지 URL과 `file_id`를 지원하지 않았다. 2026-10-26 가이드 기준으로는 공개된 HTTP/HTTPS 이미지 URL도 받으며 `file_id`는 계속 지원하지 않는다.
- **거부 처리:** 질문별 답이 `type: refusal`일 수 있으므로 확률이나 선택값을 읽기 전에 답의 타입을 검사한다. 거부를 낮은 점수나 기본 선택지로 바꾸어 실행하지 않는다.

모델과 추론 노력을 고르는 라우터에 쓸 때도 판정과 실제 호출 설정 적용을 분리한다. 이는 위 API 계약을 이용한 설계 예시다. 선택 결과가 런타임에서 지원되는지 확인하고, 라벨 표본의 품질 합격률과 라우터를 포함한 전체 비용, 지연을 비교한다. 소수 예제에서 그럴듯한 모델을 골랐다는 사실만으로 비용 절감률이나 과업 성공을 보장하지 않는다.

#### public beta 이후 추가된 기능과 정식 공개

2026-10-22 OpenAI API changelog 기준 Decisions API는 `gpt-6-luna`로 정식 공개(GA)됐고, 2026-10-26 가이드 기준 지원 모델은 여전히 이 하나다. 아래 기능이 모두 GA 날짜에 추가된 것은 아니다. 2026-10-26 확인한 가이드는 public beta 이후 추가된 기능으로 프롬프트 캐싱, 질문별 이미지, `input_json` 콘텐츠 파트로 넘기는 JSON 입력, 요청당 질문 400개(beta는 200개), 공개 HTTP/HTTPS 이미지 URL, 함수 호출과 사용자 정의 도구 호출 및 그 출력을 포함한 대화 이력 평가, 조직 사용량 보고, GPT-Live 연동과 Private Link를 든다. 위의 `input`과 `questions` 계약, 질문 타입 정의와 거부 타입 검사는 GA 가이드에서도 같다.

- **음성은 직접 입력이 아니다:** 파일, 오디오와 item reference는 지원하지 않는다. 음성 앱은 세 방식으로 연결한다. Live가 transcript를 Decisions로 직접 넘기는 native 위임, Live의 알림을 받은 앱이 Decisions를 호출하는 custom 위임, 입력과 출력 transcript 델타로 판정을 트리거하는 방식이다. 위임 방식은 세션을 만들 때 정하고 세션 중에는 바꿀 수 없으며, transcript 트리거는 위임과 별개로 동작한다(GPT-Live 연동은 2026-10-15 추가). 오디오가 아니라 transcript를 판정하므로 전사 오류가 판정 입력에 섞일 수 있다는 점은 가이드가 아니라 이 구조에서 도출한 추론이다.
- **비용 구조:** 비캐시 입력은 100만 토큰당 $0.10이고 출력 토큰은 과금하지 않는다. 캐시 히트는 할인되고 캐시 쓰기는 과금되며, 재사용할 공통 접두부는 1,024 토큰 이상이어야 하고, 질문 내용은 이 최소 길이에 포함되지 않는다. 지역 처리 할증과 긴 문맥 입력 배수도 적용된다(2026-10-26 가이드 기준). 질문 상한이 늘어 같은 근거를 공유하는 질문을 한 요청에 더 많이 묶을 수 있으므로, 질문 분할과 캐시 재사용을 함께 따져 입력 토큰을 비교한다.
- **지연 주장에는 조건이 없다:** 가이드는 Responses API보다 typed answer를 약 10배 빠르게 돌려준다고만 밝히고 측정 조건을 공개하지 않는다. 자기 경로에서 네트워크와 라우터를 포함한 전체 지연을 잰다.

### Gemini Decisions API는 같은 질문 타입에 다른 계약을 둔다

2026-11-11 Google 발표와 2026-11-16 확인한 문서 기준이다. `gemini-decision-1`로 `POST https://generativelanguage.googleapis.com/v1beta/decisions`를 호출하며(SDK의 `api_version`도 `v1beta`), 문서에는 preview나 GA 표기가 없다. 질문 타입 이름(`noul`, `choice`, `score`)은 Jev와 같지만 교체할 때 다시 확인할 계약이 있다.

- **입력:** 공유 근거는 `input`(문자열이나 Content 블록), 질문은 1~1,000개의 `questions` 맵이다. 텍스트, JSON, 이미지, 오디오, 비디오와 PDF를 한 입력에 섞을 수 있고, 문맥은 입력과 모든 질문을 합쳐 262,144토큰이다. 대화 이력, thought와 도구 호출 블록은 받지 않으므로 여러 턴의 맥락은 텍스트로 직렬화한다.
- **confidence와 확률 범위:** confidence는 최상위 답이 맞을 확률의 추정치라 [[LLM-Decision-Models-Mechanics#확률과 confidence 읽기|TypeSafe의 정의]]와 척도가 다르다. noul 확률은 0.01~0.99 범위로 나온다.
- **선택지 키:** choice 선택지는 2~255개이며 키를 UTF-8 바이트 순으로 정렬하고 동률이면 앞선 키를 고른다. 문서는 해당 없음 선택지에 `none_of_the_above` 대신 위치와 무관한 `other` 같은 키를 권한다.
- **차단 처리:** 입력이 안전 필터에 걸리면 질문별 답 대신 HTTP 400 오류(`safety`, `prohibited_content`, `blocklist`, `image_safety`, `content_blocked`)를 돌려준다. OpenAI의 질문별 `refusal`과 달리 요청 전체가 실패하므로 재시도와 폴백을 요청 단위로 설계한다.
- **비용과 지연:** 입력 100만 토큰당 $0.10이고 출력 토큰은 과금하지 않으며, 공유 입력은 질문 수와 관계없이 요청당 한 번 과금한다. 컨텍스트 캐싱, Batch API와 Flex/Priority 추론은 지원하지 않아 반복 입력도 매번 전부 과금된다. Google은 16K 토큰 이하 문맥에서 종단 간 150~250ms(모델 연산 중앙값 50~100ms)이고 질문이 1개에서 100개로 늘어도 거의 같다고 밝히며, 같은 벤치마크 묶음에서 Interactions API의 Gemini 3.5 Flash-Lite보다 약 5배 싸다고 주장한다. 그 벤치마크의 점수와, 성능을 견준 다른 모델의 이름은 발표 본문에 없다.

문서의 작성 권장은 [[LLM-Decision-Models-Comparison#한계|Jev 1.13의 약점]]과 겹친다. 숫자와 날짜 비교는 코드에서 계산해 입력에 넣고, 부정형 대신 긍정형으로 묻고, 점수 척도는 선형으로 둔다.

## 출처

- [Strands Decider README — Strands Labs](https://github.com/strands-labs/strands-decider) — 2026-10-28 CLI와 HTTP 입력, 질문별 출력 예시와 pointer head 구조 확인. 공개 벤치마크 수치를 실제 업무 성능으로 옮기지 않았다.
- [OpenAI API, Decisions](https://developers.openai.com/api/docs/guides/decisions) — 2026-10-26 GA 가이드의 추가 기능, 입력 범위, 가격과 지연 표현 대조
- [OpenAI API Reference, Create a decision](https://developers.openai.com/api/reference/resources/decisions/methods/create)
- [Changelog — OpenAI API](https://developers.openai.com/api/docs/changelog) — 2026-10-06 beta 출시, 2026-10-15 GPT-Live 연동, 2026-10-22 GA 항목
- [OpenAI API, Connect voice to Decisions](https://developers.openai.com/api/docs/guides/decisions-voice) — transcript 기반 연동과 위임 방식
- [fast-jev-compaction — GitHub, tamaratran](https://github.com/tamaratran/fast-jev-compaction) — 도구 호출과 결과 선별 설계, 판정 입력 축소와 실패 경계
- [Introducing Clef: our open-source decision models, and new RL fine-tuning platform — Cloudflare Blog](https://blog.cloudflare.com/clef-decision-models/)
- [Introducing System One Models & Jev — TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [Cloudflare Workers AI, clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- [TypeSafe Docs, Noul](https://docs.typesafe.ai/primitives/noul)
- [TypeSafe Docs, Confidence](https://docs.typesafe.ai/confidence)
- [TypeSafe Docs, How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Docs, Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing)
- [TypeSafe Docs, Cookbooks](https://docs.typesafe.ai/cookbooks)
- [Amazon saves millions by replacing Sonnet 4.6 with Strands Decider — Strands Agents](https://strandsagents.com/blog/amazon-saves-millions-replacing-sonnet-with-strands-decider/) — 2026-11-09 게시. 2026-11-16 전환 단계, 입력 변경, 지연과 토큰, 비용 계산 조건 대조
- [Gemini Decisions API: Fast, calibrated multimodal decisions — Google](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/) — 2026-11-11 게시. 가격, 지연 조건과 비용 비교 주장 대조
- [Gemini API, Decisions API](https://aistudio.google.com/docs/decisions-api) — 2026-11-16 요청과 응답, 한도, 차단 오류와 작성 권장 대조
- [Amazon, Sonnet 4.6을 Strands Decider로 대체해 수백만 달러 절감 — GeekNews](https://news.hada.io/topic?id=36935)
- [Gemini Decisions API - 입력 하나에 최대 1,000개 질문을 평가하는 멀티모달 API — GeekNews](https://news.hada.io/topic?id=37011)

## 관련 문서

- [[LLM-Decision-Models|결정 모델 (묶음 인덱스)]]
- [[LLM-Decision-Models-Mechanics|정의와 동작 원리]]
- [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]] — 확신이 낮은 요청만 상위 티어로 넘기는 에스컬레이션
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]] — 질문 분류 뒤 체인 선택, Function Calling
- [[Agent-Ready-Data|에이전트용 데이터 준비]] — 모델 확신 대신 데이터 신호로 구동하는 임계 라우팅
