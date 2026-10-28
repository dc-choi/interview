---
tags: [aws, sagemaker, hyperpod, eks, inference, autoscaling]
status: done
verified_at: 2026-10-29
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["SageMaker HyperPod Inference", "HyperPod 추론 운영"]
---

# SageMaker HyperPod 추론 운영

SageMaker HyperPod의 EKS 기반 추론은 학습과 추론에 같은 클러스터의 연산 자원을 사용할 수 있게 한다. 모델 배포, 추론 Pod 확장, 팀 사이의 자원 배분과 노드 증설은 서로 다른 제어이므로 각각의 상태를 확인한다.

## 모델 배포와 요청 처리

HyperPod는 JumpStart 모델과 S3, FSx의 사용자 모델을 배포 대상으로 지원한다. kubectl, Python SDK, Studio UI와 HyperPod CLI 등의 인터페이스를 제공한다. 구체적인 모델, 컨테이너와 인스턴스의 호환성은 선택한 배포 구성에서 확인한다.

운영 점검 제안: 배포 요청 접수, Pod 기동, 모델 적재, endpoint를 통한 실제 응답을 각각 확인한다. Kubernetes 리소스가 생성됐다는 사실만으로 모델이 요청을 처리할 준비가 됐다고 판단하지 않는다. 테스트에는 응답 성공뿐 아니라 입력 형식, 출력 길이, 오류와 첫 토큰 지연을 포함한다.

## 확장을 세 층으로 구분한다

| 제어 | 결정하는 것 | 별도로 확인할 것 |
|---|---|---|
| 추론 Pod autoscaling | 지표에 맞춘 모델 replica 수 | 지표 조회 권한, min/max replica와 모델 준비 시간 |
| Task governance | 팀별 할당량, 유휴 자원 대여와 작업 우선순위 | 빌린 자원의 회수, 선점 정책과 학습 중단 영향 |
| 관리형 Karpenter | Pending Pod에 필요한 노드 공급 | 클러스터 전제조건, NodeClass/NodePool과 실제 자원 공급 |

추론 operator의 `autoScalingSpec`은 CloudWatch와 Amazon Managed Service for Prometheus 지표를 사용할 수 있다. 별도의 KEDA `ScaledObject`로 정책을 구성하는 경로도 있다. 지표를 읽는 역할에 조회 권한이 있어야 하며, replica 상한을 높이는 것과 GPU 용량이 확보되는 것은 다르다.

관리형 Karpenter는 Pending Pod를 관찰해 필요한 노드를 공급한다. 사용 전 continuous provisioning과 자동 node recovery 등 공식 전제조건을 확인한다. Pod 확장 뒤에도 자원이 부족하면 노드 공급과 모델 초기화가 끝날 때까지 실제 처리량이 늘지 않을 수 있다(제어 흐름에 따른 운영상 추론).

## 자원 대여와 학습 복구

Task governance는 팀별 compute quota, 유휴 자원 대여와 차용, 작업 우선순위 및 팀 내부 선점 정책을 구분한다. 빌려 쓴 자원은 전용 용량이 아니다. 기본적으로 자원을 빌려준 팀은 다른 팀의 작업을 선점할 수 있으므로, 추론팀이 자원을 다시 필요로 할 때 학습 작업이 중단될 수 있다.

학습 재개는 자원이 돌아오는 것만으로 보장되지 않는다. Elastic training의 사용자 PyTorch 코드에는 확장 이벤트 감지와 checkpoint 저장 및 복원이 필요하다. 해당 기능의 지원 조건을 충족한 구성에서만 재시작과 world size 변경을 기대한다. 일반 학습 코드에 자동 무손실 재개가 붙는다고 가정하지 않는다.

검증 제안: 추론 부하를 올려 replica 증가와 학습 작업의 중단을 관찰한 뒤, 부하를 줄여 학습이 저장한 checkpoint에서 재개되는지 확인한다. 마지막 저장 이후 재계산량, 중단 시간과 추론 지연을 함께 측정한다. GPU 사용률이 높다는 사실만으로 두 작업의 목표가 모두 충족됐다고 보지 않는다.

## 운영 판단

- 추론의 최소 처리 용량과 학습에 허용할 중단 범위를 먼저 정한다.
- 서비스 지표와 GPU 사용률을 나눠 본다. 첫 토큰 지연, 전체 응답 지연과 오류는 자원 사용률만으로 설명되지 않는다.
- replica가 줄어든 것과 추가 노드가 정리된 것을 각각 확인한다.
- 발표의 replica 수와 요청 임계값은 예시다. 자체 모델 크기와 요청 길이로 부하를 재현해 값을 정한다.

이 문서는 2026-10-29 공식 문서 대조 범위다. 실제 클러스터 배포, 선점과 부하 시험은 수행하지 않았다.

## 출처

- [AWS, Deploying models on Amazon SageMaker HyperPod](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-model-deployment.html)
- [AWS, Autoscaling policies for your HyperPod inference model deployment](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-model-deployment-autoscaling.html)
- [AWS, SageMaker HyperPod task governance policies](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-operate-console-ui-governance-policies.html)
- [AWS, Autoscaling on SageMaker HyperPod EKS](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-eks-autoscaling.html)
- [AWS, Using elastic training in Amazon SageMaker HyperPod](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-eks-elastic-training.html)
- [Run AI Models Inference on Amazon SageMaker HyperPod EKS — Amazon Web Services](https://www.youtube.com/watch?v=2YGjaYif8Cw) — 공개 시연의 확장, 선점과 노드 증설을 위 공식 문서로 대조

## 관련 문서

- [[EKS|EKS 운영]]
- [[K8s-GPU-Sharing-and-Quota|GPU 공유와 팀별 할당]]
- [[Model-Feedback-Loop-and-Validation|모델 피드백 루프와 검증]]
