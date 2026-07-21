---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 네트워크와 접근", "IMDS, EIP, ENA, Key Pair"]
verified_at: 2026-07-21
---

# AWS EC2 — 네트워크와 접근

## IMDS — Instance Metadata Service

`http://169.254.169.254/latest/meta-data/` 에서 인스턴스 정보, IAM 임시 자격증명 조회. SSRF 공격으로 자격증명 탈취 사례가 다수 발생해 **IMDSv2** 도입:

| 측면 | IMDSv1 | IMDSv2 |
|------|--------|--------|
| 인증 | 없음 (GET 한 번) | **PUT으로 토큰 발급 → 토큰으로 GET** |
| 요청 제어 | `HttpTokens=optional`일 때 사용 가능 | `HttpTokens=required`로 v2만 허용 가능 |
| 위험 완화 | 요청 위조 시 메타데이터가 노출될 수 있음 | 세션 토큰과 PUT 응답 hop limit으로 일부 SSRF, 프록시 오용 위험을 줄임 |

IMDSv2의 `HttpPutResponseHopLimit`은 1부터 64 사이에서 구성하며 계정 기본값, AMI의 `ImdsSupport`, launch 설정에 따라 실제 값이 달라진다. 컨테이너 환경은 hop limit 1이면 토큰 응답이 컨테이너에 도달하지 않아 v1로 fallback하거나 연결이 실패할 수 있으므로 AWS는 필요한 경우 2를 검토하도록 안내한다. 신규 인스턴스는 IMDSv2 강제(`HttpTokens=required`)를 우선하고, hop limit만 보안 경계로 의존하지 않는다.

## Elastic IP (EIP)

EC2 네트워크 인터페이스에 부여하는 **정적 공인 IP**. 기본 Public IP는 Stop/Start 시 변경되지만, EIP는 명시적 해제 전까지 고정.

- 계정, 리전당 **기본 5개까지** 보유 가능 (요청으로 증가)
- **요금 기준 변경**: 2024년 2월 1일부터 AWS가 제공하는 공인 IPv4 주소는 연결 여부와 관계없이 시간당 과금된다. EC2 Free Tier의 무료 사용 시간과 BYOIP는 별도 조건이며, 예전의 실행 중 인스턴스 연결 1개 무료 규칙으로 판단하면 안 된다.
- 과금 대상에는 EIP의 연결 여부와 관계없는 AWS 제공 공인 IPv4, 자동 할당 공인 IPv4가 포함된다. BYOIP와 Free Tier는 별도 조건을 확인한다
- EIP는 ENI의 private IPv4에 연결할 수 있다. detach 가능한 **secondary ENI**는 같은 Availability Zone의 다른 인스턴스에 재부착할 수 있지만 primary ENI는 detach할 수 없고 AZ 경계를 넘겨 이동할 수도 없다. 따라서 ENI 이동은 같은 AZ의 제한된 복구 패턴이며, Multi-AZ 전환에는 EIP 재연결 가능 범위, load balancer, Global Accelerator 또는 DNS 경로를 별도로 설계

권장 패턴: 고정 공인 IPv4가 실제로 필요한지 먼저 확인하고, 웹 서비스는 요구에 따라 ALB, NLB, Global Accelerator, CloudFront나 NAT 설계와 비교한다. Bastion도 Session Manager나 EC2 Instance Connect Endpoint로 대체 가능한지 검토한다.

## ENA (Elastic Network Adapter)

**SR-IOV (Single Root I/O Virtualization)** 기반 고성능 네트워크 인터페이스.

- 대역폭은 인스턴스 타입, 네트워크 카드 수, ENI 배치에 따라 다르다. 일부 최신 인스턴스는 여러 네트워크 카드와 ENI를 사용해 합산 **600 Gbps**까지 지원하며, 단일 ENI 한도는 별도로 확인해야 한다
- 인스턴스 간 **저지연**, 높은 PPS (Packets Per Second)
- 많은 현행 Nitro 기반 인스턴스 타입이 ENA를 사용하며, 실제 지원 여부와 baseline, burst 대역폭은 타입별 네트워크 사양에서 확인
- 클러스터 컴퓨팅, 실시간 분석, 고성능 DB 통신에서 중요한 선택 요소지만 필요한 대역폭, PPS와 EFA 지원 여부를 워크로드별로 확인

## Key Pair

EC2 SSH 접속 시 사용하는 **공개키/개인키 쌍**. AWS가 공개키를 인스턴스에 저장, 사용자가 개인키(`*.pem`)를 보유.

- SSH 접속 시 공개키 인증에 사용한다. 세션 트래픽 암호화는 SSH가 별도로 협상한 세션 키가 담당한다
- **개인키 분실 시 해당 키로는 접속 불가** — Key Pair의 개인키를 AWS에서 복구할 수는 없다. 다만 사전 구성에 따라 Session Manager, EC2 Instance Connect, user data, EBS 분리 후 `authorized_keys` 수정 등 다른 복구 경로가 있을 수 있다
- OS별 기본 Username 상이:
  - Amazon Linux: `ec2-user`
  - Ubuntu: `ubuntu`
  - CentOS: `centos`
  - Debian: `admin` 또는 `debian`
- **보관 원칙**: 개인키 외부 유출 금지, Git 커밋 금지, 권한 `chmod 400`

현업 권장: SSH Key Pair 의존을 줄이고 **AWS Systems Manager Session Manager**로 대체 (IAM 권한 기반, 포트 22 개방 불필요, 세션 로깅).

## 출처

- [AWS charges for all public IPv4 addresses — Amazon VPC 공식 문서](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html)
- [EC2 instance metadata options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html)
- [IMDSv2 작동 방식](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [New AWS Public IPv4 Address Charge — AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)
- [Amazon EC2 instance network bandwidth — AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)
- [General purpose instance network specifications — AWS 공식 문서](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [Amazon EC2 key pairs — AWS 공식 문서](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [EC2 연결 옵션](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect.html)
- [EC2 network interface 생성과 이동 제한](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-network-interface.html)
