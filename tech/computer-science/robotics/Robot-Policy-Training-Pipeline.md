---
tags: [cs, robotics, vla, imitation-learning, simulation, mlops]
status: done
verified_at: 2026-11-14
category: "CS - 로보틱스"
aliases: ["로봇 정책 학습과 평가 파이프라인", "Robot Policy Training Pipeline", "VLA 미세조정과 시뮬레이션 평가"]
---

# 로봇 정책 학습과 평가 파이프라인

로봇 정책(policy)은 카메라 영상, 관절 상태와 지시문을 받아 다음 동작을 내는 모델이다. 정책을 처음부터 학습하지 않고 사전학습한 VLA 모델을 시연 데이터로 미세조정한 뒤, 시뮬레이터에서 성공률을 재고, 기준을 넘긴 체크포인트만 모델 레지스트리에 등록하는 흐름이 AWS와 NVIDIA 참조 구성이 보여 주는 방식이다. NVIDIA의 GR00T 저장소 자체는 열린 루프 평가 뒤 시뮬레이션이나 실제 하드웨어 시험을 안내할 뿐 레지스트리 관문을 두지 않는다. 각 단계는 서로 다른 증거를 만든다. 학습 성공, 시뮬레이션 성공과 실제 로봇의 작업 성공을 같은 결과로 세지 않는다.

## VLA 모델은 다음 동작 묶음을 예측한다

