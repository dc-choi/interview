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

## 개선 순서의 예

다음은 위 기능을 이용한 운영 판단 예시다.

1. 공개가 필요한 서비스인지, 스캔의 IP와 포트가 현재 자원과 맞는지 확인한다.
2. 불필요한 공개 경로, 취약점과 과도한 IAM 권한을 함께 검토한다.
3. 업무 동작을 시험하면서 네트워크 접근과 권한을 줄인다.
4. 재스캔 결과와 갱신된 경로를 확인한다. finding 수 감소만으로 전체 위험이 해소됐다고 판단하지 않는다.

## 출처

- [AWS Security Hub, Network Scanning in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-network-scanning.html)
- [AWS Security Hub, Exposure findings in Security Hub](https://docs.aws.amazon.com/securityhub/latest/userguide/exposure-findings.html)
- [AWS Security Hub, Viewing exposures in Security Hub with the potential attack path graph](https://docs.aws.amazon.com/securityhub/latest/userguide/potential-attack-path-graph.html)

## 관련 문서

- [[GuardDuty-Investigation|경보 조사와 대응 판단]]
- [[IAM-Policy|IAM 정책 평가와 권한 경계]]
- [[Security-Policy-and-Assessment|점검 범위와 재점검]]
