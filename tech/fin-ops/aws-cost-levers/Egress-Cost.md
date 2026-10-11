---
tags: [finops, aws, data-transfer, egress, nat-gateway, vpc-endpoint, cost, kubernetes, cross-az]
status: done
category: "비용&운영(FinOps)"
aliases: ["Egress Cost", "Egress cost 관리", "데이터 전송 비용", "data transfer cost", "NAT Gateway 비용", "Topology Aware Routing"]
verified_at: 2026-10-11
---

# 데이터 전송 비용 (Egress / Data Transfer)

클라우드 청구서의 **숨은 폭탄**. 인스턴스/스토리지는 눈에 보이지만 데이터 전송은 추적이 어려워 방치되기 쉽다. 원칙은 단순하다 — **인터넷에서 들어오는 것(ingress)은 과금 없음, 나가는 것(egress)과 경계를 넘는 것이 돈**이다. [[AWS-Cost-Optimization]]의 데이터 전송 절을 심화한다.

## 어디서 돈이 새나

단가는 리전, 서비스, 누적 사용량에 따라 달라진다. 아래는 과금 구조 위주로 정리했고, 금액을 적은 항목은 **US East (Ohio) 기준, 2026-08-05 공식 요금 페이지 확인값**이다. 실제 견적은 대상 리전 요금표로 다시 계산한다.

| 구간 | 과금 구조 | 비고 |
|---|---|---|
| Internet **ingress** | 과금 없음 | 인터넷에서 AWS로 들어오는 전송 |
| Internet **egress** | 리전별 계층 요금, 월 100GB는 전 서비스, 전 리전 합산으로 무료(중국, GovCloud 제외) | 누적 사용량이 늘수록 계층 단가 하락 |
| **Cross-AZ** | 같은 리전 AZ 간 전송은 인바운드와 아웃바운드가 **각각 계량**됨 | 한 번의 전송이 두 줄로 청구 |
| **Cross-Region** | **소스 리전의 아웃바운드에만** 과금, 목적지 리전 인바운드는 무과금 | 소스와 목적지 리전 조합으로 단가 결정 |
| **NAT Gateway** | 시간당 $0.045 + 처리 GB당 $0.045 | 프라이빗 → 외부 |
| **Gateway Endpoint**(S3, DynamoDB) | 시간 요금과 데이터 처리 요금 없음 | NAT 우회 |
| **Interface Endpoint**(PrivateLink) | AZ별 엔드포인트 ENI 시간당 $0.01 + 처리 GB당 $0.01(첫 1PB) | 엔드포인트 수만큼 시간 요금 누적 |
| **S3 → CloudFront** | CloudFront로 서빙하는 트래픽은 AWS 오리진 전송 요금이 면제됨 | 같은 생태계 |

핵심 직관: **인터넷 아웃바운드가 가장 비싸다.** 다만 그 아래에서 cross-AZ와 cross-region의 상하는 고정이 아니다. cross-AZ는 인바운드와 아웃바운드가 각각 계량돼 왕복분이 청구되는 반면 cross-region은 소스 리전 아웃바운드만 청구되므로, 단가가 낮은 인접 리전 조합(예: us-east-1과 us-east-2)에서는 리전 간 전송이 cross-AZ보다 쌀 수 있다. 어느 경계를 넘는지에 더해 리전 조합까지 봐야 비용이 결정된다.

## 절감 레버

- **VPC Endpoint**: S3와 DynamoDB의 **Gateway Endpoint는 시간 요금과 데이터 처리 요금이 없어** NAT 우회에 유리하다. 그 외 AWS 서비스용 Interface Endpoint는 AZ별 시간 요금과 데이터 처리 요금이 붙어 엔드포인트 수와 트래픽량에 따라 NAT Gateway보다 비쌀 수도 있으므로 비교 계산한다. [[VPC]]
- **내부 통신은 Private IP/DNS**: 같은 VPC 안에서 Public 엔드포인트로 접근하면 불필요한 NAT/인터넷 경유 발생.
- **CDN 전진 배치**: 사용자 트래픽을 Edge가 흡수해 Origin egress 감소. S3에서 CloudFront로 나가는 오리진 전송은 요금이 면제된다. [[CDN]], [[CloudFront]]
- **AZ 인식 배치**: 통신 잦은 컴포넌트를 같은 AZ에 둬 cross-AZ 최소화(단, 가용성과 균형).
- **압축/배치 전송**: 외부로 나가는 데이터는 압축, 잦은 소량보다 묶어서.
- **리전 통합**: cross-region 복제가 정말 필요한지 재검토(DR 요구와 균형). [[DR-Strategy]]

## NAT Gateway가 특히 위험

