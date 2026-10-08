---
tags: [infrastructure, aws, quantum-computing, braket, optimization]
status: done
verified_at: 2026-10-09
category: "Infrastructure - AWS"
aliases: ["Amazon Braket", "브라켓", "양자 고전 하이브리드 계산"]
---

# Amazon Braket과 양자 계산의 비교 기준

Amazon Braket은 양자 알고리즘을 설계하고 시뮬레이터와 실제 양자 처리 장치(QPU)에서 시험하는 관리형 서비스다. 하드웨어 접근을 제공한다는 사실과 특정 업무에서 고전 알고리즘보다 유리하다는 결론은 별개다.

## 세 가지 실행 경로

| 경로 | 하는 일 | 결과를 해석할 때의 경계 |
| --- | --- | --- |
| 고전 솔버 | CPU 등으로 원래 최적화 문제를 푼다 | 양자 접근과 비교할 품질과 시간의 기준선이다 |
| 양자 회로 시뮬레이터 | 고전 계산 자원으로 회로 동작을 모사한다 | 시뮬레이션 성공만으로 실제 QPU 성능을 증명하지 않는다 |
| 실제 QPU | 선택한 장치에서 양자 작업을 실행한다 | 장치 특성과 노이즈, 문제를 장치에 맞추는 비용을 고려한다 |

변분 양자 알고리즘은 고전 최적화기가 회로 파라미터를 정하고, 양자 계산 결과를 받아 다시 조정하는 반복 구조다. 전체 애플리케이션을 QPU로 옮기는 방식으로 이해하지 않는다.

## 장치의 실행 모델부터 맞춘다

Braket의 기본 제출 단위는 quantum task다. 게이트 기반 장치에는 회로, 측정 지시와 shots 수를 전달한다. 아날로그 해밀토니안 시뮬레이션(AHS)은 같은 회로를 그대로 받는 방식이 아니라 원자의 배치와 제어장의 시간, 공간 의존성을 기술한다.

따라서 여러 QPU를 한 서비스에서 선택할 수 있다는 사실을 동일 프로그램의 무수정 이식성으로 해석하지 않는다. 먼저 알고리즘의 표현이 장치의 실행 모델과 맞는지 확인하고 지원 연산과 제약을 대조한다. 시뮬레이터에서 검증한 표현과 실제 장치에 제출할 표현도 구분한다.

## Hybrid Jobs가 맡는 범위

Hybrid Jobs는 알고리즘을 실행할 고전 계산 환경을 만들고, 작업이 끝나면 자원을 해제한다. 대상은 QPU, 원격 시뮬레이터 또는 작업 컨테이너 안의 시뮬레이터가 될 수 있다. 결과는 S3에 저장하며 사용자 정의 지표는 CloudWatch에서 추적할 수 있다.

- QPU를 쓰는 작업에는 대기열이 있다. 실행 중인 hybrid job이 몇 분마다 QPU에 양자 작업을 제출하는 조건에서 우선 접근을 받지만, 대기 시간이 없다는 뜻은 아니다.
- 작업은 주 장치와 같은 AWS 리전에서 실행된다. 장치와 리전의 현재 지원 범위는 실행 전에 확인한다.
- GPU 인스턴스를 골라도 CPU용 시뮬레이터를 실행하면 GPU를 사용하지 않는다. 인스턴스 선택과 시뮬레이터의 실행 자원을 함께 맞춘다.

이 기능은 반복 실행 환경을 관리한다. 고전 기준선보다 높은 품질이나 낮은 총비용을 보장하는 기능은 아니다.

## 최적화 문제에서는 표현 변환 비용도 비교한다

QUBO(Quadratic Unconstrained Binary Optimization)는 이진 변수의 이차 목적함수로 문제를 표현한다. 원래의 제약을 벌점 항으로 옮기거나 순서를 이진 변수로 펼치면 표현이 커질 수 있다. 예를 들어 도시와 방문 순서를 각각 표시하는 여행 경로 표현은 도시 수가 `n`일 때 `n²`개의 이진 변수를 쓴다. 이 증가를 실제 장치에 넣는 비용까지 고려해야 한다.

2023년 공개된 BMW 로봇 경로 연구에서는 고전 RKO(Random Key Optimizer) 계열과 QUBO 기반 솔버를 비교했다. 해당 문제와 하드웨어에서는 QUBO 변환과 장치 매핑의 부담 때문에 산업 규모 문제를 처리하기 어려웠고, 고전 RKO가 더 유리했다. 양자 방식의 보편적 열세나 현재 모든 장치의 성능으로 일반화하지 않는다. 과거 연구의 D-Wave 사용 기록도 Braket의 현재 장치 지원 목록으로 옮기지 않는다.

### 실험을 설계할 때의 판단 기준

다음은 위 실행 구조와 비교 사례에서 도출한 실무 점검 기준이다.

1. 같은 입력과 제약에서 고전 기준선의 해 품질과 실행 시간을 먼저 기록한다.
2. 원래 변수 수와 변환 후 변수 수, 제약 위반 여부를 구분한다.
3. QPU 실행 시간뿐 아니라 변환, 대기, 반복 호출과 후처리를 포함한 총시간을 비교한다.
4. 작은 예제에서 성공한 뒤 실제 규모에서도 목표 품질과 비용을 만족하는지 확인한다.

양자 실험으로 얻은 학습과 실제 운영에서의 성능 이득을 별도로 보고한다. 이 문서는 공식 문서와 공개 연구의 대조이며 QPU 실측 결과가 아니다.

## 출처

- [AWS, How Amazon Braket works](https://docs.aws.amazon.com/braket/latest/developerguide/braket-how-it-works.html)
- [AWS, What is Amazon Braket?](https://docs.aws.amazon.com/braket/latest/developerguide/what-is-braket.html)
- [AWS, Working with Amazon Braket Hybrid Jobs](https://docs.aws.amazon.com/braket/latest/developerguide/braket-jobs.html)
- [Optimization of robot trajectory planning with nature-inspired and hybrid quantum algorithms — AWS Quantum Technologies Blog](https://aws.amazon.com/blogs/quantum-computing/optimization-of-robot-trajectory-planning-with-nature-inspired-and-hybrid-quantum-algorithms/)

## 관련 문서

- [[EC2|EC2]] — 고전 계산 환경
- [[CloudWatch|CloudWatch]] — 알고리즘 지표 관측
- [[compute|AWS 컴퓨팅 서비스]] — 서비스별 실행 모델
