---
tags: [aws, eks, kubernetes, networking, vpc-cni, alb]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["EKS Pod 네트워킹", "EKS Pod IP 고갈", "EKS custom networking", "ALB 대상 유형 instance와 ip"]
---

# EKS Pod 네트워킹 — Pod IP 용량, 주소 고갈 대응과 ALB 대상 유형

Amazon VPC CNI를 쓰는 EKS에서는 Pod가 VPC 주소를 직접 받는다. 그래서 노드에 올릴 수 있는 Pod 수와 서브넷의 남은 주소가 함께 용량 한계가 되고, 로드밸런서가 노드를 거칠지 Pod로 바로 갈지도 이 주소 모델 위에서 정해진다. 클러스터 전반은 [[EKS|EKS 개요]]를 본다.

## 노드당 Pod 수가 정해지는 방식

2026-10-14 EKS 사용자 가이드와 모범 사례 문서 기준이다.

- 기본 Secondary IP 모드에서 VPC CNI는 노드 서브넷의 주소를 ENI의 secondary IP로 확보해 Pod마다 하나씩 준다. 주소가 모자라면 ENI를 더 붙이며, 인스턴스 유형별 최대 ENI 수와 ENI당 주소 수가 한계다.
- 다른 설정이 없으면 AMI는 `(ENI 수 × (ENI당 IPv4 주소 수 − 1)) + 2`로 `maxPods`를 정한다. ENI마다 기본(primary) 주소 하나는 Pod에 쓰지 않고, `+2`는 Pod IP를 쓰지 않는 호스트 네트워크 Pod인 VPC CNI와 kube-proxy 몫이다. m5.large는 ENI 3개, ENI당 주소 10개라서 29다.
- 커스텀 AMI 없이 쓰는 managed node group은 vCPU 30개 미만이면 110, 초과하면 250을 상한으로 주입하며 이 값이 다른 설정보다 우선한다. EKS Auto Mode는 110과 `ENI 수 × (ENI당 주소 수 − 1)` 중 작은 값을 쓴다.
- 주소 수는 상한의 한 축일 뿐이다. 작은 인스턴스는 IP보다 CPU와 메모리가 먼저 찰 수 있으므로 실제 배치 가능한 Pod 수는 리소스 요청과 함께 계산한다.

## Pod IP가 모자랄 때의 선택지

| 부족한 것 | 선택지 | 먼저 확인할 것 |
|---|---|---|
| 노드의 ENI와 IP 슬롯 | Prefix delegation(`/28` 단위 할당) | 연속된 `/28` 공간과 max-pods. [[EKS|EKS 개요]]의 VPC CNI 절 |
| 서브넷이나 VPC 주 CIDR의 주소 | 보조 CIDR과 새 서브넷, 필요하면 custom networking | 보조 CIDR 연결 제한, 노드 교체 절차 |
| IPv4 주소 자체 | IPv6 클러스터 | Nitro 기반 또는 베어메탈 인스턴스, VPC CNI 1.10.1 이상 |
| 겹치는 CIDR와의 통신 | private NAT gateway 조합 | custom networking만으로는 겹침을 풀 수 없다 |

### 보조 CIDR과 100.64.0.0/10

- VPC에는 `/16`~`/28` 크기의 IPv4 CIDR을 추가로 연결할 수 있다. 기존 블록의 크기는 바꿀 수 없고, 연결 가능 여부는 기존 블록, 라우트와 할당량에 따라 달라진다([[VPC-Subnet-CIDR|VPC 서브넷과 CIDR 설계]]).
- 2026-10-14 VPC 문서의 연결 제한 표 기준으로, 주 CIDR이 RFC 1918 대역(10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)인 VPC에는 다른 RFC 1918 대역과 198.19.0.0/16을 붙일 수 없고 100.64.0.0/10 안의 블록은 붙일 수 있다.
- 100.64.0.0/10은 RFC 6598이 통신사업자의 CGN(carrier-grade NAT)용 공유 주소 공간으로 예약한 대역이다. EKS 모범 사례는 회사 네트워크에서 RFC 1918 대역보다 덜 쓰인다는 이유로 이 대역(예: 100.64.0.0/16)을 Pod용 보조 CIDR로 권한다. 회사나 연결된 네트워크가 이미 이 대역을 쓰는지 먼저 확인하고, 이미 쓰고 있으면 IPv6나 다른 CNI 같은 대안을 검토한다.

### Custom networking

