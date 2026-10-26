---
tags: [aws, eks, kubernetes, gitops, ack, kro]
status: done
verified_at: 2026-10-26
category: "Infrastructure - AWS"
aliases: ["EKS Capabilities", "EKS 관리형 플랫폼 기능"]
---

# EKS Capabilities

EKS Capabilities는 배포와 리소스 관리에 쓰는 플랫폼 기능을 AWS가 운영하는 서비스다. 컨트롤러를 사용자의 워커 노드에 설치하고 유지하는 부담을 줄인다. 애플리케이션의 권한, 배포 정책과 정상 동작까지 대신 설계해 주는 것은 아니다.

## 세 기능의 역할

| 기능 | 관리 대상 | 구분할 점 |
|---|---|---|
| Argo CD | Git에 선언한 애플리케이션과 Kubernetes 리소스 | 배포 상태를 원하는 상태와 맞추는 GitOps 계층 |
| ACK (AWS Controllers for Kubernetes) | Kubernetes custom resource로 표현한 AWS 리소스 | S3나 RDS 같은 AWS 자원을 생성하고 상태를 조정하는 계층 |
| kro (Kube Resource Orchestrator) | 여러 Kubernetes 리소스를 조합한 상위 API | 반복되는 자원 조합과 의존성을 재사용 가능한 형태로 묶는 계층 |

예를 들어 Git의 애플리케이션 선언을 Argo CD가 반영하고, kro가 Deployment와 ACK 리소스의 조합을 만들며, ACK가 AWS 자원을 관리하도록 구성할 수 있다. 세 기능은 독립적으로 선택하며 모두 켤 필요는 없다. 클러스터 하나에는 각 유형의 capability를 하나씩 만들 수 있다.

## AWS 권한과 Kubernetes 권한을 나눈다

Capability 생성 시 클러스터와 같은 AWS 계정의 IAM 역할을 지정한다. 신뢰 정책에는 `capabilities.eks.amazonaws.com`이 역할을 맡을 수 있어야 한다.

- **AWS API 권한:** ACK가 관리할 서비스, 작업과 자원에 맞춰 허용한다. Kubernetes 리소스를 만들 수 있다는 이유만으로 AWS API 권한이 생기지는 않는다.
- **클러스터 접근:** EKS는 capability 역할의 access entry와 기본 정책을 만든다. Argo CD가 다른 클러스터에 배포하려면 대상 클러스터의 access entry와 권한도 준비한다.
- **추가 Kubernetes 권한:** kro가 RGD와 그 인스턴스를 관리하는 기본 권한과 Deployment, Service 등 조합 대상의 생성 권한은 다르다. 필요한 access policy 또는 RBAC를 별도로 구성한다.
- **Secret 접근:** 일부 ACK 컨트롤러에는 Secret 읽기 권한이 추가로 필요하다. 필요한 namespace에 범위를 제한한다.

권한 오류를 해결하려고 AWS 관리자 권한과 Kubernetes `cluster-admin`을 한꺼번에 주지 않는다. 실패한 계층과 작업을 확인하고 해당 권한만 보완한다.

## 운영 판단

Capability별 활성 시간과 관리 대상 중 특정 Kubernetes 리소스의 시간에 따라 요금이 발생한다. 정확한 단가는 도입 시 공식 가격표로 확인한다. 직접 운영하는 컨트롤러의 비용과 비교할 때는 워커 자원뿐 아니라 패치와 장애 대응 부담도 함께 본다.

다음은 도입 검증용 제안이다.

1. 필요한 기능 하나와 비운영 환경부터 시작한다.
2. Git 반영, Kubernetes 리소스 생성과 AWS 자원 준비 상태를 각각 확인한다.
3. 권한 거절과 의존 자원 준비 지연을 재현하고 오류를 찾을 경로를 확인한다.
4. 애플리케이션의 실제 요청을 시험한다. 선언의 동기화만으로 서비스 정상이나 데이터 복구를 판정하지 않는다.

## 이해 확인

- Argo CD가 Git을 읽지만 원격 클러스터 배포에 실패하면 어느 권한부터 확인할 것인가?
- kro가 RGD를 읽지만 Deployment를 만들지 못한다면 기본 권한에 무엇이 빠졌을 수 있는가?

## 출처

- [Amazon EKS, EKS Capabilities](https://docs.aws.amazon.com/eks/latest/userguide/capabilities.html)
- [Amazon EKS, Security considerations for EKS Capabilities](https://docs.aws.amazon.com/eks/latest/userguide/capabilities-security.html)

## 관련 문서

- [[EKS|Amazon EKS]]
- [[ArgoCD|Argo CD]]
- [[IaC|Infrastructure as Code]]
