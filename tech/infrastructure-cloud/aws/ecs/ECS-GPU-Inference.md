---
tags: [aws, ecs, gpu, inference, containers]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["ECS GPU 추론", "ECS GPU Inference"]
---

# ECS에서 GPU 추론 워크로드 운영하기

웹 API와 모델 추론의 자원 요구가 다르면 별도 ECS 서비스로 구성할 수 있다. API의 요청량과 모델의 처리 시간이 다르므로 배포, 용량과 준비 완료 조건도 따로 판단한다. 모든 작은 모델을 처음부터 별도 서비스로 분리해야 한다는 뜻은 아니다.

## GPU 배치 전제

- Fargate는 GPU 태스크를 지원하지 않는다. GPU가 필요한 추론은 GPU를 지원하는 ECS 컨테이너 인스턴스에 배치한다.
- ECS의 GPU 최적화 AMI에는 NVIDIA 드라이버와 Docker GPU runtime이 준비되어 있다. 지원 인스턴스와 AMI 호환성은 배포 시 확인한다.
- 컨테이너 정의의 `resourceRequirements`에서 `type: GPU`와 필요한 수량을 지정한다. 예를 들어 `value: "1"`은 전체 GPU 한 개를 요청한다.
- GPU 요구를 지정하지 않으면 기본 Docker runtime을 사용한다. GPU 인스턴스가 있다는 사실만으로 컨테이너가 필요한 GPU runtime과 할당을 받는다고 가정하지 않는다.

### 전체 GPU와 분할 GPU

2026-10-07 문서 기준 G6f의 fractional GPU scheduling은 ECS on EC2와 ECS Managed Instances에서 사용할 수 있다. `0.125`, `0.25`, `0.5` 요청은 대응하는 하드웨어 분할 용량에 배치되며, 정수 요청은 전체 GPU에 배치된다.

한 task에서 fractional GPU를 요청하는 컨테이너는 하나만 허용된다. 다른 컨테이너가 추가 GPU 요구를 지정할 수 없다. Fargate와 ECS Anywhere는 이 fractional scheduling을 지원하지 않는다. 임의의 GPU를 소프트웨어 설정만으로 같은 방식으로 나눌 수 있다는 뜻은 아니다.

## 동기와 비동기 요청 선택

짧은 응답 시간이 필요한 요청은 동기 추론을 검토한다. 처리 시간이 길거나 순간적인 부하를 큐로 흡수해야 한다면 작업 식별자를 반환하고 나중에 결과를 조회하는 비동기 처리를 검토한다.

비동기 설계에서도 중복 처리, 실패 재시도와 결과 저장을 별도로 정의한다. ECS가 업무 결과의 멱등성까지 제공하는 것은 아니다. 큐를 사용하는 경우 [[ECS-Service-AutoScaling|backlog-per-task]]와 실제 처리 시간을 함께 살핀다.

## 용량 검증

다음은 추론 운영의 점검 제안이다.

1. 프로세스 시작 뒤 모델 로딩과 첫 추론이 끝나기까지의 시간을 측정한다. task의 running 상태만으로 서비스 준비를 판단하지 않는다.
2. GPU 메모리, 추론 지연, 큐 대기 시간과 오류를 함께 본다. CPU 사용률 하나로 GPU 용량을 판정하지 않는다.
3. 서비스의 task 증가와 GPU 인스턴스 용량 확보를 나누어 확인한다. task 수를 늘려도 배치할 GPU가 부족하면 처리가 늘지 않는다.
4. API와 모델을 분리한 이익을 추가 통신, 배포와 장애 대응 비용과 비교한다.

## 출처

- [Amazon ECS, Amazon ECS task definitions for GPU workloads](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-gpu.html)
- [Amazon ECS, Specifying GPUs in an Amazon ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-gpu-specifying.html)
- [Amazon ECS, Amazon ECS task definition differences for Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html)
- [Zero to Hero: 클릭 몇 번으로 완성하는 AI/ML on Amazon ECS — Amazon Web Services Korea](https://www.youtube.com/watch?v=hTddFXu_G5E)

## 관련 문서

- [[ECS|ECS 핵심 구성]]
- [[ECS-Service-AutoScaling|서비스 오토스케일링]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