- VPC CNI는 기본적으로 보조 ENI를 노드 기본 ENI와 같은 서브넷에 만들고 같은 보안 그룹을 붙인다. Custom networking은 AZ별 `ENIConfig`에 지정한 서브넷과 보안 그룹으로 보조 ENI를 만들어 Pod 주소를 그 서브넷, 예를 들어 보조 CIDR의 서브넷에서 받게 한다.
- 켜는 방법은 `aws-node`에 `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG=true`를 주는 것이다. AZ마다 보조 서브넷이 하나면 ENIConfig 이름을 AZ 이름으로 두고 `ENI_CONFIG_LABEL_DEF=topology.kubernetes.io/zone`으로 노드에 자동 매칭한다.
- 기본 ENI의 주소는 Pod에 쓰지 않는다. 호스트 네트워크 Pod는 기본 ENI 주소를 계속 쓰고, 기본 ENI가 SNAT와 노드 밖 경로를 맡는다. 그래서 노드당 Pod 수가 줄어 m5.large는 29에서 `(3 − 1) × (10 − 1) + 2 = 20`이 된다. Prefix delegation을 함께 쓰면 주소상 290까지 늘지만, AWS는 작은 인스턴스에는 max-pods 110을, 큰 인스턴스에는 250을 권한다.
- 기존 노드는 바뀌지 않는다. ENIConfig를 만든 뒤 새 노드를 띄우고 기존 노드를 cordon과 drain으로 비운다. 지정한 서브넷과 보안 그룹은 노드와 같은 VPC에 있어야 하고 IPv6 클러스터에서는 쓸 수 없다.
- 주소 고갈만이 목적이고 IPv6로 갈 수 있으면 AWS는 IPv6 클러스터를 먼저 권한다. Custom networking은 운영 부담을 더한다.
- Custom networking 없이도 새 서브넷을 클러스터에 추가하거나, 보조 CIDR 서브넷에 새 노드 그룹을 만들고 기존 노드를 비워 노드와 Pod를 함께 새 대역으로 옮길 수 있다. 이때 컨트롤 플레인은 기존 서브넷에 남는다.

### 비라우팅 대역 Pod의 외부 통신

- VPC CNI는 기본적으로 VPC에 연결된 CIDR 밖으로 가는 IPv4 트래픽의 출발지를 노드 기본 ENI의 기본 사설 주소로 바꾼다(SNAT). 그래서 100.64 대역 Pod가 VPC 밖으로 보내는 요청도 노드 주소로 나간다. 인터넷으로 나가려면 노드가 공용 주소와 인터넷 게이트웨이 경로를 가진 공용 서브넷에 있거나, NAT gateway 경로가 있는 사설 서브넷에 있어야 한다.
- AWS 모범 사례는 Pod를 비라우팅 CG-NAT 대역에 두고, 로드밸런서와 NAT gateway처럼 외부와 주고받는 구성 요소는 라우팅 가능한 RFC 1918 대역에 두는 구성을 제시한다. 외부에서 들어오는 요청은 이런 진입점을 거치게 설계한다(설계 판단).
- 노드 대신 NAT gateway에서 주소를 변환해 Pod 주소를 남기려면 `AWS_VPC_K8S_CNI_EXTERNALSNAT=true`를 쓴다. 이때 노드는 NAT gateway 경로가 있는 사설 서브넷에 있어야 한다.

## 로드밸런서 대상 유형: instance와 ip

2026-10-14 EKS 사용자 가이드와 AWS Load Balancer Controller 문서 기준이다.

| 항목 | instance(기본값) | ip |
|---|---|---|
| 등록되는 대상 | 노드 | Pod |
| 트래픽 경로 | ALB에서 Service의 NodePort를 거쳐 Pod로 프록시 | ALB에서 Pod로 직접 |
| Service 유형 | NodePort 또는 LoadBalancer 필요 | 상관없음 |
| 전제 | 없음 | 네트워크 플러그인이 ENI의 secondary IP를 Pod 주소로 쓰는 구조 |
| 반드시 이 유형이어야 하는 경우 | 없음 | Fargate나 EKS Hybrid Nodes의 Pod, IPv6 대상, ALB sticky session |

- 대상 유형은 Ingress의 `alb.ingress.kubernetes.io/target-type` 어노테이션으로 정한다. ip 유형은 Pod 주소가 ENI의 secondary IP라는 VPC CNI 구조에 기대므로 위의 Pod IP 용량 계획과 같이 본다.
- ip 대상에서 롤링 배포를 할 때 컨트롤러의 대상 등록이 Pod 교체를 따라가지 못하면 대상 그룹에 `Initial`이나 `Draining` 상태의 대상만 남는 순간이 생길 수 있다. Pod readiness gate는 새 Pod가 대상 그룹에서 `Healthy`가 될 때까지 기존 Pod 종료를 미룬다. 네임스페이스에 `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` 레이블을 붙인다. 설정은 Pod 생성 시점에만, 같은 네임스페이스에 Pod 레이블과 맞는 Service가 있고 그 Service를 참조하는 대상 그룹 바인딩이 있으며 대상 유형이 ip일 때 주입된다. 그래서 Ingress나 Service를 만들고 네임스페이스에 레이블을 붙인 뒤 Pod를 만든다. instance 대상에서는 백엔드가 노드라서 쓸 수 없다.

## 세션형 실시간 서버에 적용할 때

