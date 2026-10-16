---
tags: [ai, llm, decision-model, routing]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Decision Models Use Cases", "결정 모델 활용", "OpenAI Decisions API"]
---

# 결정 모델: 활용 예시

선택지가 닫혀 있고 입력만으로 판정할 수 있는 분기, 라우팅, 모더레이션과 RAG 보조에 결정 모델을 쓰는 방법과 confidence 문턱, 도구 기록 선별 압축, OpenAI Decisions API의 계약을 다룬다. Jev와 Clef의 가격, 지연과 정확도 비교는 [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]에 있다. 상위: [[LLM-Decision-Models|결정 모델]].

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

## 출처

- [OpenAI API, Decisions](https://developers.openai.com/api/docs/guides/decisions)
- [OpenAI API Reference, Create a decision](https://developers.openai.com/api/reference/resources/decisions/methods/create)
- [fast-jev-compaction — GitHub, tamaratran](https://github.com/tamaratran/fast-jev-compaction) — 도구 호출과 결과 선별 설계, 판정 입력 축소와 실패 경계
- [Introducing Clef: our open-source decision models, and new RL fine-tuning platform — Cloudflare Blog](https://blog.cloudflare.com/clef-decision-models/)
- [Introducing System One Models & Jev — TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [Cloudflare Workers AI, clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- [TypeSafe Docs, Noul](https://docs.typesafe.ai/primitives/noul)
- [TypeSafe Docs, Confidence](https://docs.typesafe.ai/confidence)
- [TypeSafe Docs, How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Docs, Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing)
- [TypeSafe Docs, Cookbooks](https://docs.typesafe.ai/cookbooks)

## 관련 문서

- [[LLM-Decision-Models|결정 모델 (묶음 인덱스)]]
- [[LLM-Decision-Models-Mechanics|정의와 동작 원리]]
- [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]] — 확신이 낮은 요청만 상위 티어로 넘기는 에스컬레이션
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]] — 질문 분류 뒤 체인 선택, Function Calling
- [[Agent-Ready-Data|에이전트용 데이터 준비]] — 모델 확신 대신 데이터 신호로 구동하는 임계 라우팅
