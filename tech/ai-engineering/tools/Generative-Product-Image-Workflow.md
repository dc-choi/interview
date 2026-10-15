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

### 편집 API의 입력 계약과 반환 결과를 확인한다

2026-10-16 Amazon Nova Canvas 공식 문서 대조 기준, 이미지 생성과 편집은 Bedrock `InvokeModel`로 요청하며 작업 종류에 맞는 입력을 사용한다. 다음은 상품 배경 편집에 연결되는 계약이다.

- `INPAINTING`과 `OUTPAINTING` 요청에는 `maskPrompt` 또는 `maskImage` 중 하나만 넣는다. 직접 만든 마스크 이미지는 입력 이미지와 같은 크기여야 하며 순수한 검정과 흰색만 사용한다.
- `OUTPAINTING`의 `DEFAULT` 모드는 원본 픽셀을 새 배경의 시작점으로 사용해 경계를 자연스럽게 잇는다. 배경색이 크게 바뀌면 halo가 생길 수 있다. `PRECISE`는 마스크 경계를 엄격하게 따르는 모드이므로 경계 처리 목적에 따라 선택한다.
- 성공 응답의 `images` 수가 요청한 `numberOfImages`와 같지 않을 수 있다. 생성 뒤 콘텐츠 정책에 걸린 이미지는 반환 목록에서 제외될 수 있고 `error` 필드가 함께 올 수 있다.

적용 제안: 요청 성공 여부, 실제 반환 이미지 수와 개별 결과의 상품 정합성을 따로 검사한다. 필요한 장수가 모두 만들어졌다고 가정해 다음 편집 단계로 넘기지 않고 부족한 결과와 재작업 사유를 남긴다. 이 절은 API 문서 대조이며 실제 이미지 생성, 품질 측정과 기존 배포 지원 범위의 재검증은 수행하지 않았다.

## 상품 유형의 생성과 특정 피사체의 학습을 구분한다

사다리형 선반이라는 유형을 그리는 것과 판매 중인 특정 선반의 외형을 재현하는 것은 서로 다른 목표다. 특정 상품을 다른 장면에 배치하려면 결과가 그럴듯한지만 보지 않고 참조 상품의 특징이 유지되는지 확인한다.

DreamBooth는 특정 피사체의 이미지 몇 장으로 사전학습된 text-to-image 모델을 미세조정하고, 고유 식별자를 그 피사체와 연결하는 방법이다. 추론할 때 식별자와 장면 설명을 함께 사용해 다른 배경, 자세나 시점의 이미지를 생성한다. 클래스별 prior preservation loss는 피사체를 학습하는 동안 해당 클래스의 다양한 표현을 유지하도록 돕는다. 이는 마스크 영역을 지정하는 inpainting과 구분되는 학습 단계다.

상품 업무에 적용할 때는 **프롬프트의 장면 조건**과 **참조 상품의 외형**을 별도 검수 항목으로 둔다. 미세조정을 했다는 사실만으로 로고, 문구와 세부 형상이 정확하다고 판정하지 않는다. 새 시점의 이미지를 생성할 수 있다는 연구 결과도 보이지 않는 면의 실제 사양을 확인했다는 뜻은 아니다. 이는 피사체 생성 기법을 상품 검수에 연결한 적용 기준이며 특정 상용 서비스의 현재 내부 구현을 설명하는 내용은 아니다.

이 절은 2026-10-10 DreamBooth 연구진의 공개 방법 설명과 대조했다. 다른 절의 서비스 지원 범위를 다시 검증한 것은 아니다.

## LoRA 학습물과 배포 가능한 모델을 구분한다

LoRA는 적은 수의 추가 가중치를 학습해 학습 대상 파라미터와 저장할 가중치를 줄이는 방법이다. DreamBooth와 서로 배타적인 선택지는 아니다. Diffusers는 DreamBooth 학습에 LoRA를 결합하는 방식을 제공한다. 따라서 두 이름만으로 결과 파일의 크기나 품질을 비교하지 않고, 전체 모델 미세조정인지 LoRA 학습인지와 저장한 파일 범위를 함께 확인한다.

추론 예시는 기반 모델로 파이프라인을 만든 뒤 `load_lora_weights`로 학습물을 불러온다. LoRA 파일만 전달했다고 실행 환경까지 전달한 것은 아니다. 다음은 반복적인 스타일 학습과 배포에 적용할 설계 점검 항목이다.

- 기반 모델 식별자와 revision, LoRA 가중치, 추론 코드와 의존성 버전을 함께 기록한다.
- 학습 전 이미지와 캡션의 대응, 해상도와 누락 파일을 검사한다. 학습 완료 뒤에는 고정된 검수 입력으로 스타일과 피사체 보존을 확인한다.
- 학습 성공, 모델 배포 준비, 실제 생성 요청 성공을 서로 다른 완료 상태로 둔다. 작은 학습 파일이 곧 낮은 추론 메모리 사용량을 뜻한다고 가정하지 않는다.

SageMaker Pipelines는 EventBridge 규칙의 대상으로 실행할 수 있고, 규칙의 역할에는 `StartPipelineExecution` 권한이 필요하다. 이미지 묶음의 업로드를 자동화에 연결할 때는 개별 파일 도착과 데이터셋 준비 완료를 구분한다. 예를 들어 검수가 끝난 manifest나 완료 마커를 입력 경계로 삼고, 같은 데이터셋이 다시 통지될 때 중복 학습을 막는 방식을 별도로 설계한다. 이는 권장 설계 예시이며 EventBridge 연결만으로 데이터셋 완결성이나 한 번만 실행됨을 보장한다는 뜻은 아니다.

