---
tags: [infrastructure, network, intent-based-networking, network-verification, automated-reasoning, aws, vpc, terraform]
status: done
verified_at: 2026-10-26
category: "Infrastructure - 네트워크"
aliases: ["Intent-Based Networking", "IBN", "의도 기반 네트워킹", "인텐트 기반 네트워크", "네트워크 연결 의도 검증", "Reachability Analyzer", "Network Access Analyzer"]
---

# 의도 기반 네트워킹(IBN)과 연결 의도 검증

의도 기반 네트워킹(Intent-Based Networking, IBN)은 장비별 설정 대신 네트워크가 달성할 결과를 선언하고, 시스템이 그 결과를 설정으로 옮긴 뒤 실제 동작이 결과와 맞는지 계속 확인하는 관리 방식이다. RFC 9315는 의도(intent)를 네트워크가 충족할 운영 목표와 제공할 결과를, 달성 방법을 지정하지 않고 선언적으로 정의한 것으로 규정한다. 이 RFC는 IRTF NMRG가 2022년 10월 낸 Informational 문서로, 개념과 용어를 정리한 것이며 인터넷 표준이 아니다.

## 의도, 정책, 설정의 구분

| 표현 | 적는 것 | 예 |
|---|---|---|
| 의도 | 네트워크 수준에서 달성할 결과. 방법은 시스템이 정한다 | 개발 VPC에서 운영 VPC로 가는 경로가 없어야 한다 |
| 정책 | 어떤 상황에서 무엇을 할지. 대개 이벤트, 조건, 행동(ECA) 형태로 모델링되며 원하는 결과는 적지 않는다 | 링크 사용률이 기준을 넘으면 트래픽을 다른 경로로 돌린다 |
| 서비스 모델 | 서비스의 매개변수와 수명주기. 시스템이 자동으로 유지할 원하는 결과는 정의할 수 없다 | VPN 서비스의 접속 지점과 대역폭 |
| 설정 | 장비와 리소스의 구체 값 | 보안 그룹 규칙, 라우팅 테이블 경로 |

RFC 9315는 정책이 상황별 행동은 정하지만 원하는 결과를 지정하지 않고, 그 규칙과 행동을 사용자가 직접 작성해야 한다는 점에서 의도와 구분한다. 서비스 모델도 의도 기반 시스템이 자동으로 유지할 원하는 결과를 정의하지 못한다고 본다. 표의 예는 구분을 보이기 위한 것이다. 여기서 정책은 이런 상황별 규칙(대개 ECA 형태)이며, 승인 권한이나 허용 리전 같은 거버넌스 규칙을 코드로 강제하는 IaC의 Policy as Code와 같은 말이 아니다.

IaC의 선언형 구성도 절차 대신 원하는 상태를 적지만, 그 대상은 리소스의 설정값이다. 결과 수준의 의도에서 보면 이 설정도 결과를 달성하는 수단이다. 따라서 `terraform apply`의 성공은 계획한 변경이 실행됐다는 뜻이며 의도한 결과가 충족됐다는 증거는 아니다. 결과 조건은 아래 보증 기능과 구성 검증으로 따로 확인한다.

## 수명주기: 이행과 보증

RFC 9315는 IBN의 기능을 이행(fulfillment)과 보증(assurance)으로 나눈다.

| 구분 | 기능 | 하는 일 |
|---|---|---|
| 이행 | 의도 수집과 사용자 상호작용 | 사용자가 의도를 전달하고 다듬는다 |
| 이행 | 번역 | 의도를 네트워크에 취할 조치와 요청으로 바꾼다 |
| 이행 | 오케스트레이션 | 실제 설정과 프로비저닝 단계를 네트워크 전반에서 조율한다 |
| 보증 | 모니터링 | 네트워크와 그 동작을 관측한다 |
| 보증 | 준수 평가 | 관측한 실제 동작을 의도한 동작과 비교하고 의도 이탈(intent drift)을 찾는다 |
| 보증 | 준수 조치 | 교정 조치를 실행하거나, 필요하면 운영자에게 알린다 |
| 보증 | 추상화, 집계, 보고 | 사용자가 결과를 자기 의도와 연결해 볼 수 있게 보고한다 |