- 매치나 방처럼 시간대에 따라 세션 수가 크게 바뀌는 서버는 세션 수요에 맞춰 Pod 수를 늘리고 줄이는 운영과 맞는다. 서버 수가 고정된 월드형 서버도 시작, 종료와 패치 절차를 표준화하는 이점은 남는다(운영 판단).
- ALB를 거쳐 들어오는 사용자를 특정 Pod에 계속 붙여야 하면 ALB sticky session을 쓰며, 이는 ip 대상 유형에서만 동작한다. ALB를 거치지 않고 클라이언트가 게임 서버에 직접 접속하는 구조라면 이 제약은 해당하지 않는다. WebSocket처럼 오래 유지되는 연결의 배포 전환은 [[Blue-Green|Blue-Green 배포]]의 drain 주의점을 따른다.
- 진행 중인 매치를 끊지 않으려면 새 매치만 새 버전으로 보내고 기존 매치는 이전 버전에서 끝낸 뒤 옮기는 매치 경계 전환을 검토할 수 있다(설계 판단). 관리형 게임 서버 호스팅에서의 세션 보호는 [[GameLift-Servers|GameLift Servers]]를 본다.

### 사례: 퍼즐 게임 실시간 대전 서버

2020년 AWS 행사 발표 기준이며 현재 권장 구성이나 성과의 근거로 일반화하지 않는다.

- 점검 없이 배포하는 것을 목표로 실시간 대전 서버를 EKS에 올렸다. NGINX Ingress가 도메인별로 사용자가 접속할 노드 그룹을 정하는 방식으로 블루그린을 구성했다.
- 새 이미지를 green 그룹에 배포하고 새로 참여한 사용자는 green에서 매치를 잡는다. 기존 사용자는 blue에서 매치를 마친 뒤 green으로 옮기고, 문제가 생기면 접속 대상을 blue로 되돌린다. 사용자가 실시간 서버에 계속 접속해 있을 필요가 없는 게임 구조라서 이 전환이 쉬웠다고 설명했다.
- Pod가 추가되거나 제거될 때의 서버 간 연결은 CoreDNS 기반 서비스 디스커버리에 맡겼다. 실시간 서버는 CodePipeline으로 빌드한 이미지를 ECR에 올리고 직접 만든 배포 스크립트와 Helm으로 반영했다. Flux로 Git의 매니페스트 변경을 클러스터에 반영한 것은 실시간 서버 외의 비즈니스 로직 서버였다. 모니터링은 CloudWatch에서 시작해 Prometheus와 Grafana로 넓혔다.

## 흔한 실수

- 서브넷의 남은 주소만 보고 노드당 Pod 상한(`maxPods`, managed node group 상한)을 놓친다
- Custom networking을 켠 뒤 노드를 교체하지 않아 새 설정이 적용되지 않는다
- Custom networking으로 줄어든 노드당 Pod 수를 용량 계획에 반영하지 않는다
- RFC 1918 주 CIDR VPC에 198.19.0.0/16을 보조 CIDR로 붙이려 하거나, 이미 100.64.0.0/10을 쓰는 네트워크와 충돌시킨다
- Fargate Pod나 ALB sticky session이 필요한 서비스에 instance 대상 유형을 쓴다
- ip 대상에서 readiness gate 없이 롤링 배포해 대상 그룹에 정상 대상이 비는 순간을 만든다

## 체크포인트

- maxPods 공식의 `−1`과 `+2`가 무엇을 뜻하는가
- Custom networking이 주소 고갈은 풀지만 노드당 Pod 수를 줄이는 이유
- 보조 CIDR로 100.64.0.0/10은 되고 198.19.0.0/16은 RFC 1918 주 CIDR VPC에서 막히는 조건
- instance와 ip 대상 유형의 경로 차이와 ip가 필수인 경우

## 출처

- [Amazon EKS, Choose an optimal Amazon EC2 node instance type](https://docs.aws.amazon.com/eks/latest/userguide/choosing-instance-type.html)
- [Amazon EKS Best Practices, Amazon VPC CNI](https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html)
- [Amazon EKS, Deploy Pods in alternate subnets with custom networking](https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html)
- [Amazon EKS Best Practices, Custom Networking](https://docs.aws.amazon.com/eks/latest/best-practices/custom-networking.html)
- [Amazon EKS, Enable outbound internet access for Pods](https://docs.aws.amazon.com/eks/latest/userguide/external-snat.html)
- [Amazon VPC, VPC CIDR blocks](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html)
- [RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space](https://datatracker.ietf.org/doc/html/rfc6598)
- [Amazon EKS, Route application and HTTP traffic with Application Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html)
- [AWS Load Balancer Controller, Ingress annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/)
- [AWS Load Balancer Controller, Pod readiness gate](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/pod_readiness_gate/)
- [사례들로 알아보는 컨테이너, 언제 어떻게 쓰면 좋을까? — Amazon Web Services Korea](https://www.youtube.com/watch?v=mbM1FMV-FkM) — AWS Cloud Week 발표

## 관련 문서

- [[EKS|EKS 개요]]
- [[EKS-Windows|EKS Windows 노드]]
- [[EKS-Hybrid-Nodes|EKS Hybrid Nodes]]
- [[VPC-Subnet-CIDR|VPC 서브넷과 CIDR 설계]]
- [[ELB|ELB]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Kubernetes 트래픽 진입, Helm과 GitOps]]
- [[Blue-Green|Blue-Green 배포]]
- [[GameLift-Servers|GameLift Servers]]
- [[compute|AWS 컴퓨팅 서비스]]
