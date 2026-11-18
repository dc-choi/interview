---
tags: [cs, robotics, vla, imitation-learning, simulation, mlops]
status: done
verified_at: 2026-11-19
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

### 움직이는 물체, 기억과 접촉을 별도 입력으로 다룬다

한 시점의 영상만 보는 정책은 물체의 궤적을 알 수 없다. RLDX-1 기술 보고서(RLWRLD, arXiv 2605.03269, 2026-05)는 기존 VLA가 움직이는 컨베이어 위 조작처럼 동적인 환경에서 적절히 행동하지 못하는 이유를 정지 영상 관측이 물체의 궤적과 시간 변화를 담지 못하기 때문이라고 보고, 가려진 상태의 접촉력 추정과 이전 상호작용에 근거한 판단도 같은 한계로 꼽는다. 이를 세 가지 추가 입력으로 다룬다.

| 모듈 | 하는 일 | 보고서와 저장소 기준 구성 |
|---|---|---|
| 움직임(motion) | 여러 프레임의 시간 변화를 담는다 | 사전학습은 4개 프레임 영상을 입력으로 쓰고, 시공간 자기유사도(STSS) 모듈은 중간학습에서 비전 인코더 27층 중 9층 뒤에 넣는다. 언어 모델 쪽에서는 과거 프레임을 평균 풀링한 문맥 토큰 하나로 줄인다 |
| 기억(memory) | 과거 판단을 현재 판단에 합친다 | 동작 묶음 단위로 이전 인지 특징을 큐에 쌓아 가벼운 Transformer로 합친다. 큐 크기는 보고서 기준 3, 저장소 README의 메모리 길이 기본값은 4다 |
| 물리(physics) | 촉각과 토크를 별도 입력으로 받는다 | 센서가 없으면 attention을 가려 물리 스트림을 끈다. 학습 중에는 앞으로의 물리 신호도 예측한다 |

동작 생성부인 Multi-Stream Action Transformer는 인지(cognition)와 행동(action) 스트림을 두고, 물리 신호가 있으면 물리 스트림을 더해 joint self-attention으로 잇는다. 공식 저장소(코드 Apache 2.0, GR00T N1.7 기반, 가중치는 비상업 라이선스)에서 세 모듈은 기본으로 꺼져 있고 학습 설정으로 켠다. v1.0.2 README 기준 RLDX-1은 사전학습 체크포인트가 6.9B, 모든 추가 모듈을 켠 중간학습 체크포인트(MT-DROID, MT-ALLEX)가 8.1B다. 2026-11-12 공개된 RLDX-1.1의 체크포인트는 모두 6.6B이며, README는 영상 입력 모델의 미세조정에서 움직임 모듈을 켰고 RLDX-1의 영상 입력 체크포인트에는 쓰지 않았다고 적는다. 그래서 모델 이름만으로 세 모듈이 모두 켜진 결과라고 읽지 않고 체크포인트별 설정을 확인한다.

저장소의 벤치마크 표는 회사가 정리한 것이다. 보고서 부록 기준으로 기준선 점수에는 공식 저장소, 원 논문과 리더보드에서 가져온 값과 저자가 재현한 값이 섞여 있고, main README는 일부 점수를 현재 평가 설정으로 재평가했다고만 적고 대상을 특정하지 않는다(예: 저자 재현값인 GR-1 Tabletop의 π0.5가 v1.0.2의 15.4에서 main의 43.3으로 바뀜). 비교할 때는 README 판과 평가 설정을 함께 적는다. 2026-11 업계 인터뷰(아래 출처의 RLWRLD 대표)는 이 구성을 VLA 백본으로 쓰는 VLM이 주로 이미지로 학습돼 움직이는 물체의 미래 위치 예측과 긴 기억에 약하기 때문이라고 설명했지만, 보고서에서 확인한 근거는 관측이 정지 영상이라는 점까지다.

## 데이터 피라미드와 시연 데이터