2026-10-13 Diffusers의 LoRA와 DreamBooth 가이드, AWS의 Pipeline 실행 가이드를 대조했다. 실제 학습이나 배포를 실행한 결과는 아니며 기존 절의 서비스 지원 범위를 다시 검증한 것은 아니다.

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

## 이미지 속 문구와 연속 편집을 따로 검수한다

이미지에 넣을 문구는 먼저 텍스트로 확정하고, 생성 요청에 문구, 글꼴의 특징과 전체 배치를 구체적으로 적는다. Gemini 이미지 생성 문서는 문구를 먼저 생성한 다음 그 문구를 포함한 이미지를 요청하는 방식을 권장한다. 같은 피사체를 다른 각도로 이어 그릴 때는 앞서 생성한 이미지를 다음 요청의 참조로 넣도록 안내한다.

상품 이미지에 적용할 때는 다음을 별도 합격 기준으로 둔다. 이는 공식 성능 보장이 아니라 검수 설계 제안이다.

- **문구 정확성**: 상품명, 숫자, 단위와 한글 받침을 확정 문안과 대조한다. 큰 제목과 작은 설명문을 나눠 보고 실제 게시 크기에서도 읽히는지 확인한다.
- **편집 일관성**: 번역이나 문구 교체 뒤 상품의 색상, 로고와 배치가 유지됐는지 원본과 비교한다. 시리즈 이미지에서는 각 결과를 기준 이미지와 대조한다.
- **비교 조건**: 모델 식별자, 참조 이미지, 출력 크기와 재시도 횟수를 함께 남긴다. 몇 장의 시연 결과를 모든 상품과 언어에서의 우열로 일반화하지 않는다.

문구가 정확해야 하는 최종 산출물은 배경 생성과 확정 텍스트의 후편집 합성을 나누는 방법도 검토한다. 2026-10-13 Google 공식 문서의 문구 작성과 참조 이미지 권고를 대조했다. 모델 간 한국어 성능을 실측하거나 기존 AWS 배포 지원 범위를 재검증한 것은 아니다.

## 인쇄용 산출물은 재단과 색상을 추가로 검수한다

생성한 이미지를 상품 라벨이나 패키지에 쓰면 화면상 품질과 인쇄 파일의 적합성을 구분한다. Avery의 제품 템플릿은 재단선, 안전 영역과 bleed 영역을 구분한다. 보존할 문구와 로고는 안전 영역 안에 두고, 가장자리까지 인쇄할 배경은 바깥 bleed 영역까지 확장한다. 여백 수치는 제품과 템플릿의 규격을 확인한다.

Avery Artwork Guidelines는 실제 인쇄 크기에서의 최소 300 dpi, 글꼴과 그래픽의 포함을 요구하며, 이미지 유형에 따라 더 높은 해상도를 권한다. RGB와 CMYK를 모두 받지만 인쇄 전 색상 변환이 일어날 수 있고, 화면 교정본은 실제 인쇄색과 정확히 일치하지 않는다. 이 조건을 다른 인쇄 업체 전체의 동일한 규격으로 일반화하지 않는다.

적용 제안: 배경 생성 뒤 확정 문구와 로고를 편집 가능한 레이아웃에 합성하고, 선택한 제품 템플릿에 맞춰 출력 파일을 검사한다. 브랜드 색상이 중요하면 실제 인쇄 교정본을 검토한다. 생성 성공, 인쇄 파일 검사와 최종 인쇄 승인에 서로 다른 완료 기준을 둔다.

2026-10-13 Avery의 bleed, 안전 영역과 artwork 공식 가이드를 대조했다. 실제 인쇄나 특정 생성 모델의 브랜드 일관성을 시험한 것은 아니며 기존 AWS 배포 지원 범위의 검증일은 유지한다.

## 검수 기준

아래는 상품 이미지 업무에 적용할 점검 기준이다.

- **상품 정합성**: 원본에 없는 부품이나 로고 변형이 없는가.
- **합성 품질**: 경계와 그림자가 자연스러운가.
- **실행 재현성**: 어떤 입력과 모델로 만든 결과인지 추적할 수 있는가.
- **처리 성능**: 요청부터 검수 가능한 결과가 저장될 때까지 얼마나 걸리는가.

생성 성공과 공개 가능한 상품 이미지의 완성은 구분한다. 검수에 실패한 결과는 자동 게시하지 않고 재작업 대상으로 둔다.

## 출처

- [Amazon Nova, Image generation and editing](https://docs.aws.amazon.com/nova/latest/userguide/image-gen-access.html)
- [Amazon Nova, Request and response structure for image generation](https://docs.aws.amazon.com/nova/latest/userguide/image-gen-req-resp-structure.html)
- [Avery, What are the Bleed and the Safe Areas?](https://www.avery.com/help/article/what-are-the-bleed-and-the-safe-areas)
- [Avery, Artwork Guidelines](https://www.avery.com/custom-printing/resources/artwork-guidelines)
- [Hugging Face Diffusers, LoRA](https://huggingface.co/docs/diffusers/main/en/training/lora)
- [Hugging Face Diffusers, DreamBooth](https://huggingface.co/docs/diffusers/main/en/training/dreambooth)
- [Amazon SageMaker AI, Schedule Pipeline Runs](https://docs.aws.amazon.com/sagemaker/latest/dg/pipeline-eventbridge.html)
- [Google AI for Developers, Nano Banana image generation](https://ai.google.dev/gemini-api/docs/image-generation) — Accurate text in images, Character consistency와 Limitations의 문구 및 참조 입력 권고.
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
