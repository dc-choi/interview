---
tags: [ai, image-generation, inpainting, comfyui, sagemaker]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["생성형 상품 이미지 워크플로우", "Generative Product Image Workflow"]
---

# 생성형 상품 이미지 워크플로우

상품 이미지 생성은 배경을 새로 만드는 작업과 실제 상품의 형태를 보존하는 작업을 함께 다룬다. 프롬프트에 상품을 유지하라고 적는 것만으로 정합성을 보장하지 않고, 편집 영역과 검수 기준을 별도로 정한다.

## 편집 영역을 입력으로 지정한다

Inpainting은 마스크로 지정한 영역을 다시 생성하는 방식이다. ComfyUI의 `VAE Encode (for Inpainting)`은 입력 이미지와 마스크를 받아 latent를 만들며, `grow_mask_by`로 마스크 주변의 전이 영역을 넓힐 수 있다. 경계를 자연스럽게 잇기 위한 확장이 상품의 가장자리까지 들어가는지 확인한다.

상품 사진에 적용할 때는 다음 순서로 작업을 나눌 수 있다. 이는 공식 API의 필수 절차가 아니라 편집 범위를 통제하기 위한 설계 예시다.

1. 원본 상품 사진과 편집할 배경 영역을 정한다.
2. 마스크와 프롬프트로 배경 후보를 생성한다.
3. 경계, 그림자와 색감의 어색한 부분을 제한된 영역에서 보정한다.
4. 원본과 결과를 나란히 놓고 로고, 부품 수, 형태와 색상을 확인한다.

마스크는 생성할 위치를 지정하는 입력이다. 최종 이미지의 상품 영역이 픽셀 단위로 보존됐다는 증거를 대신하지 않는다. 보존이 필수인 영역은 원본 합성과 차이 비교를 별도 검수 후보로 둔다.

## 상품 유형의 생성과 특정 피사체의 학습을 구분한다

사다리형 선반이라는 유형을 그리는 것과 판매 중인 특정 선반의 외형을 재현하는 것은 서로 다른 목표다. 특정 상품을 다른 장면에 배치하려면 결과가 그럴듯한지만 보지 않고 참조 상품의 특징이 유지되는지 확인한다.

DreamBooth는 특정 피사체의 이미지 몇 장으로 사전학습된 text-to-image 모델을 미세조정하고, 고유 식별자를 그 피사체와 연결하는 방법이다. 추론할 때 식별자와 장면 설명을 함께 사용해 다른 배경, 자세나 시점의 이미지를 생성한다. 클래스별 prior preservation loss는 피사체를 학습하는 동안 해당 클래스의 다양한 표현을 유지하도록 돕는다. 이는 마스크 영역을 지정하는 inpainting과 구분되는 학습 단계다.

상품 업무에 적용할 때는 **프롬프트의 장면 조건**과 **참조 상품의 외형**을 별도 검수 항목으로 둔다. 미세조정을 했다는 사실만으로 로고, 문구와 세부 형상이 정확하다고 판정하지 않는다. 새 시점의 이미지를 생성할 수 있다는 연구 결과도 보이지 않는 면의 실제 사양을 확인했다는 뜻은 아니다. 이는 피사체 생성 기법을 상품 검수에 연결한 적용 기준이며 특정 상용 서비스의 현재 내부 구현을 설명하는 내용은 아니다.

이 절은 2026-10-10 DreamBooth 연구진의 공개 방법 설명과 대조했다. 다른 절의 서비스 지원 범위를 다시 검증한 것은 아니다.

## 작업 그래프와 실행 환경을 분리한다

ComfyUI는 노드를 연결해 생성 단계를 구성하고 워크플로우를 JSON으로 내보낼 수 있다. AWS의 SageMaker AI Processing 예시는 이 워크플로우를 컨테이너에서 실행하고, GPU 인스턴스로 배치 생성한 결과를 S3에 저장한다.

편집자가 그래프를 조정하는 환경과 확정된 그래프를 반복 실행하는 환경을 구분한다. 실행 조건을 다시 확인할 수 있도록 다음을 함께 보존하는 것이 유용하다.

- 워크플로우 JSON, 모델과 custom node 버전
- 입력 이미지, 마스크와 프롬프트
- seed, 출력 크기와 생성 결과
- 검수 결과와 재작업 사유

같은 seed 하나만으로 서로 다른 모델이나 실행 환경의 출력이 동일하다고 가정하지 않는다.

## GPU와 유휴 축소는 배포 방식별로 확인한다