GR00T N1 논문은 학습 데이터를 피라미드로 설명한다. 아래층에 웹 데이터와 사람 영상, 가운데에 시뮬레이션과 신경망으로 만든 합성 데이터, 맨 위에 실제 로봇에서 수집한 데이터를 둔다. 동작 라벨이 없는 영상에는 잠재 동작이나 역동역학 모델로 추정한 라벨을 붙인다.

- **원격 조작 시연:** 사람이 로봇을 원격 조작하며 성공한 작업 궤적을 기록한다. 이 데이터로 정책이 시연을 흉내 내도록 학습하는 것이 모방 학습(imitation learning)이다.
- **시연 증강:** MimicGen은 소수의 사람 시연을 새 상황에 맞게 변형해 대규모 데이터셋을 자동 합성한다. 논문은 약 200개 시연에서 18개 과제 5만 개 이상의 시연을 만들었다고 보고한다. GR00T N1은 양손 조작용 후속인 DexMimicGen으로 11시간 만에 시뮬레이션 궤적 78만 개(6,500시간 분량)를 만들었다.
- **미세조정 범위:** GR00T N1 논문은 사후학습에서 VL 백본의 언어 부분을 고정하고 나머지를 미세조정한다. 공식 저장소의 사용자 데이터 미세조정은 LeRobot v2 형식에 `meta/modality.json`을 더한 데이터셋과 로봇 종류를 지정하는 `--embodiment-tag`를 요구한다.

합성 데이터에는 생성 방식의 흔적이 남을 수 있다. 증강한 시연이 실제 로봇 동작의 분포를 대표하는지는 별도로 확인한다(이 문서의 해석).

### 원격 조작 시연의 한계와 손에 드는 그리퍼 시연

원격 조작은 시연이 곧 로봇의 관절 궤적이 된다는 장점이 있다. UMI 논문(Chi 외, 2024-02)은 원격 조작에 장비 구축 비용과 숙련 조작자가 필요하다고 보고, 스페이스마우스, VR/AR 컨트롤러, 스마트폰, 햅틱 장치 같은 기존 인터페이스는 비싸거나 지연과 직관성 부족으로 쓰기 어렵다고 정리한다. ALOHA, GELLO 같은 리더-팔로워 장비는 직관적이고 저가지만 수집 중 실제 로봇이 있어야 해서 수집할 수 있는 환경의 종류와 수가 제한되고, 결과 데이터와 정책은 특정 로봇 형태에 묶인다. 논문의 그림 설명은 동적, 정밀, 양손, 장기 과제를 기존 원격 조작으로 하기 어려운 과제로 든다.

UMI는 GoPro를 단 손에 드는 그리퍼로 사람이 현장에서 직접 시연하게 해 수집 단계에서 로봇을 없앤다. 시연과 로봇이 같은 그리퍼를 써 관측의 몸 차이를 줄이며, 논문은 기종에 묶이지 않는 정책을 주장하고 UR5와 Franka 두 기종에 배치해 보였다. 대신 기구학적으로 실행할 수 없는 시연을 걸러내는 단계와 SLAM이 동작할 시각 조건이 필요하고, 논문도 그리퍼 수집이 맨손 시연보다 덜 효율적이라고 한계에 적는다. 맨손 동작을 캡처하는 방식은 사람과 로봇의 몸 차이를 옮기는 문제가 더 크다. 어느 방식이든 원격 조작의 문제를 없애는 것이 아니라 비용 구조를 바꾸는 선택이다(이 문서의 해석).

2026-11 업계 인터뷰(아래 출처의 RLWRLD 대표)는 원격 조작 데이터가 조작 실패를 만회하는 동작 때문에 자연스럽지 않고 느리며, 외주 수집에서는 그 작업의 숙련자가 아닌 사람이 시연한다는 점을 한계로 들어, 현장 숙련자의 맨손 3D 동작과 촉각을 함께 기록하는 쪽을 택했다고 설명했다. 데이터를 모으는 쪽보다 모델을 만드는 쪽이 필요한 데이터 형식을 먼저 정해야 한다는 주장도 했다. 회사의 전략 설명이며, 숙련자 시연이 정책 성공률을 얼마나 높이는지는 확인한 공개 자료가 없다.