의도 이탈은 control plane이나 하위 관리 작업 때문에도 생길 수 있다. 적용 시점에 한 번 맞췄다고 보증을 멈추지 않는 이유다.

두 기능은 루프로 이어진다. RFC 9315의 모델에서 내부 루프는 의도 기반 시스템과 네트워크 운영 사이에서 사람이 개입하지 않는 자율 루프이고, 외부 루프는 사용자까지 이어져 사용자가 보고를 보고 의도를 조정하는 루프다. 검증된 의도 표현의 집합이 시스템의 단일 진실 공급원(SSoT)이 되며, 올바른 의도 표현에 이르는 과정은 한 번에 끝나지 않고 대화형으로 반복될 수 있다. [[GitOps|GitOps]]가 흔히 설정을 담은 Git 저장소를 SSoT로 부르는 것과는 기준 대상이 다르다.

Kubernetes controller도 API에 기록한 원하는 상태와 관측한 상태의 차이를 줄이는 control loop다([[K8s-Core-Workloads-and-Service|Kubernetes reconciliation 모델]]). 다만 비교 대상이 리소스의 원하는 상태여서, 네트워크의 실제 동작을 의도와 비교하는 보증 기능과는 다루는 수준이 다르다.

## 테스트와 구성 검증의 차이

패킷을 보내는 시험은 고른 출발지와 목적지만 확인한다. AWS의 Tiros 연구는 많은 고객 네트워크의 규모 때문에 전통적인 probing이나 침투 테스트로 문제를 찾기가 현실적으로 어렵다고 보고, AWS 네트워크 개념의 의미를 논리식으로 옮긴 뒤 여러 추론 엔진으로 보안 속성을 검증했다. 이 분석은 정적이어서 고객 네트워크에 패킷을 보내지 않는다.

이 방식은 두 종류의 질문에 답한다.

- **구성 질문**: Web 서브넷에 Bastion 태그가 붙은 인스턴스가 있는가
- **도달성 질문**: 인터넷에서 SSH(TCP 22)로 접근할 수 있는 인스턴스가 있는가

정적 검증의 한계도 함께 본다.

