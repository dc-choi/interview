---
tags: [infrastructure, aws, security, exposure, iam]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Security Hub Exposure Analysis", "Security Hub 노출 분석"]
---

# Security Hub의 외부 도달성과 영향 범위

보안 설정상 가능한 접근, 스캔에서 관측한 접근, 침해 후 권한으로 이어질 수 있는 경로는 서로 다른 증거다. Security Hub의 Network Scanning과 exposure 분석을 연결하면 이 경계를 나눠 개선 우선순위를 판단할 수 있다.

## 외부 도달성 확인

Network Scanning은 계정 외부의 AWS 소유 IP에서 접속을 시도해 열린 포트와 서비스를 확인한다. 보안 그룹, NACL과 라우팅의 구성 분석을 보완하며 결과는 OCSF finding으로 남는다.

- 대상은 공인 IP가 있는 EC2, EIP와 지원 로드 밸런서다. Azure Public IP는 별도 connector가 필요하다.
- 로드 밸런서를 스캔해도 그 뒤의 사설 EC2를 개별 검사한 것은 아니다. 각 리소스의 공개 진입점을 구분한다.
- 지원하는 TCP 포트만 검사한다. 결과가 없으면 아직 검사되지 않았을 수 있다. 열린 포트가 없다는 Informational finding도 검사 범위 안의 결과다.
- 짧게 생성됐다 사라지는 리소스는 놓칠 수 있다. 접속 근거와 관측 시점을 함께 읽는다.

활성화는 실제 네트워크 스캔에 대한 승인이다. 적용할 계정과 리전, 조직 정책을 먼저 확인한다. 포트를 닫은 뒤 finding 종료는 후속 스캔을 기다릴 수 있다. 기능을 끄는 것만으로 기존 finding이 즉시 사라지지는 않는다.

## 침해 후 도달 가능한 자원

Exposure finding은 여러 보안 신호를 연결해 잠재 위험을 나타낸다. Potential attack path graph는 최초 자원과 후속 자원, 그 사이를 연결하는 권한을 보여준다. Impact assessment에서는 권한 상승 경로와 영향 범위를 확인한다.

이 그래프는 실제 침해가 발생했다는 기록이 아니다. 공개 포트에서 서비스를 발견한 사실과, 공격자가 자원을 장악한 뒤 IAM 권한으로 이동할 가능성을 구분한다. 실제 활동 조사는 로그와 탐지 신호를 별도로 대조한다.

## Azure 연동에서 확인할 수집 경계

Azure connector를 구성하면 Security Hub가 CSPM과 Inspector의 service-linked connector를 만들어 설정 점검과 취약점 수집 범위를 연결한다. Azure 쪽 애플리케이션 등록, 연합 자격 증명, 권한과 Event Hub 구성이 먼저 필요하다. tenant ID만 입력하면 준비가 끝나는 구조는 아니다.

- 설정 점검은 CIS Microsoft Azure Foundations Benchmark와 Azure Foundational Best Practices를 사용한다. Inspector는 지원하는 VM, Function App과 ACR 이미지의 소프트웨어 취약점을 검사한다. VM 검사는 같은 리전의 Systems Manager 구성 등 별도 전제를 확인한다.
- Microsoft Defender for Cloud의 위협 경보를 받으려면 Event Hub로 continuous export를 구성해야 한다. 설정 점검과 취약점 수집이 켜졌다는 사실만으로 위협 경보까지 수집된다고 보지 않는다.
- Security Hub finding은 AWS와 Azure 모두 OCSF 형식으로 읽을 수 있다. 공통 형식이 각 클라우드의 수집 범위나 권한 설정까지 같다는 뜻은 아니다.

연결 후에는 connector 상태, Azure 필터의 finding, 표준별 control 결과를 함께 확인한다. 전부 `NO_DATA`이면 점검 통과로 해석하지 않는다. 구독별 Activity Log export와 권한 범위를 점검한다. Azure 리전을 추가하면 새 리전의 Event Hub 구성도 필요하다.