## 평가는 시뮬레이터의 폐루프 실행으로 한다

분류 모델은 정답 라벨이 있는 홀드아웃 데이터로 점수를 낸다. 로봇 정책은 행동이 다음 관측을 바꾸므로 고정된 데이터로는 충분하지 않다. 정책을 환경 안에서 실제로 실행해 작업 성공 여부를 센다.

- **열린 루프 평가:** 기록된 시연의 관측을 넣고 예측 동작을 정답 동작과 비교한다. 공식 GR00T 저장소는 이것을 먼저 확인하고 시뮬레이션 벤치마크나 실제 하드웨어로 넘어가라고 안내한다.
- **닫힌 루프 평가:** 정책의 동작으로 시뮬레이터가 다음 상태를 만들고, 정책이 그 상태를 다시 본다. 에피소드별 성공 여부와 성공률을 기록한다.
- **Isaac Lab-Arena:** Isaac Lab을 확장한 오픈소스 정책 평가 프레임워크다. 장면, 로봇(embodiment)과 과제를 조합해 환경을 만들고, 정책을 클라이언트-서버 구조로 붙여 여러 환경에서 병렬 평가한다. 공식 저장소 README(v0.3, 2026-11-14 확인)는 알파 소프트웨어이고 API가 불안정해 바뀐다고 적으며 운영 환경에 쓰지 말라고 명시한다.

Arena 0.3.1 문서의 GR1 휴머노이드 예제는 물체를 집어 냉장고에 넣고 문을 닫는 과제(`put_item_in_fridge_and_close_door`)와 전자레인지 문을 여는 과제를 GR00T N1.6으로 다룬다. 전자레인지 예제는 단일 환경에서 성공률 0.8 이상을 기대 결과로 제시하고, 2개 GPU에서 환경 10개씩 200 에피소드를 돌린 예시 결과는 성공률 0.605다. 같은 체크포인트도 평가 규모와 환경 구성에 따라 성공률이 달라진다.

### 산업 작업 기준의 손재주 벤치마크: DexBench

RLWRLD는 상자 옮기기나 집안일 같은 연구용 과제의 성공률로는 공장, 물류센터나 매장에서 쓸 손재주를 판단하기 어렵다고 보고, 2026-06-09 NVIDIA와의 협력으로 DexBench를 발표했다.

- **분류 구조:** 2026-11-19 확인한 dexbench.org는 손재주를 손의 속성이 아니라 과제를 해내는 능력으로 정의한다(Dexterity Regimes 페이지). 실제 산업 현장의 과제(World)를 Skill 단위로 나누어 분석하고, Skill은 한 가지 목적의 최소 조작 단위인 Action 하나에 병목 하나를 결합해 정의한다. 현재 사이트는 Action 16개 아래 Skill 78개를 두고, 다섯 손재주 영역(Grasp Diversity, Spatial Precision, Temporal Precision, Contact Precision, Context Awareness)을 제시한다.
- **공개 저장소(2026-11-19 확인):** GitHub의 RLWRLD/DexBench(첫 커밋 2026-11-09)는 IsaacLab-Arena와 Newton 물리 엔진 위에 만든 평가 환경이다. 소매 3개, 물류 4개, 제조 5개, 호텔 식음료 3개로 네 산업 환경의 15개 과제를 두고, 물체, 공간, 물리 일반화를 따로 시험한다. 이번 공개분은 평가와 OpenXR 원격 조작을 포함하고, 학습 시연 데이터는 LeRobot v3.0 형식으로 Hugging Face에 공개됐다. 데이터 생성과 모델 학습 스크립트는 빠져 있고 기술 보고서는 공개 예정으로 표시돼 있다.
- **문서마다 다른 단위:** 2026-06 보도자료는 다섯 영역이 18개 핵심 원자 과제(Key Atomic Tasks)에 걸친다고 적었다. 보도자료의 18개, 사이트의 Action 16개와 Skill 78개, 저장소의 15개 과제가 서로 어떻게 대응하는지는 확인한 세 출처(dexbench.org, 저장소 README, 보도자료)가 밝히지 않고 시뮬레이션 사이트 dexbench.ai의 과제 페이지는 확인하지 못했으므로, 인용할 때 단위 이름, 기준 문서와 시점을 함께 적는다. 보도자료가 계획으로 밝힌 손재주 조작 데이터 형식 정의와 공개 산업 사양 제안의 완료 여부는 확인하지 않았다.
- **읽는 법(이 문서의 판단):** 벤치마크를 만든 회사가 자사 모델(RLDX-1)도 평가하므로, 독립 평가가 나오기 전까지 점수는 자체 보고로 읽는다. README가 링크하는 dexbench.ai의 순위표 내용은 확인하지 못했다. 환경별 결과는 어떤 작업에 먼저 투입을 검토할지 고르는 재료이며 현장 성공률이 아니다.

