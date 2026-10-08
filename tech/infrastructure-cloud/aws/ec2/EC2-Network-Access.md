---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 네트워크와 접근", "IMDS, EIP, ENA, Key Pair"]
verified_at: 2026-08-28
---

# AWS EC2 — 네트워크와 접근

## IMDS — Instance Metadata Service

`http://169.254.169.254/latest/meta-data/` 에서 인스턴스 정보, IAM 임시 자격증명 조회. SSRF 공격으로 자격증명 탈취 사례가 다수 발생해 **IMDSv2** 도입:

| 측면 | IMDSv1 | IMDSv2 |
|------|--------|--------|
| 인증 | 없음 (GET 한 번) | **PUT으로 토큰 발급 → 토큰으로 GET** |
| 요청 제어 | `HttpTokens=optional`일 때 사용 가능 | `HttpTokens=required`로 v2만 허용 가능 |
| 위험 완화 | 요청 위조 시 메타데이터가 노출될 수 있음 | 세션 토큰과 PUT 응답 hop limit으로 일부 SSRF, 프록시 오용 위험을 줄임 |

IMDSv2의 `HttpPutResponseHopLimit`은 1부터 64 사이에서 구성하며 계정 기본값, AMI의 `ImdsSupport`, launch 설정에 따라 실제 값이 달라진다. 컨테이너 환경에서 hop limit 1이면 토큰 응답이 컨테이너까지 도달하지 않을 수 있다. `HttpTokens=optional`이고 클라이언트가 IMDSv1 요청을 하면 v1은 동작할 수 있지만, `HttpTokens=required`이면 v1 fallback은 허용되지 않아 metadata 요청이 실패한다. AWS는 컨테이너 호스트에 hop limit 2를 안내한다. 신규 인스턴스는 IMDSv2 강제(`HttpTokens=required`)를 우선하고, hop limit만 보안 경계로 의존하지 않는다.

## Elastic IP (EIP)

EC2 네트워크 인터페이스에 부여하는 **정적 공인 IP**. 기본 Public IP는 Stop/Start 시 변경되지만, EIP는 명시적 해제 전까지 고정.

- 계정, 리전당 **기본 5개까지** 보유 가능 (요청으로 증가)
- **요금 기준 변경**: 2024년 2월 1일부터 AWS가 제공하는 공인 IPv4 주소는 연결 여부와 관계없이 시간당 과금된다. EC2 Free Tier의 무료 사용 시간과 BYOIP는 별도 조건이며 예전의 실행 중 인스턴스 연결 1개 무료 규칙으로 판단하면 안 된다.
- 과금 대상에는 EIP의 연결 여부와 관계없는 AWS 제공 공인 IPv4, 자동 할당 공인 IPv4가 포함된다. BYOIP와 Free Tier는 별도 조건을 확인한다
- EIP는 ENI의 private IPv4에 연결할 수 있다. detach 가능한 **secondary ENI**는 같은 Availability Zone의 다른 인스턴스에 재부착할 수 있지만 primary ENI는 detach할 수 없고 AZ 경계를 넘겨 이동할 수도 없다. 따라서 ENI 이동은 같은 AZ의 제한된 복구 패턴이며, Multi-AZ 전환에는 EIP 재연결 가능 범위, load balancer, Global Accelerator 또는 DNS 경로를 별도로 설계

권장 패턴: 고정 공인 IPv4가 실제로 필요한지 먼저 확인하고 웹 서비스는 요구에 따라 ALB, NLB, Global Accelerator, CloudFront나 NAT 설계와 비교한다. Bastion도 Session Manager나 EC2 Instance Connect Endpoint로 대체 가능한지 검토한다.

## Primary private IPv4 변경과 인스턴스 교체

이 절은 2026-10-08 AWS 공식 문서 기준이다. 기본 사설 IPv4는 시작할 때 지정하거나 서브넷에서 자동 할당받으며, 시작한 인스턴스에서 직접 바꿀 수 없다. Stop/Start로도 유지된다. EIP 재연결은 공인 주소를 바꾸는 작업이므로 이 제한을 해결하지 않는다.