2026-10-07 공식 문서 기준으로 SageMaker AI의 관리형 실행과 Serverless Inference는 같은 의미가 아니다.

| 방식 | 확인한 범위 | 선택 시 확인할 점 |
| --- | --- | --- |
| Processing job | AWS ComfyUI 예시에서 GPU 배치 실행과 작업 종료를 사용 | 묶음 작업의 시작 지연과 완료 시간 |
| Asynchronous Inference | GPU 지원, 요청 큐와 S3 결과 저장, 인스턴스 수 0까지 축소 가능 | 최소 용량과 scaling policy, 0에서 다시 늘어나는 조건 |
| Serverless Inference | 유휴 시 0으로 축소하지만 GPU는 지원하지 않음 | CPU 실행 가능 여부, 메모리와 cold start |

비동기 엔드포인트에서 인스턴스가 0이면 요청은 확장 후 처리할 때까지 대기한다. 최소 용량을 0으로 설정하는 것과 작은 요청에도 재기동되는 정책을 확인하는 것은 별개다. 공식 문서는 `HasBacklogWithoutCapacity` 기반의 추가 확장 정책을 안내한다.

따라서 GPU 이미지 생성 환경을 설계할 때 Serverless Inference를 그대로 선택하지 않는다. 처리 지연을 허용하는 배치 작업인지, 큐에 넣고 결과를 나중에 받는 요청인지부터 구분한다. 생성 단계의 실행 시간만으로 전체 완료 시간을 계산하지 않고 대기, 자원 준비와 결과 저장도 측정한다.

## 시각화된 상품과 실제 제품 사양을 구분한다

2026-10-10 Amazon Nova Canvas의 AI Service Card 대조 기준. 가구 등 상품을 다른 장면에 배치하는 기능은 참조 사진에 없는 면의 세부를 생성할 수 있으며, 실제 치수를 알지 못하므로 정확한 축척을 보장하지 않는다. 사진처럼 보이는 렌더링도 제품 사양이나 물리적 시제품을 검증한 증거는 아니다.

다음은 스케치나 참조 이미지로 상품 후보를 검토할 때의 적용 제안이다. 탐색용 시안과 확정 상품 이미지를 구분하고, 보이지 않는 면, 부품과 비율은 도면이나 실물에 대조한다. 제공된 참조만으로 확인할 수 없는 속성은 확정 사양으로 표시하지 않는다. 생성 모델의 종류를 모르는 고객 사례에 Nova Canvas를 사용했다고 추정하지 않는다.

## 검수 기준

아래는 상품 이미지 업무에 적용할 점검 기준이다.

- **상품 정합성**: 원본에 없는 부품이나 로고 변형이 없는가.
- **합성 품질**: 경계와 그림자가 자연스러운가.
- **실행 재현성**: 어떤 입력과 모델로 만든 결과인지 추적할 수 있는가.
- **처리 성능**: 요청부터 검수 가능한 결과가 저장될 때까지 얼마나 걸리는가.

생성 성공과 공개 가능한 상품 이미지의 완성은 구분한다. 검수에 실패한 결과는 자동 게시하지 않고 재작업 대상으로 둔다.

## 출처

- [DreamBooth: Fine Tuning Text-to-Image Diffusion Models for Subject-Driven Generation — Google Research](https://dreambooth.github.io/) — 피사체 식별자, 미세조정과 클래스별 prior preservation.
- [AWS AI Service Cards, Amazon Nova Canvas](https://docs.aws.amazon.com/ai/responsible-ai/nova-canvas/overview.html) — 참조에 없는 면의 생성과 축척의 한계.
- [ComfyUI, Inpainting Workflow](https://docs.comfy.org/tutorials/basic/inpaint)
- [Running ComfyUI workflows on Amazon SageMaker AI processing jobs — AWS](https://aws.amazon.com/blogs/machine-learning/running-comfyui-workflows-on-amazon-sagemaker-ai-processing-jobs/)
- [Amazon SageMaker AI, Supported features](https://docs.aws.amazon.com/sagemaker/latest/dg/model-deploy-feature-matrix.html)
- [Amazon SageMaker AI, Deploy models with Amazon SageMaker Serverless Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html)
- [Amazon SageMaker AI, Asynchronous inference](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference.html)
- [Amazon SageMaker AI, Autoscale an asynchronous endpoint](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference-autoscale.html)

## 관련 문서

- [[Generative-Video-Editing|생성형 영상 편집과 결과 검증]]
- [[LLM-Product-Attribute-Extraction|상품 이미지의 속성 추출]]