Vision-Language-Action(VLA) 모델은 영상과 언어 입력을 받아 로봇의 동작을 출력한다. LLM이 다음 토큰을 예측하듯 다음 동작을 예측한다는 비유가 쓰이지만, 동작을 내는 방식은 모델마다 다르다. RT-2는 동작을 텍스트 토큰으로 표현했다([[Deep-Learning-Foundations-and-Practice#순환 모델과 Transformer의 병렬성|딥러닝 기초의 RT-2]]). NVIDIA GR00T N1(2025-03 논문)은 두 시스템을 묶는다.

| 구성 | 역할 | 논문 기준 수치 |
|---|---|---|
| System 2 (VLM) | 영상과 지시문을 해석한다. Eagle-2 VLM의 중간층 표현을 쓴다 | NVIDIA L40 GPU에서 10Hz |
| System 1 (diffusion transformer) | VLM 표현을 cross-attention으로 받아 flow matching으로 연속 동작을 생성한다 | 120Hz 폐루프 동작 생성 |
| 동작 묶음(action chunk) | 한 번의 추론으로 여러 스텝의 동작을 낸다 | H=16. L40 bf16에서 16개 동작 샘플링에 63.9ms |

GR00T-N1-2B는 전체 22억 파라미터 중 13억 4천만이 VLM이다. 두 시스템은 end-to-end로 함께 학습하며, VLM은 사전학습된 Eagle-2에서 출발한다. 이후 버전은 공식 저장소 기준으로 N1.5, N1.6을 거쳐 N1.7(3B)이 일반 제공되었고, N1.7은 VLM 백본을 Cosmos-Reason2-2B로 바꾸고 action horizon을 16에서 40으로 늘렸다. 버전별 수치는 섞지 않는다.

## 데이터 피라미드와 시연 데이터

GR00T N1 논문은 학습 데이터를 피라미드로 설명한다. 아래층에 웹 데이터와 사람 영상, 가운데에 시뮬레이션과 신경망으로 만든 합성 데이터, 맨 위에 실제 로봇에서 수집한 데이터를 둔다. 동작 라벨이 없는 영상에는 잠재 동작이나 역동역학 모델로 추정한 라벨을 붙인다.

- **원격 조작 시연:** 사람이 로봇을 원격 조작하며 성공한 작업 궤적을 기록한다. 이 데이터로 정책이 시연을 흉내 내도록 학습하는 것이 모방 학습(imitation learning)이다.
- **시연 증강:** MimicGen은 소수의 사람 시연을 새 상황에 맞게 변형해 대규모 데이터셋을 자동 합성한다. 논문은 약 200개 시연에서 18개 과제 5만 개 이상의 시연을 만들었다고 보고한다. GR00T N1은 양손 조작용 후속인 DexMimicGen으로 11시간 만에 시뮬레이션 궤적 78만 개(6,500시간 분량)를 만들었다.
- **미세조정 범위:** GR00T N1 논문은 사후학습에서 VL 백본의 언어 부분을 고정하고 나머지를 미세조정한다. 공식 저장소의 사용자 데이터 미세조정은 LeRobot v2 형식에 `meta/modality.json`을 더한 데이터셋과 로봇 종류를 지정하는 `--embodiment-tag`를 요구한다.

합성 데이터에는 생성 방식의 흔적이 남을 수 있다. 증강한 시연이 실제 로봇 동작의 분포를 대표하는지는 별도로 확인한다(이 문서의 해석).

## 평가는 시뮬레이터의 폐루프 실행으로 한다

분류 모델은 정답 라벨이 있는 홀드아웃 데이터로 점수를 낸다. 로봇 정책은 행동이 다음 관측을 바꾸므로 고정된 데이터로는 충분하지 않다. 정책을 환경 안에서 실제로 실행해 작업 성공 여부를 센다.

- **열린 루프 평가:** 기록된 시연의 관측을 넣고 예측 동작을 정답 동작과 비교한다. 공식 GR00T 저장소는 이것을 먼저 확인하고 시뮬레이션 벤치마크나 실제 하드웨어로 넘어가라고 안내한다.
- **닫힌 루프 평가:** 정책의 동작으로 시뮬레이터가 다음 상태를 만들고, 정책이 그 상태를 다시 본다. 에피소드별 성공 여부와 성공률을 기록한다.
- **Isaac Lab-Arena:** Isaac Lab을 확장한 오픈소스 정책 평가 프레임워크다. 장면, 로봇(embodiment)과 과제를 조합해 환경을 만들고, 정책을 클라이언트-서버 구조로 붙여 여러 환경에서 병렬 평가한다. 공식 저장소 README(v0.3, 2026-11-14 확인)는 알파 소프트웨어이고 API가 불안정해 바뀐다고 적으며 운영 환경에 쓰지 말라고 명시한다.

Arena 0.3.1 문서의 GR1 휴머노이드 예제는 물체를 집어 냉장고에 넣고 문을 닫는 과제(`put_item_in_fridge_and_close_door`)와 전자레인지 문을 여는 과제를 GR00T N1.6으로 다룬다. 전자레인지 예제는 단일 환경에서 성공률 0.8 이상을 기대 결과로 제시하고, 2개 GPU에서 환경 10개씩 200 에피소드를 돌린 예시 결과는 성공률 0.605다. 같은 체크포인트도 평가 규모와 환경 구성에 따라 성공률이 달라진다.

시뮬레이션 성공률은 방향을 잡는 근거다. 시뮬레이터와 실제 환경의 차이(sim-to-real gap) 때문에 실제 성공률로 옮겨지지 않을 수 있으며, 배치할 환경을 시뮬레이터가 닮을수록 평가가 유효해진다. 실제 장비의 센서 오차, 지연과 비상 정지는 따로 시험한다([[IoT-Edge-Cloud-Pipeline#생성형 AI의 작업 제안과 물리 제어를 분리한다|생성형 AI와 물리 제어의 분리]]).

## 성공률 관문과 모델 레지스트리

AWS의 Physical AI Toolchain(2026-10 공개, Apache 2.0)은 NVIDIA의 GR00T, Isaac Sim, Isaac Lab, Cosmos, OSMO를 SageMaker, Batch, EKS 같은 AWS 서비스에 올리는 참조 아키텍처와 IaC(구성 요소 대부분이 독립 Terraform 모듈) 모음이다. 그 안의 Isaac Lab Arena 평가 구성(저장소 표기 Preview)은 다음 다섯 단계를 SageMaker 파이프라인으로 묶는다.

1. **FineTune:** VLA 모델을 미세조정한다.
2. **SimEval:** Arena에서 정책을 실행해 에피소드별 결과와 성공률을 낸다.
3. **Validate:** 체크포인트 무결성과 평가 증거를 확인한다.
4. **SuccessGate:** 검증된 성공률을 지정한 임계값(0~1)과 비교한다.
5. **RegisterModel:** 통과한 모델과 증거를 SageMaker Model Registry에 기록한다. 결과는 `PendingManualApproval` 상태의 모델 패키지다.

SageMaker Model Registry는 모델 그룹 안에 1부터 증가하는 버전을 쌓고 승인 상태를 관리한다. SageMaker 프로젝트 템플릿을 쓰면 `Approved`로 바꿀 때 CI/CD 배포가 시작되고, 승인했던 버전을 `Rejected`로 바꾸면 최신 승인 버전을 다시 배포한다. 배포 쪽은 학습 과정을 몰라도 레지스트리에서 승인된 최신 버전만 가져가면 된다. 학습 파이프라인과 배포를 레지스트리라는 계약으로 분리하는 구조다. 같은 시기 AWS가 공개한 Isaac Lab on AWS 구성은 SageMaker 관리형 MLflow의 모델 레지스트리에 학습 결과를 자동 등록하고 staging, production 같은 별칭으로 승격한다. 레지스트리 제품이 달라도 등록, 승인과 배포를 나누는 원칙은 같다. 일반 ML의 같은 구조는 [[Time-Series-Forecast-Evaluation#재학습 평가와 배치 예측을 별도 실행으로 둔다|시계열 재학습과 등록]]을 참고한다.

관문 통과는 품질 보증이 아니다. 저장소 예제는 임계값 0으로 파이프라인 동작만 확인하며, 3 에피소드 중 1개 성공한 결과가 파이프라인이 동작했다는 증거일 뿐 운영 준비가 된 정책이라는 뜻이 아니라고 적는다. 등록 뒤에도 승인자가 계보(lineage)를 검토한다. Toolchain 블로그는 Jetson으로의 엣지 배포를 흐름에 넣지만, 저장소의 엣지 배포 구성 요소는 2026-11-14 확인 시점에 Planned로 표시되어 있다.

## 운영 체크포인트

- 성공률을 보고할 때 에피소드 수, 환경 수, 시뮬레이터 버전과 정책 체크포인트를 함께 남긴다. 3 에피소드의 33%와 200 에피소드의 60%는 같은 강도의 증거가 아니다.
- 성공률 임계값은 업무 위험에서 정한다. 예제의 0이나 0.8을 기본값으로 쓰지 않는다.
- 레지스트리 등록, 승인, 배포와 실제 작업 성공을 서로 다른 상태로 추적한다.
- 시연 데이터, 증강 방법과 미세조정 범위를 모델 버전과 연결해 둔다. 어떤 데이터가 성공률을 바꿨는지 되짚을 수 있어야 한다.
- 모델 크기만으로 작업 능력을 판단하지 않고 같은 과제와 평가 조건의 성공률로 비교한다. 2~3B 규모의 VLA를 대형 언어 모델의 파라미터 수와 같은 잣대로 평가하지 않는다.

## 이해 확인

- 열린 루프 평가가 높은데 닫힌 루프 성공률이 낮다면 무엇을 의심하는가?
- SuccessGate를 통과한 모델을 왜 곧바로 `Approved`로 두지 않는가?
- 시뮬레이터에서 성공률이 오른 원인이 정책 개선인지 평가 환경 변경인지 어떻게 구분하는가?

## 출처

- [GR00T N1: An Open Foundation Model for Generalist Humanoid Robots — NVIDIA, arXiv](https://arxiv.org/abs/2503.14734) — 2026-11-14 v2 본문의 이중 시스템 구조, 파라미터 수, 동작 묶음과 주파수, 데이터 피라미드, 사후학습 고정 범위 대조.
- [Isaac-GR00T — NVIDIA, GitHub](https://github.com/NVIDIA/Isaac-GR00T) — 2026-11-14 README의 N1.7 일반 제공과 변경점, 데이터셋 형식, embodiment tag, 열린 루프 평가 안내 대조.
- [Isaac Lab-Arena — NVIDIA, GitHub](https://github.com/isaac-sim/IsaacLab-Arena) — 2026-11-14 README의 정의와 알파 표기 대조.
- [Isaac Lab-Arena, Documentation release 0.3.1](https://isaac-sim.github.io/IsaacLab-Arena/release/0.3.1/) — 2026-11-14 static manipulation 예제의 평가 단계(GR1 전자레인지 과제의 기대 성공률과 다중 GPU 예시 결과)와 sequential static manipulation 예제(냉장고 넣기와 문 닫기 과제) 대조.
- [MimicGen: A Data Generation System for Scalable Robot Learning using Human Demonstrations — Mandlekar 외, arXiv](https://arxiv.org/abs/2310.17596) — 2026-11-14 초록의 시연 합성 규모 대조.
- [Introducing AWS Physical AI Toolchain — AWS Physical AI Blog](https://aws.amazon.com/blogs/physical-ai/introducing-aws-physical-ai-toolchain/) — 2026-10-07 게시. 구성 요소와 단계 대조.
- [sample-the-physical-ai-toolchain-on-aws — aws-samples, GitHub](https://github.com/aws-samples/sample-the-physical-ai-toolchain-on-aws) — 2026-11-14 README의 구성 요소와 상태 표기, `isaac-lab-arena-on-aws` README 앞부분의 다섯 단계, 승인 상태와 임계값 설명 대조.
- [Isaac Lab on AWS: From Simulation to Registered Policy — AWS Physical AI Blog](https://aws.amazon.com/blogs/physical-ai/isaac-lab-on-aws-from-simulation-to-registered-policy/) — 2026-10-02 게시. MLflow 레지스트리 자동 등록과 별칭 승격 대조. 본문 후반은 열람이 끊겨 확인하지 못했다.
- [Amazon SageMaker AI, Model Registry](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html) — 2026-11-14 모델 그룹과 CI/CD 연계 대조.
- [Amazon SageMaker AI, Model Groups and Versions](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-models.html) — 2026-11-14 버전 번호 규칙 대조.
- [Amazon SageMaker AI, Update the Approval Status of a Model](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-approve.html) — 2026-11-14 프로젝트 템플릿의 승인 상태 전이와 배포 동작 대조.
- [GenerAIly Speaking: Let's train some humanoids — Amazon Web Services](https://www.youtube.com/watch?v=ljUjsyPhVOE) — 2026-11-02 게시 발표. 파이프라인 흐름의 계기.

## 관련 문서

- [[Robotics|로보틱스 지도]]
- [[Physical-AI-and-Liquid-Control|피지컬 AI와 리퀴드 제어]]
- [[World-Models|월드 모델]]
- [[Reinforcement-Learning-from-Experience|경험 기반 강화학습]]
- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]