## 조직 온보딩과 수집 전제를 구분한다

2026-10-10 공식 문서 대조 기준, 조직 관리 계정의 위임 관리자 지정, 위임 관리자 계정의 서비스 활성화, 멤버 계정에 적용할 구성 정책 생성은 별도 단계다. 관리자 화면이 열렸다는 사실만으로 멤버 계정 전체의 수집이 준비됐다고 판단하지 않는다.

AWS 보안 표준의 CSPM 점검에 필요한 Config 구성도 활성화 조합에 따라 다르다.

- Security Hub와 Security Hub CSPM을 함께 활성화한 계정과 리전에서는 CSPM이 service-linked configuration recorder를 자동 생성하고 관리한다. 이 경우 AWS Config를 수동으로 구성할 필요가 없다.
- Security Hub 없이 CSPM만 사용하면 필요한 리소스 유형의 AWS Config 기록을 직접 활성화해야 한다.

위 조건에서 도출한 점검 순서는 대상 계정과 리전, 적용한 기능과 정책, 구성 기록 전제, 실제 finding을 차례로 확인하는 것이다. 구성 완료는 침해가 없다는 증거가 아니며, 비어 있는 분석 결과는 수집 누락 가능성과 함께 해석한다. 기존 고객 관리 recorder를 다른 감사나 자동화에도 쓰는지는 별도로 확인한다.

## 개선 순서의 예

### Extended 구독과 파트너 온보딩의 경계

2026-10-10 공식 문서 기준, Extended plan은 Essentials plan을 활성화한 고객이 사용할 수 있다. 위임 관리자 계정뿐 아니라 standalone 계정에서도 접근한다. 조직을 구성하는 절차를 모든 사용자의 필수 전제로 일반화하지 않는다.

파트너 제품 구독 뒤에는 해당 파트너의 가입과 온보딩 절차를 마쳐야 한다. 운영 점검에서는 구독 완료, 파트너 설정 완료, 기대한 finding의 실제 수신을 별도 단계로 확인한다. 구독 상태만으로 수집 범위와 신호 전달이 검증됐다고 판단하지 않는다. 구독 취소 때도 제품 구성에 따른 파트너의 추가 offboarding 절차를 확인한다.

### 노출 개선 확인

다음은 위 기능을 이용한 운영 판단 예시다.

1. 공개가 필요한 서비스인지, 스캔의 IP와 포트가 현재 자원과 맞는지 확인한다.
2. 불필요한 공개 경로, 취약점과 과도한 IAM 권한을 함께 검토한다.
3. 업무 동작을 시험하면서 네트워크 접근과 권한을 줄인다.
4. 재스캔 결과와 갱신된 경로를 확인한다. finding 수 감소만으로 전체 위험이 해소됐다고 판단하지 않는다.

## 출처

- [AWS Security Hub, Security Hub Extended plan](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-extended-plan.html)
- [AWS Security Hub, Enabling Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-enable.html)
- [AWS Security Hub, Enabling and configuring AWS Config for Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-setup-prereqs.html)
- [AWS Security Hub, Network Scanning in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-network-scanning.html)
- [AWS Security Hub, Exposure findings in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/exposure-findings.html)
- [AWS Security Hub, Viewing exposures in Security Hub with the potential attack path graph](https://docs.aws.amazon.com/securityhub/latest/userguide/potential-attack-path-graph.html)
- [AWS Security Hub, Integrating Security Hub with Microsoft Azure](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-azure.html)
- [AWS Security Hub, Configuring Microsoft Azure to integrate with Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-azure-setup-azure.html)
- [AWS Security Hub, Configuring Security Hub to integrate with Microsoft Azure](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-azure-setup-securityhub-v2.html)

## 관련 문서

- [[GuardDuty-Investigation|경보 조사와 대응 판단]]
- [[IAM-Policy|IAM 정책 평가와 권한 경계]]
- [[Security-Policy-and-Assessment|점검 범위와 재점검]]
