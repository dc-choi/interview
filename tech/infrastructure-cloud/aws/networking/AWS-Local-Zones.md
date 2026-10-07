---
tags: [infrastructure, aws, local-zones, networking, latency]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS Local Zones", "AWS 로컬 존"]
---

# AWS Local Zones

Local Zone은 사용자 가까이에 컴퓨팅과 일부 AWS 서비스를 배치하는 리전의 확장이다. 해당 Zone을 활성화하고 VPC의 서브넷을 만든 뒤 지원 리소스를 배치한다. 모든 서비스를 갖춘 독립 리전으로 취급하지 않는다.

## 지리적 거리와 실제 경로

가까운 위치에 서버를 두는 것과 요청이 그 위치로 직접 가는 것은 별개다.

| 연결 경로 | 공식 문서의 동작 |
|---|---|
| 인터넷으로 나가는 트래픽 | Local Zone의 인터넷 연결로 나감 |
| 온프레미스에서 Transit Gateway 경유 | 부모 리전을 거쳐 Local Zone으로 돌아오는 hairpin 발생 |
| Direct Connect로 Local Zone 서브넷 접근 | 부모 리전을 경유하지 않는 최단 경로 사용 |

Local Zone 서브넷에도 route table, security group과 network ACL을 적용한다. VPC endpoint를 Local Zone 서브넷 내부에 만들 수는 없으므로, 비공개 서비스 접근이 필요한 경로는 별도로 설계한다.

## 추론 워크로드의 배치 판단

다음은 지연을 평가하기 위한 설계 제안이다.

1. 단말 전처리, 네트워크 왕복, 서버 대기, 추론과 후처리 시간을 나누어 측정한다.
2. 지연에 민감한 처리만 Local Zone에 배치할지 검토한다. 부모 리전의 DB나 모델 API를 매 요청마다 호출하면 그 왕복도 포함한다.
3. 대상 Zone의 서비스와 인스턴스 지원을 확인한다. GPU 인스턴스가 모든 Zone에 있다는 전제로 설계하지 않는다.
4. 실제 사용자 위치에서 부모 리전과 Local Zone을 비교하고, 평균과 p95/p99 및 장애 시 대체 경로를 시험한다.

네트워크 지연의 개선을 LLM 응답 전체의 완료 시간으로 바꾸어 말하지 않는다. 특정 데모의 응답 시간을 다른 모델, 입력 길이와 동시 요청 수에 대한 보장으로 사용하지 않는다.

## 출처

- [AWS, How AWS Local Zones work](https://docs.aws.amazon.com/local-zones/latest/ug/how-local-zones-work.html)
- [AWS, AWS Local Zones features](https://aws.amazon.com/about-aws/global-infrastructure/localzones/features/)
- [Get Started Deploying Low Latency Applications with AWS Local Zones — AWS](https://aws.amazon.com/about-aws/global-infrastructure/localzones/getting-started/)

## 관련 문서

- [[VPC|VPC 구성과 연결]]
- [[Transit-Gateway|Transit Gateway]]
- [[EC2-Compute|EC2 컴퓨팅]]
