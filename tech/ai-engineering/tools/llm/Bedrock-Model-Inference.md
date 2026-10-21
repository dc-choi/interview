---
tags: [ai, llm, aws, bedrock, inference]
status: done
verified_at: 2026-10-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["Bedrock 모델 호출", "Bedrock Model Inference"]
---

# Bedrock 모델 호출

Amazon Bedrock으로 텍스트와 이미지 생성 기능을 만들 때는 프롬프트 실험, 모델별 호출 계약, 애플리케이션 결과 검증을 나누어 확인한다. 콘솔에서 한 번 생성에 성공했다고 다른 모델이나 코드 경로에서도 같은 결과를 보장하지는 않는다.

## 호출 API의 경계

2026-10-22 공식 문서 대조 기준이다. 아래는 Invoke와 Converse 계열의 비교이며 Bedrock의 모든 API를 나열한 표는 아니다.

| 구분 | InvokeModel | Converse / ConverseStream |
|---|---|---|
| 기본 입력 | 모델별 요청 본문 | 지원 모델의 공통 message 구조 |
| 모델 변경 | 모델별 입력과 응답 스키마 확인 | 공통 구조를 재사용하되 모델별 기능 지원 확인 |
| 개별 파라미터 | 해당 모델의 본문 형식 | `additionalModelRequestFields`로 모델별 필드 전달 |
| 스트리밍 | 지원 모델에서 `InvokeModelWithResponseStream` | 지원 모델에서 `ConverseStream` |

두 계열은 `bedrock-runtime` endpoint를 사용한다. `InvokeModel`의 `body`는 모델별 형식이므로 `modelId`만 교체해서 모든 이미지와 텍스트 모델을 호출할 수 있다고 가정하지 않는다. 입력과 출력 modality, 스트리밍 지원도 모델마다 확인한다. [Invoke API](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-api.html), [모델별 요청과 응답](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html)

Converse는 메시지를 지원하는 모델을 위한 공통 인터페이스다. 이미지 입력을 이해하는 것과 이미지 출력을 생성하는 것은 다른 기능이다. 이미지 생성 요청은 대상 모델의 지원 API와 응답 형식을 확인한다. 모델, 리전과 기능의 지원 여부를 별도로 확인하며, 표의 공통 구조를 모든 기능의 호환성으로 확대하지 않는다.

## 대화와 권한

Converse에서 대화를 이어가려면 애플리케이션이 이전 메시지를 후속 요청에 포함한다. `modelId`가 서버에 저장된 대화의 식별자인 것은 아니다. 기본적인 `messages`와 `inferenceConfig` 구성, 모델 전용 필드의 차이를 구분한다.

`Converse` 호출에는 `bedrock:InvokeModel`, `ConverseStream`에는 `bedrock:InvokeModelWithResponseStream` 권한이 필요하다. 이는 호출 권한의 설명이며 모든 모델의 이용 조건을 충족했다는 뜻은 아니다. [Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)

## 실험을 코드로 옮기는 순서

Bedrock 콘솔 playground로 기반 모델을 실험할 수 있다. 공식 안내는 custom model이 콘솔 playground에서 지원되지 않는다고 구분한다. 예전 시연의 화면과 모델 목록을 현재의 지원 목록으로 쓰지 않는다. [Playgrounds 안내](https://docs.aws.amazon.com/bedrock/latest/userguide/playgrounds.html)

다음은 재현성을 위한 **적용 절차 제안**이다.

1. 목표 출력과 평가 입력을 정한다. 텍스트의 길이와 사실성, 이미지의 구도와 요구 요소를 각각 확인한다.
2. 모델 ID, 리전, 프롬프트 템플릿과 입력 변수를 기록한다. 모델별 파라미터와 응답 파서를 함께 맞춘다.
3. 같은 입력을 코드에서 호출해 결과를 비교한다. 성공 응답과 업무 요구 충족을 구분한다.
4. 반복 생성에서는 요청 수, 실패와 재시도, 지연 및 사용량을 확인한다. 모델 변경 후에도 같은 평가 입력으로 다시 확인한다.

정해진 이미지와 설명을 미리 생성하는 설계는 실시간 요청 경로의 생성 작업을 줄일 수 있다. 다만 총 생성량, 미사용 결과물, 저장 비용과 갱신 주기를 함께 계산해야 한다. 사전 생성 자체가 총비용 절감을 보장하지는 않는다. 이 문서는 호출 계약을 대조했으며 실제 계정의 모델 이용 가능 여부, SDK 실행과 비용을 측정하지 않았다.

## 출처

- [Amazon Bedrock, Inference using Invoke API](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-api.html)
- [Amazon Bedrock, Inference using Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [Amazon Bedrock, Inference request parameters and response fields for foundation models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html)
- [Amazon Bedrock, Generate responses in the console using playgrounds](https://docs.aws.amazon.com/bedrock/latest/userguide/playgrounds.html)

## 관련 문서

- [[LLM-Failure-Handling|LLM 실패 처리]]
- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[Bedrock-Private-Access|Bedrock 비공개 연결]]