프라이빗 서브넷의 외부 통신이 전부 NAT를 거치면 **처리량 요금이 누적**된다. S3와 DynamoDB는 시간 요금과 데이터 처리 요금이 없는 Gateway Endpoint로 빼면 그만큼 NAT 처리 요금이 그대로 줄어든다.

반면 ECR은 Gateway Endpoint가 없고 유료 Interface Endpoint(`ecr.api`, `ecr.dkr`)를 써야 한다. AZ별 시간 요금과 데이터 처리 요금이 붙으므로 우회할 NAT 처리량과 비교 계산해 이득일 때만 옮긴다(이미지 레이어는 S3에서 내려오므로 S3 Gateway Endpoint를 함께 둔다).

## Kubernetes에서 같은 영역 호출을 우선한다

2026-10-11 Kubernetes, Istio와 Amazon EKS Best Practices Guide 대조 기준. 여러 AZ에 노드를 둔 클러스터에서 Service 트래픽은 기본적으로 다른 AZ의 endpoint로도 분산된다. 호출이 잦은 서비스 사이에서는 이 분산이 cross-AZ 전송 요금과 지연을 만든다.

| 수단 | 동작 | 주의 |
|---|---|---|
| Topology Aware Routing | Service에 `service.kubernetes.io/topology-mode: Auto`를 붙이면 EndpointSlice 컨트롤러가 AZ별 allocatable CPU에 비례해 endpoint에 hint를 넣고, kube-proxy는 자기 AZ용 hint가 붙은 endpoint로 보낸다(균형을 맞추려고 다른 AZ의 endpoint에 이 AZ의 hint를 붙이기도 한다). 1.27 이전 이름 `service.kubernetes.io/topology-aware-hints`는 deprecated 별칭이다 | endpoint가 AZ 수보다 적거나, 균형 배분이 어렵거나, 노드 하나라도 `topology.kubernetes.io/zone` 레이블이나 allocatable CPU 값이 없으면 hint를 넣지 않아 클러스터 전체로 분산된다. AZ마다 endpoint가 3개 미만이면 약 50% 확률로 그렇게 된다. Spot처럼 AZ별 용량이 흔들려도 hint가 할당되지 않을 수 있다 |
| `spec.trafficDistribution` | `PreferSameZone`은 같은 AZ에 endpoint가 있으면 그 AZ의 트래픽을 모두 그쪽으로 보낸다. 필드는 1.33, `PreferSameZone`과 `PreferSameNode` 값은 1.35에 GA가 됐고 `PreferClose`는 `PreferSameZone`의 deprecated 별칭이다 | 예측 가능한 대신 AZ별 과부하는 운영자가 막아야 한다. `topology-mode: Auto`가 함께 있으면 annotation이 우선하고, 해당 트래픽 유형의 `externalTrafficPolicy`나 `internalTrafficPolicy`가 `Local`이면 그 설정이 우선한다. 문서는 annotation이 향후 이 필드로 대체돼 deprecated될 수 있다고 적는다 |
| Istio locality load balancing | 사이드카 기반 라우팅에서는 기본 mesh 설정으로 locality load balancing이 켜져 있다. DestinationRule에 outlierDetection을 두면 `localityLbSetting`을 따로 쓰지 않아도 locality failover가 켜진다 | Istio 1.31 레퍼런스는 `failover`와 `failoverPriority`가 outlierDetection 없이는 효과가 없다고 적으므로 같은 locality 우선을 기대한다면 outlierDetection 구성을 함께 확인한다. ambient의 ztunnel 경로는 Service의 `spec.trafficDistribution` 필드나 `networking.istio.io/traffic-distribution` annotation(Service, ServiceEntry, Namespace)을 따르고 둘 다 있으면 필드가 우선한다. 아무것도 설정하지 않으면 locality 선호 없이 정상 endpoint 전체로 분산한다 |

- Topology Aware Routing은 유입 트래픽이 AZ별 노드 용량에 대략 비례한다고 가정하고, `trafficDistribution`은 같은 AZ에 endpoint가 부족하거나 유입이 AZ별로 고르지 않으면 endpoint가 과부하될 수 있다. 한 AZ에서 트래픽이 많이 들어오면 그 AZ에 배정된 endpoint만 부하를 받고, HPA가 이 쏠림을 감지하지 못하거나 여러 AZ를 묶은 단일 HPA가 다른 AZ에 Pod를 늘려 문제를 풀지 못할 수 있다. 완화책은 Pod Topology Spread Constraints와 AZ별 Deployment, HPA다.
- EKS는 Kubernetes의 alpha 기능을 지원하지 않는다(Karpenter처럼 따로 설치하는 컨트롤러 필드의 ALPHA 표시와는 별개다). 쓰려는 필드와 값이 클러스터 버전과 kube-proxy(또는 이를 대체하는 데이터플레인) 버전에서 지원되는지 먼저 확인한다. EKS 가이드는 `PreferSameNode`를 쓰려면 kube-proxy를 1.35 이상으로 올리라고 적는다.
- 사례로 2023년 AWS re:Invent의 국내 음식 배달 서비스 발표는 Kubecost로 서비스 트래픽 비용을 보고 불필요한 외부 호출을 내부 호출로 바꿨고, topology aware hints와 Istio locality 라우팅을 설정해 cross-AZ 트래픽을 줄이고 AZ 안에서 트래픽이 전달되도록 했다고 밝혔다. 같은 발표는 Istio ingress gateway Pod 수가 AZ별로 고르지 않아 특정 AZ로 트래픽이 몰리고 그 AZ 노드의 부하가 장애로 이어진 경험도 설명했다. 운영 제안: AZ 우선 라우팅을 켤 때는 진입 계층과 서비스 Pod의 AZ별 수를 AZ별 유입 비율에 맞추고, 그 비율이 유지되는지 지표로 확인한다.