- 검사 대상은 구성으로 만든 모델이다. 모델이 다루지 않는 구성 요소와 실제 data plane의 상태는 결과에 들어가지 않는다.
- 자동 추론 도구는 일부 문제에 판단할 수 없다(Don't know)고 답할 수 있고, 사용하는 쪽은 거의 항상 무엇인가에 대한 가정을 두어야 한다. 테스트 의존을 크게 줄일 수는 있지만 없애지는 못한다.
- 그래서 구성 검증으로 구성상 가능한 경로와 금지한 경로를 확인하고, 실제 연결 시험으로 인스턴스 내부 방화벽, 애플리케이션 응답과 일시적 장애를 확인하도록 역할을 나눈다(운영 제안).

## AWS에서 연결 의도를 검사하는 도구

2026-10-26 AWS 공식 문서 기준이다. 두 도구 모두 VPC 구성을 자동 추론으로 분석하며 패킷을 보내지 않는다.

| 항목 | Reachability Analyzer | Network Access Analyzer |
|---|---|---|
| 묻는 질문 | 이 출발지에서 이 목적지로 갈 수 있는가 | 정의한 조건에 맞는 경로가 환경 어디에 있는가 |
| 입력 | 출발지, 목적지, 프로토콜과 포트. 중간 구성 요소를 지정하거나 제외할 수 있다 | Network Access Scope. `MatchPaths`에 찾을 경로를, `ExcludePaths`에 정당한 예외를 적는다 |
| 결과 | 도달하면 hop별 경로, 도달하지 못하면 경로를 막는 구성 요소 | `MatchPaths`에 맞고 `ExcludePaths`에 맞지 않는 잠재 경로(finding) |
| 쓰임 | 잘못된 구성으로 생긴 연결 장애 진단, 구성이 의도한 연결과 맞는지 확인, 구성이 바뀔 때 검증 자동화 | 운영과 개발 VPC의 격리, 인터넷에서 접근할 수 있는 자원, 자원과 인터넷 게이트웨이 사이 경로마다 방화벽이나 NAT gateway 같은 통제가 있는지, 신뢰 대역에서만 접근되는지 확인 |
| 과금 기준 | 출발지와 목적지 사이 분석 실행마다 | 분석한 network interface 수 |

결과를 읽을 때의 경계는 다음과 같다.

- **Reachability Analyzer**: 도달 경로가 여럿이면 가장 짧은 경로 하나를 보여 준다. 다른 경로는 중간 구성 요소를 지정하거나 제외해 다시 분석한다. 막는 구성 요소를 보여 줘도 경로를 막는 요소가 더 있을 수 있다. 출발지와 목적지는 같은 리전에 있어야 하고, 같은 VPC이거나 VPC peering 또는 transit gateway로 연결된 VPC에 있어야 한다. 같은 AWS Organizations 조직에서 trusted access를 켜면 다른 계정의 자원도 분석할 수 있다. IPv4만 분석하고 등록 대상의 health는 고려하지 않으며, transit gateway route table을 지나는 TCP 경로는 정방향 트래픽만 분석한다. Network Firewall은 stateful/stateless 5-tuple 규칙을 분석하지만 도메인 목록, Suricata 규칙, 규칙 옵션과 태그 기반 리소스 그룹은 지원하지 않는다. 지원하지 않는 규칙은 경로 상세의 정보 메시지로 알리고, 리소스 그룹을 참조하는 rule group이 있으면 분석이 실패한다. 분석은 생성 120일 뒤 자동 삭제되므로 판정 기록은 따로 남긴다.
- **Network Access Analyzer**: 가능한 finding 가운데 다양하고 대표적인 집합을 best effort로 돌려주며, 같은 네트워크에서 같은 scope를 다시 분석해도 같은 finding을 보장하지 않는다. IPv4의 TCP와 UDP를 단방향으로만 분석하고, 분석 대상과 다른 계정이나 리전의 자원이 들어간 경로는 보고하지 않는다. Network Firewall 규칙은 분석하지 않으므로 방화벽이 실제로 막는 경로도 finding에 나올 수 있다. 일시적 장애나 서비스 장애로 인한 패킷 손실도 고려하지 않는다. 한 VPC에서 인터넷 게이트웨이와 인터넷을 거쳐 다른 VPC로 이어지는 경로도 보고하지 않는다.
- Network Access Analyzer에서 finding이 없다는 결과는 도구가 지원하는 구성 범위 안의 결과다. 다른 계정이나 리전, IPv6 경로까지 격리됐다는 증거로 쓰지 않는다.

### 검사를 IaC와 배포 판정에 넣을 때

2026-10-26 Terraform AWS provider 저장소의 main 브랜치 문서와 EC2 API Reference 기준이다.

- 경로와 scope는 CloudFormation의 `AWS::EC2::NetworkInsightsPath`, `AWS::EC2::NetworkInsightsAnalysis`, `AWS::EC2::NetworkInsightsAccessScope`, `AWS::EC2::NetworkInsightsAccessScopeAnalysis`로 정의할 수 있다. Terraform AWS provider에는 Reachability Analyzer용 `aws_ec2_network_insights_path`, `aws_ec2_network_insights_analysis`와 Network Access Analyzer의 scope를 정의하는 `aws_ec2_network_insights_access_scope`(v6.43.0, 2026-04-29부터)가 있다. AWS provider 문서에서는 scope 분석을 실행하는 리소스가 확인되지 않는다. scope 분석은 CLI나 SDK, CloudFormation의 `AWS::EC2::NetworkInsightsAccessScopeAnalysis`(AWSCC provider의 `awscc_ec2_network_insights_access_scope_analysis` 포함)로 실행하고, finding 상세는 `GetNetworkInsightsAccessScopeAnalysisFindings`로 본다.
- Terraform `aws_ec2_network_insights_analysis`의 `status`가 `succeeded`라는 것은 분석이 끝났다는 뜻이며 경로를 찾았다는 뜻이 아니다. 도달 여부는 `path_found`로, 도달하지 못한 이유는 `explanations`로 확인한다. `wait_for_completion`의 기본값은 `true`여서 분석 상태가 `succeeded`나 `failed`가 될 때까지 리소스가 기다린다. provider 소스 기준으로 이 리소스는 생성할 때만 분석을 시작하고 갱신은 태그만 바꾸므로, 네트워크 설정만 바꾼 apply는 분석을 다시 돌리지 않는다. 재분석은 리소스 교체(`-replace`, `replace_triggered_by`)나 CLI로 한다.
- Network Access Scope 분석은 `status`가 `succeeded`인지 먼저 확인한다. 결과의 `findingsFound`는 `true`, `false`, `unknown` 가운데 하나이며 `unknown`을 finding 없음으로 처리하지 않는다.

## 작은 규모로 적용하는 순서

위 개념과 도구에서 도출한 운영 점검 제안이며, 실제 계정에서 수행한 기록은 아니다.

1. 의도를 결과 문장으로 적고 허용할 경로와 금지할 경로를 나눈다. 예를 들어 인터넷 게이트웨이에서 웹 서버 인스턴스의 TCP 443은 허용하고, 개발 VPC에서 운영 VPC로 가는 경로와 인터넷 게이트웨이에서 DB 서버로 가는 경로는 금지한다.
2. 허용 경로는 Reachability Analyzer 경로로, 금지 경로는 Network Access Scope로 옮겨 IaC 저장소에서 설정과 함께 관리한다. 개발 VPC에서 운영 VPC로 가는 scope는 경로의 자원이 모두 분석하는 계정과 리전에 있을 때만 결과를 낸다(다른 계정에서 공유받은 서브넷의 자원이 낀 경로도 보고하지 않는다). 운영과 개발을 다른 계정에 두었고 두 VPC가 같은 리전에서 피어링이나 transit gateway로 연결돼 있다면 같은 조직의 교차 계정 분석을 설정한 Reachability Analyzer로 대표 경로의 차단을 확인한다.
3. 설정을 적용한 뒤 두 분석을 다시 실행한다. 분석 완료와 의도 충족(`path_found`, finding 유무)을 따로 기록하고, 의도를 어기면 변경을 되돌리거나 의도를 다시 검토한다.
4. 허용 경로에서는 실제 새 연결과 애플리케이션 응답도 확인한다. 구성 분석은 data plane, 대상 health와 일시적 장애를 보지 않는다.
5. Network Access Analyzer가 보고하지 않는 다른 계정이나 리전의 경로, Reachability Analyzer가 다루지 않는 다른 리전 사이의 경로와 연결되지 않은 VPC 사이의 경로, 인터넷 게이트웨이를 거쳐 다른 VPC로 이어지는 경로, 두 도구가 분석하지 않는 IPv6 경로와 지원하지 않는 리소스와 구성은 별도 방법으로 확인한다.

이 순서는 사람이 이행과 보증의 루프를 운영하는 형태다. 의도를 설정으로 자동 번역하는 IBN 시스템을 구현한 것은 아니다.

## 대규모 네트워크의 공개 사례

2023년 AWS 공개 자료 기준으로 AWS는 자사 네트워크를 의도 중심 구조로 옮기고 있었다. 여기서 의도는 네트워크에 기대하는 정의된 동작을 뜻한다. SIDR는 초대형 클러스터용으로 설계한 새 라우팅 프로토콜이고, AIDN(AWS Intent Driven Network)은 여러 control plane 위에 놓인 management plane이다. AWS는 네트워크 신뢰성 확보에 자동 추론 기법을 쓴다. 공개 개요만으로는 내부 설계, 적용 범위와 성능을 확인할 수 없어 이 문서에서 다루지 않는다.

## 출처

- [IRTF, RFC 9315: Intent-Based Networking - Concepts and Definitions](https://www.rfc-editor.org/rfc/rfc9315.html)
- [Amazon VPC Reachability Analyzer, What is Reachability Analyzer?](https://docs.aws.amazon.com/vpc/latest/reachability/what-is-reachability-analyzer.html)
- [Amazon VPC Reachability Analyzer, How Reachability Analyzer works](https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html)
- [Amazon VPC Network Access Analyzer, What is Network Access Analyzer?](https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/what-is-network-access-analyzer.html)
- [Amazon VPC Network Access Analyzer, How Network Access Analyzer works](https://docs.aws.amazon.com/vpc/latest/network-access-analyzer/how-network-access-analyzer-works.html)
- [Terraform AWS Provider, aws_ec2_network_insights_path](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_network_insights_path.html.markdown)
- [Terraform AWS Provider, aws_ec2_network_insights_analysis](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_network_insights_analysis.html.markdown)
- [Terraform AWS Provider, aws_ec2_network_insights_access_scope](https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_network_insights_access_scope.html.markdown)
- [Amazon EC2 API Reference, NetworkInsightsAccessScopeAnalysis](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_NetworkInsightsAccessScopeAnalysis.html)
- [Amazon EC2 API Reference, GetNetworkInsightsAccessScopeAnalysisFindings](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetNetworkInsightsAccessScopeAnalysisFindings.html)
- [Amazon VPC Reachability Analyzer, Cross-account analyses](https://docs.aws.amazon.com/vpc/latest/reachability/multi-account.html)
- [Terraform AWSCC Provider, awscc_ec2_network_insights_access_scope_analysis](https://github.com/hashicorp/terraform-provider-awscc/blob/main/docs/resources/ec2_network_insights_access_scope_analysis.md)
- [internal/service/ec2/vpc_network_insights_analysis.go — hashicorp/terraform-provider-aws](https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/ec2/vpc_network_insights_analysis.go)
- [v6.43.0 릴리스 — hashicorp/terraform-provider-aws](https://github.com/hashicorp/terraform-provider-aws/releases/tag/v6.43.0)
- [New – VPC Reachability Analyzer — AWS News Blog](https://aws.amazon.com/blogs/aws/new-vpc-reachability-analyzer/)
- [Reachability Analysis for AWS-based Networks (CAV 2019) — Amazon Science](https://www.amazon.science/publications/reachability-analysis-for-aws-based-networks)
- [A gentle introduction to automated reasoning — Amazon Science, Byron Cook](https://www.amazon.science/blog/a-gentle-introduction-to-automated-reasoning)
- [AWS re:Invent 2023: Revolutionizing Network Infrastructure with Intent-Driven Systems for Enhanced Performance and Reliability — AWS](https://aws.amazon.com/video/watch/1a691d9dc18/)
- [인텐트 기반 네트워크 인프라를 향한 AWS 의 여정 — Amazon Web Services Korea](https://www.youtube.com/watch?v=spoUIUOG1ZI) — 2024-09-19 업로드. 학습 계기이며 본문 사실은 위 공식 자료로 대조

## 관련 문서

- [[IaC#검사가 통과한 단계를 구분한다|IaC 단계별 검사 범위]]
- [[K8s-Core-Workloads-and-Service|Kubernetes reconciliation 모델]]
- [[VPC-NAT-Security|보안 그룹과 NACL 운영]]
- [[Network-Separation|망분리와 신뢰 영역 분할]]
- [[Cloud-WAN-Migration|Cloud WAN 정책과 단계별 통신 검증]]
- [[Security-Hub-Exposure-Analysis|Security Hub 외부 도달성 분석]]
- [[Routing-Protocols|라우팅 프로토콜과 control plane]]
- [[인프라네트워크(InfraNetwork)|인프라 네트워크 인덱스]]
