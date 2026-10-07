---
tags: [aws, eks, kubernetes, hybrid, networking, cni]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["EKS Hybrid Nodes", "EKS 하이브리드 노드"]
---

# EKS Hybrid Nodes의 연결과 운영 경계

EKS Hybrid Nodes는 AWS 리전의 Kubernetes control plane에 온프레미스 노드를 연결하는 구성이다. Control plane까지 외부와 단절된 에어갭 내부에 두는 구조와 다르다. 사설 연결로 운영하더라도 AWS와의 통신 의존성은 남는다.

## 먼저 네트워크 경로를 확인한다

AWS Site-to-Site VPN, Direct Connect 또는 자체 VPN으로 온프레미스와 VPC의 연결을 준비한다. 네트워크 연결 성공은 IAM 권한이나 Kubernetes RBAC 허용을 의미하지 않는다.

| 구분 | 확인할 것 |
|---|---|
| 주소 | VPC, remote node, remote pod, Kubernetes Service CIDR가 서로 겹치지 않는지 |
| 라우팅 | 노드와 Pod 대역의 VPC 경로, 온프레미스 경로와 반환 경로 |
| 방화벽 | 노드에서 API 서버로 TCP 443, control plane에서 kubelet으로 TCP 10250, 필요한 DNS와 webhook 경로 |
| 설치와 운영 | 패키지와 이미지 다운로드 경로, 선택한 자격 증명 공급자의 갱신 endpoint |

Pod CIDR에 직접 도달할 수 있는지도 따로 확인한다. 노드만 연결된 상태로는 control plane에서 Pod의 webhook으로 요청할 수 있다고 단정할 수 없다. Pod 대역을 라우팅할 수 없다면 webhook을 cloud node에 배치하는 방안을 검토한다.

## CNI는 노드 유형과 지원 범위에 맞춘다

Amazon VPC CNI는 hybrid node와 호환되지 않는다. 2026-10-07 공식 CNI 안내는 AWS가 유지하는 Cilium 빌드를 지원 대상으로 설명하며, 지원 버전과 기능 범위를 별도로 제시한다. 과거 발표의 특정 Cilium 버전을 현재 설치 기준으로 복사하지 않는다. Calico 안내는 EKS Hybrid Examples 저장소로 이동했으므로 사용 가능성과 AWS의 지원 범위를 구분한다.

같은 클러스터라도 노드 유형에 따라 지원 경계가 다르다. AWS는 AWS Cloud 노드에서 실행하는 Cilium을 지원하지 않는다고 명시한다. Hybrid node용 지원을 cloud node까지 확대해서 해석하지 않는다.

Hybrid node에서도 AWS 지원은 AWS가 유지하는 빌드와 지원 버전, 문서에 열거한 기능의 기본 설정을 전제로 한다. 같은 이름의 upstream Cilium을 설치했다는 사실만으로 같은 지원 범위가 적용되지는 않는다. [CNI 지원 조건](https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-cni.html)

CNI를 설치하지 않은 hybrid node가 등록 후 `Not Ready`로 보이는 것은 예상되는 상태다. 반대로 `Ready`였던 노드가 불건전해졌다면 자원 부족, 디스크와 control plane 연결 등도 함께 확인한다. CNI 오류 하나로 원인을 고정하지 않는다.

## 진단을 등록 전후로 나눈다

아래는 공식 troubleshooting 문서를 적용한 확인 순서다.

1. **노드가 보이지 않음:** `kubelet` 상태와 로그, 네트워크와 보안 그룹, hybrid node IAM 역할의 Kubernetes 접근 매핑을 확인한다.
2. **등록됐지만 준비되지 않음:** CNI Pod 상태와 로그, remote network 설정과 실제 경로를 대조한다.
3. **준비됐지만 요청 실패:** Pod와 Service 경로, DNS, webhook 및 애플리케이션 의존성을 확인한다.

`nodeadm debug`로 네트워크와 자격 증명 요구사항을 점검할 수 있다. 오류가 난다는 이유만으로 포괄적인 IAM 권한을 추가하기보다 실패한 요청과 필요한 권한을 연결해 좁힌다.

## 연결 단절과 복구를 실제로 시험한다

AWS는 단절 중 동작이 애플리케이션의 의존성, 설정과 환경에 따라 달라질 수 있으므로 직접 검증하도록 안내한다. 이미 떠 있는 컨테이너가 계속 실행된다는 관측과 배포, 재스케줄링, 자격 증명 갱신까지 정상이라는 주장을 구분한다.

다음은 단절 시험의 설계 예다.

- AWS와의 연결을 끊었을 때 기존 요청, 새 요청, DNS와 외부 저장소 호출이 각각 어떻게 동작하는지 기록한다.
- 클라우드 의존 기능이 실패할 때 제한할 동작과 허용할 로컬 동작을 정한다.
- 연결 복구 뒤 중복 처리, 누락, 재시도와 준비 상태를 확인한다. 단절 전 정상 동작만으로 복구를 보장하지 않는다.

## 이해 확인

- 노드에서 API 서버로 연결되는데 webhook이 실패할 수 있는 이유는 무엇인가?
- `Not Ready`가 최초 등록 때인지 정상 운영 뒤인지에 따라 무엇부터 확인하는가?
- AWS 연결이 끊겨도 유지해야 할 기능과 멈춰야 할 기능을 구분했는가?

## 출처

- [Amazon EKS, Prepare networking for hybrid nodes](https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-networking.html)
- [Amazon EKS, Configure CNI for hybrid nodes](https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-cni.html)
- [Amazon EKS, Troubleshooting hybrid nodes](https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-troubleshooting.html)
- [Amazon EKS, EKS Hybrid Nodes and network disconnections](https://docs.aws.amazon.com/eks/latest/best-practices/hybrid-nodes-network-disconnections.html)

## 관련 문서

- [[EKS|Amazon EKS]]
- [[Network-Separation|망분리와 에어갭]]
- [[K8s-NetworkPolicy|Kubernetes NetworkPolicy]]
- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