## 흔한 함정

- 같은 VPC인데 Public DNS로 접근 → 불필요한 NAT/인터넷 경유
- S3 접근을 NAT로 → Gateway Endpoint는 시간 요금과 데이터 처리 요금이 없는데 NAT 처리 요금을 냄
- cross-AZ 트래픽을 인지 못 한 채 마이크로서비스 산개
- AZ 우선 라우팅을 켜고 진입 계층과 Pod의 AZ별 배치, 유입 비율을 확인하지 않아 한 AZ에 부하가 몰림
- CDN 없이 S3에서 직접 대량 다운로드 제공
- 데이터 전송 비용을 태그/모니터링 안 해 원인 미추적

## 면접 체크포인트

- 인터넷 ingress 과금 없음, egress와 경계 넘기 과금의 기본 구조
- 인터넷 아웃바운드가 가장 비싸고, cross-AZ와 cross-region의 상하는 리전 조합에 따라 뒤집힐 수 있다는 점
- VPC Endpoint(특히 시간 요금과 데이터 처리 요금이 없는 S3/DynamoDB Gateway)로 NAT 줄이기
- 내부 통신 Private IP, CDN 전진 배치의 효과
- NAT Gateway가 비용 누적의 핵심인 이유
- Kubernetes에서 cross-AZ 호출을 줄이는 수단(topology-mode, trafficDistribution, Istio locality)과 각각의 과부하 위험

## 출처

- [AWS — Overview of Data Transfer Costs](https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/)
- [AWS — VPC Endpoints (Gateway vs Interface)](https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html)
- [Amazon VPC pricing — NAT Gateway, Gateway Endpoint 요금](https://aws.amazon.com/vpc/pricing/)
- [AWS PrivateLink pricing — Interface Endpoint 시간, 데이터 처리 요금](https://aws.amazon.com/privatelink/pricing/)
- [Amazon EC2 On-Demand Pricing — Data Transfer(월 100GB 무료 한도)](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Amazon CloudFront pricing — AWS 오리진 전송 요금 면제](https://aws.amazon.com/cloudfront/pricing/)
- [AWS Data Exports — Understanding data transfer charges(리전 내, 리전 간, 인터넷 과금 구조)](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)
- [Kubernetes — Topology Aware Routing](https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/)
- [Kubernetes — Well-Known Labels, Annotations and Taints(topology-aware-hints 별칭)](https://kubernetes.io/docs/reference/labels-annotations-taints/)
- [Kubernetes — Virtual IPs and Service Proxies(trafficDistribution)](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes — Feature Gates(ServiceTrafficDistribution, PreferSameTrafficDistribution)](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Istio — Locality Load Balancing](https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/)
- [Istio — Destination Rule(LocalityLoadBalancerSetting)](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio — Traffic Distribution(ambient의 ztunnel)](https://istio.io/latest/docs/ambient/usage/traffic-distribution/)
- [Amazon EKS Best Practices Guide — Cost Optimization, Networking](https://docs.aws.amazon.com/eks/latest/best-practices/cost-opt-networking.html)
- [Amazon EKS — Understand the Kubernetes version lifecycle on EKS(alpha 기능 미지원)](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)
- [AWS re:Invent 2023 — Continuous resource tracking with Amazon EKS for cost optimization (GBL210)](https://www.youtube.com/watch?v=xIDx2QmIS9A)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 (데이터 전송 개요)]]
- [[VPC|VPC (Endpoint)]]
- [[CDN|CDN / CloudFront]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[DR-Strategy|DR 전략 (cross-region 균형)]]
- [[Istio-Traffic-Management-and-Resilience|Istio traffic management와 resilience (outlier detection)]]
- [[K8s-HPA-VPA|HPA와 VPA (replica 계산과 스케일 지표)]]