| 목적 | 처리 방식과 경계 |
|---|---|
| 다른 기본 사설 IPv4 사용 | 기존 인스턴스의 AMI로 새 인스턴스를 시작하면서 선택한 서브넷의 사용 가능한 주소를 지정 |
| 기존 기본 사설 IPv4를 새 인스턴스에 유지 | 원본 primary ENI의 `Delete on termination`을 끄고 AMI를 만든다. AMI 상태가 `available`인지 확인한 뒤 원본을 종료하고, 같은 VPC와 서브넷에서 새 인스턴스를 시작하며 보존한 ENI를 선택 |
| 서비스용 사설 주소를 옮길 필요 | 재할당 가능한 secondary private IPv4를 검토한다. Primary ENI를 실행 중인 원본에서 분리하는 방식과 구분 |

원본 종료가 필요한 경로는 중단과 복구 계획을 먼저 확정한다. EBS 기반 AMI를 생성할 때 기본 재부팅은 볼륨의 일관된 스냅샷을 위한 절차다. 재부팅을 생략하면 파일시스템 무결성이 보장되지 않으며, instance store의 데이터는 AMI로 복원되지 않는다.

애플리케이션 검증에서는 AMI 생성 뒤의 추가 쓰기, 외부 데이터 저장소, IAM 역할, 보안 그룹과 접속 경로를 별도로 확인한다. 주소가 같다는 사실만으로 서비스 상태까지 복구됐다고 판단하지 않는다.

## ENA (Elastic Network Adapter)

**SR-IOV (Single Root I/O Virtualization)** 기반 고성능 네트워크 인터페이스.

- 대역폭은 인스턴스 타입, 네트워크 카드 수, ENI 배치에 따라 다르다. 일부 최신 인스턴스는 여러 네트워크 카드와 ENI를 사용해 합산 **600 Gbps**까지 지원하며 단일 ENI 한도는 별도로 확인해야 한다
- 인스턴스 간 **저지연**, 높은 PPS (Packets Per Second)
- 많은 현행 Nitro 기반 인스턴스 타입이 ENA를 사용하며 실제 지원 여부와 baseline, burst 대역폭은 타입별 네트워크 사양에서 확인
- 클러스터 컴퓨팅, 실시간 분석, 고성능 DB 통신에서 중요한 선택 요소지만 필요한 대역폭, PPS와 EFA 지원 여부를 워크로드별로 확인

## Key Pair

EC2 SSH 접속 시 사용하는 **공개키/개인키 쌍**. AWS가 공개키를 인스턴스에 저장, 사용자가 개인키(`*.pem`)를 보유.

- SSH 접속 시 공개키 인증에 사용한다. 세션 트래픽 암호화는 SSH가 별도로 협상한 세션 키가 담당한다
- **개인키 분실 시 해당 키로는 접속 불가** — Key Pair의 개인키를 AWS에서 복구할 수는 없다. 다만 사전 구성에 따라 Session Manager, EC2 Instance Connect, user data, EBS 분리 후 `authorized_keys` 수정 등 다른 복구 경로가 있을 수 있다
- OS별 기본 Username 상이:
  - Amazon Linux: `ec2-user`
  - Ubuntu: `ubuntu`
  - CentOS: `centos`
  - Debian: `admin`
- **보관 원칙**: 개인키 외부 유출 금지, Git 커밋 금지, 권한 `chmod 400`

현업 권장: SSH Key Pair 의존을 줄이고 **AWS Systems Manager Session Manager**로 대체 (IAM 권한 기반, 포트 22 개방 불필요, 세션 로깅).

## 출처

- [Change the primary private IP address of an EC2 instance — AWS re:Post](https://repost.aws/knowledge-center/ec2-change-primary-ip)
- [AWS 공식 문서, Amazon EC2 instance IP addressing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html)
- [AWS 공식 문서, Create an Amazon EBS-backed AMI](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html)
- [Amazon VPC 공식 문서, AWS charges for all public IPv4 addresses](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html)
- [EC2 instance metadata options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html)
- [IMDSv2 작동 방식](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [EC2, Configure instance metadata options for new instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-new-instances.html)
- [New AWS Public IPv4 Address Charge — AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)
- [AWS 공식 문서, Amazon EC2 instance network bandwidth](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)
- [AWS 공식 문서, General purpose instance network specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [AWS 공식 문서, Amazon EC2 key pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [EC2 연결 옵션](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect.html)
- [EC2 network interface 생성과 이동 제한](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-network-interface.html)
- [AWS 공식 문서, EC2 인스턴스의 기본 사용자 이름](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs-general.html)

## 관련 문서

- [[EC2|EC2 개요]]
- [[EC2-Operations|EC2 운영과 AMI]]