시뮬레이션 성공률은 방향을 잡는 근거다. 시뮬레이터와 실제 환경의 차이(sim-to-real gap) 때문에 실제 성공률로 옮겨지지 않을 수 있으며, 배치할 환경을 시뮬레이터가 닮을수록 평가가 유효해진다. 실제 장비의 센서 오차, 지연과 비상 정지는 따로 시험한다([[IoT-Edge-Cloud-Pipeline#생성형 AI의 작업 제안과 물리 제어를 분리한다|생성형 AI와 물리 제어의 분리]]).

### 구동기 모델을 실측에 맞춰 sim-to-real 차이를 줄인다

시뮬레이터의 구동기 모델이 실물과 다르면 정책은 실제 하드웨어가 할 수 없는 동작을 배울 수 있다. 예를 들어 시뮬레이터의 모터가 실제보다 힘을 빨리 내면, 정책은 실물에서는 늦을 타이밍에 힘을 쓰는 법을 익힌다(설명을 위한 예시). 2026-11 Boston Dynamics가 공개한 바퀴 단 Atlas 실험은 이 차이를 줄이는 과정을 보여 준다. 시판 스쿠터 바퀴를 어댑터 하나로 기존 발목 구동기에 달아, 출발, 회전, 정지마다 모터가 실제 하중을 받은 채 토크-속도 범위 전체를 오가게 만든 연구용 시험대다.

- **학습:** 시뮬레이션에서 전신 강화학습 정책을 학습했다. 기존 정책 프레임워크를 가져와 보상 구성, 학습할 명령의 범위와 자세 유지 방식만 조정했다. 일부 동작은 사람 모션캡처를 따라가게 했는데, 발을 많이 미끄러뜨리는 클립을 일부러 골랐다.
- **레퍼런스에 없던 행동:** 사람은 옆으로 미끄러질 때 발을 끌지만, 정책은 바퀴 방향을 틀어 굴러가는 방법을 찾았다. 사람에게 바퀴가 없으니 시연 데이터로는 줄 수 없는 동작이다.
- **sim-to-real 작업:** 모든 소프트웨어 환경에서 저수준 제어 파라미터가 일치하는지 확인하고, 실제 구동기의 특성 측정 실험을 한 뒤 시뮬레이터의 모터 모델을 측정값에 맞췄다. 어떤 근사는 안전하고 어떤 근사는 정책이 악용하는지도 따로 판단했다. 측정 신호와 맞춘 파라미터의 세부는 공개되지 않았다.
- **주장의 범위:** 첫 시도에 성공했다는 표현은 사람의 회전 점프 기록을 따라가는 360도 점프 정책 하나에 붙은 것이고, 회사도 그 동작을 위험이 낮은 동작으로 설명했다. 모든 동작이 첫 시도에 옮겨졌다는 뜻은 아니다.
- **다음 과제:** 회사는 이 교훈을 Atlas의 표준 구성(standard configuration)에 반영하고 있으며, 구동기 고장에 대한 정책의 대응을 다음 연구로 밝혔다.

정확한 구동기 모델과 학습 기반 상위 제어는 대체 관계가 아니라 함께 쓸 때 효과가 난다는 것이 이 사례의 요지다. 정책을 실물에 옮기기 전에 시뮬레이터의 구동기 응답, 제어 주기와 게인이 실물과 같은지 먼저 확인한다(이 문서의 판단).

## 성공률 관문과 모델 레지스트리

AWS의 Physical AI Toolchain(2026-10 공개, Apache 2.0)은 NVIDIA의 GR00T, Isaac Sim, Isaac Lab, Cosmos, OSMO를 SageMaker, Batch, EKS 같은 AWS 서비스에 올리는 참조 아키텍처와 IaC(구성 요소 대부분이 독립 Terraform 모듈) 모음이다. 그 안의 Isaac Lab Arena 평가 구성(저장소 표기 Preview)은 다음 다섯 단계를 SageMaker 파이프라인으로 묶는다.

1. **FineTune:** VLA 모델을 미세조정한다.
2. **SimEval:** Arena에서 정책을 실행해 에피소드별 결과와 성공률을 낸다.
3. **Validate:** 체크포인트 무결성과 평가 증거를 확인한다.
4. **SuccessGate:** 검증된 성공률을 지정한 임계값(0~1)과 비교한다.
5. **RegisterModel:** 통과한 모델과 증거를 SageMaker Model Registry에 기록한다. 결과는 `PendingManualApproval` 상태의 모델 패키지다.

SageMaker Model Registry는 모델 그룹 안에 1부터 증가하는 버전을 쌓고 승인 상태를 관리한다. SageMaker 프로젝트 템플릿을 쓰면 `Approved`로 바꿀 때 CI/CD 배포가 시작되고, 승인했던 버전을 `Rejected`로 바꾸면 최신 승인 버전을 다시 배포한다. 배포 쪽은 학습 과정을 몰라도 레지스트리에서 승인된 최신 버전만 가져가면 된다. 학습 파이프라인과 배포를 레지스트리라는 계약으로 분리하는 구조다. 같은 시기 AWS가 공개한 Isaac Lab on AWS 구성은 SageMaker 관리형 MLflow의 모델 레지스트리에 학습 결과를 자동 등록하고 staging, production 같은 별칭으로 승격한다. 레지스트리 제품이 달라도 등록, 승인과 배포를 나누는 원칙은 같다. 일반 ML의 같은 구조는 [[Time-Series-Forecast-Evaluation#재학습 평가와 배치 예측을 별도 실행으로 둔다|시계열 재학습과 등록]]을 참고한다.

관문 통과는 품질 보증이 아니다. 저장소 예제는 임계값 0으로 파이프라인 동작만 확인하며, 3 에피소드 중 1개 성공한 결과가 파이프라인이 동작했다는 증거일 뿐 운영 준비가 된 정책이라는 뜻이 아니라고 적는다. 등록 뒤에도 승인자가 계보(lineage)를 검토한다. Toolchain 블로그는 Jetson으로의 엣지 배포를 흐름에 넣지만, 저장소의 엣지 배포 구성 요소는 2026-11-14 확인 시점에 Planned로 표시되어 있다.

## 범용 프런티어 모델로 로봇을 직접 제어하는 경로

Fortune의 2026-11-13 보도(OpenAI 대변인 확인)에 따르면 OpenAI는 독립 로보틱스 팀을 해체하고 로보틱스 연구 인력은 본 연구 조직으로, 응용 로보틱스와 하드웨어 인력은 Applied 조직으로 옮겼다. 회사는 로봇을 접는 것이 아니라 진전을 가속하려는 개편이라고 설명하며, 연초에는 Sora 같은 영상 모델을 바탕으로 하는 경로가 최선이라고 봤지만 이후 GPT-6 Astra 같은 범용 프런티어 모델을 로봇에 직접 적용할 수 있음을 확인한 것이 계기라고 밝혔다.

- **구성:** 기사는 연구진이 GPT-6 Astra에 카메라 영상, 로봇 정보와 동작을 명령하는 제어 인터페이스를 주고 로봇 전용 학습 없이 썼다고 설명한다. 호출 경로, 제어 주기와 동작 표현은 기사에 없다. 위의 VLA처럼 동작을 직접 출력하도록 시연 데이터로 학습한 정책과는 다른 경로다.
- **수치의 범위:** 기사가 인용한 Nvidia 연구에서 Astra 기반 에이전트는 시뮬레이션 조작 벤치마크의 성공률 74.8%로 같은 순위표의 최고 로봇 특화 모델(51.0%)보다 높았다. 시뮬레이션 결과이므로 위의 sim-to-real 차이가 그대로 남는다.
- **반론:** 기사 속 연구자들은 연결 없이 로봇 안에서 도는 작은 모델이 여전히 필요하고(클라우드의 대형 모델은 느리다), 현장 배치에서 쌓은 데이터가 특정 장소와 작업에 적응하는 우위를 준다고 본다.
- **해석(이 문서의 판단):** GR00T N1이 느린 VLM(10Hz)과 빠른 동작 생성기(120Hz)를 나눴듯이, 범용 모델은 장면 해석과 상위 계획에 두고 고주파 제어와 비상 정지는 로봇 안의 정책과 제어기에 두는 계층 구성으로 읽는 편이 안전하다([[Physical-AI-and-Liquid-Control#판단과 반사를 계층으로 나눈다|판단과 반사의 계층]]). 범용 모델을 직접 붙일 때는 응답 지연, 연결이 끊겼을 때의 안전 정지와 실제 장비의 성공률을 따로 시험한다.

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
- [DexBench: Defining the Taxonomy for Industrial Dexterity — RLWRLD](https://dexbench.org/) — 2026-11-19 루트 페이지의 Action, Skill, World 정의와 개수, `/en/dexterity-regimes/`의 손재주 정의와 다섯 영역 대조.
- [DexBench — RLWRLD, GitHub](https://github.com/RLWRLD/DexBench) — 2026-11-19 README의 기반 플랫폼, 환경별 과제 수, 공개 범위와 데이터셋 형식, 커밋 날짜 대조.
- [RLWRLD Launches DexBench Initiative to Define Next-Generation Industry Standards for Humanoid AI in Collaboration with NVIDIA — RLWRLD, PR Newswire](https://en.prnasia.com/releases/global/rlwrld-launches-dexbench-initiative-to-define-next-generation-industry-standards-for-humanoid-ai-in-collaboration-with-nvidia-536553.shtml) — 2026-06-09 발표의 세 가지 계획, 다섯 영역과 18개 과제 표기, 2026-11-19 대조.
- [엔비디아는 왜 한국 스타트업과 로봇 손재주 동맹 맺었나? (류중희 리얼월드 대표) — 티타임즈TV](https://www.youtube.com/watch?v=MNJANd25Tp0) — 2026-11-11 업로드, 음성 인식 전사문 기준. 산업 작업 기준 벤치마크의 문제의식.
- [RLDX-1 Technical Report — RLWRLD, arXiv](https://arxiv.org/abs/2605.03269) — 2026-05-05 v1, 05-06 v2. 2026-11-19 초록, 2절, 4절과 부록 G.1의 기존 VLA 한계, 움직임, 기억, 물리 모듈 구성과 기준선 점수 출처 대조.
- [RLDX-1 — RLWRLD, GitHub](https://github.com/RLWRLD/RLDX-1) — 2026-11-19 main(RLDX-1.1)과 v1.0.2 README의 MSAT, 모듈 기본값, 체크포인트 크기, 라이선스와 벤치마크 표 대조.
- [Universal Manipulation Interface: In-The-Wild Robot Teaching Without In-The-Wild Robots — Chi 외, arXiv](https://arxiv.org/abs/2402.10329) — 2024-02-15 v1, 2024-03-06 v3. 2026-11-19 v3의 초록, Fig. 1 설명, 서론, II-A절과 한계 절의 원격 조작 한계와 손에 드는 그리퍼 수집 방식 대조.
- [우리가 어떤 민족입니까? 피지컬의 민족입니다. (류중희 리얼월드 대표) — 티타임즈TV](https://www.youtube.com/watch?v=He9623x-WEQ) — 2026-11-12 업로드, 음성 인식 전사문 기준. 원격 조작 데이터의 한계와 숙련자 시연 전략, 움직임, 물리, 기억 모듈의 문제의식.
- [Atlas On a Roll — Boston Dynamics, Xiaoyu (Andy) Wu](https://bostondynamics.com/blog/atlas-on-a-roll/) — 2026-11 게시(본문에 날짜 표기 없음). 2026-11-19 바퀴 장착 방식, 학습 조정 항목, 모션캡처 선택 기준, sim-to-real 작업과 첫 시도 성공의 범위 대조.
- [보스턴다이내믹스의 바퀴 달린 아틀라스 영상 공개 — 안될공학](https://www.youtube.com/watch?v=vjDOT44-Fpw) — 2026-11-12 업로드, 음성 인식 전사문 기준. 학습 계기.
- [MimicGen: A Data Generation System for Scalable Robot Learning using Human Demonstrations — Mandlekar 외, arXiv](https://arxiv.org/abs/2310.17596) — 2026-11-14 초록의 시연 합성 규모 대조.
- [Introducing AWS Physical AI Toolchain — AWS Physical AI Blog](https://aws.amazon.com/blogs/physical-ai/introducing-aws-physical-ai-toolchain/) — 2026-10-07 게시. 구성 요소와 단계 대조.
- [sample-the-physical-ai-toolchain-on-aws — aws-samples, GitHub](https://github.com/aws-samples/sample-the-physical-ai-toolchain-on-aws) — 2026-11-14 README의 구성 요소와 상태 표기, `isaac-lab-arena-on-aws` README 앞부분의 다섯 단계, 승인 상태와 임계값 설명 대조.
- [Isaac Lab on AWS: From Simulation to Registered Policy — AWS Physical AI Blog](https://aws.amazon.com/blogs/physical-ai/isaac-lab-on-aws-from-simulation-to-registered-policy/) — 2026-10-02 게시. MLflow 레지스트리 자동 등록과 별칭 승격 대조. 본문 후반은 열람이 끊겨 확인하지 못했다.
- [Amazon SageMaker AI, Model Registry](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html) — 2026-11-14 모델 그룹과 CI/CD 연계 대조.
- [Amazon SageMaker AI, Model Groups and Versions](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-models.html) — 2026-11-14 버전 번호 규칙 대조.
- [Amazon SageMaker AI, Update the Approval Status of a Model](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-approve.html) — 2026-11-14 프로젝트 템플릿의 승인 상태 전이와 배포 동작 대조.
- [GenerAIly Speaking: Let's train some humanoids — Amazon Web Services](https://www.youtube.com/watch?v=ljUjsyPhVOE) — 2026-11-02 게시 발표. 파이프라인 흐름의 계기.
- [Exclusive: OpenAI disbands its stand-alone robotics team as its general models start running robots — Fortune](https://fortune.com/2026/11/13/openai-disbands-robotics-team-as-its-general-models-start-running-robots/) — 2026-11-13. 2026-11-16 회사가 확인한 개편 내용과 이유, 제어 구성 설명, Nvidia 연구 수치와 연구자 반론 대조. 출처가 밝혀지지 않은 손실 보도와 일정 목표는 옮기지 않았다.
- [OpenAI, 범용 모델이 로봇을 제어하기 시작하면서 로보틱스 팀 해체 — GeekNews](https://news.hada.io/topic?id=37180) — 학습 계기.

## 관련 문서

- [[Robotics|로보틱스 지도]]
- [[Physical-AI-and-Liquid-Control|피지컬 AI와 리퀴드 제어]]
- [[Tactile-Grasp-Control|촉각 기반 파지 제어]]
- [[Robot-Perception-Degradation-Safety|카메라 열화와 로봇의 위험 지시 거부]]
- [[World-Models|월드 모델]]
- [[Gemini-4-Argon#10월 일반 제공과 로봇 활용의 확인 범위|Gemini 4 Argon의 로봇 활용 조건]]
- [[Reinforcement-Learning-from-Experience|경험 기반 강화학습]]
- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]
