---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 네트워크와 접근", "IMDS, EIP, ENA, Key Pair"]
---

# AWS EC2 — 네트워크와 접근

## IMDS — Instance Metadata Service

`http://169.254.169.254/latest/meta-data/` 에서 인스턴스 정보, IAM 임시 자격증명 조회. SSRF 공격으로 자격증명 탈취 사례가 다수 발생해 **IMDSv2** 도입:

| 측면 | IMDSv1 | IMDSv2 |
|------|--------|--------|
| 인증 | 없음 (GET 한 번) | **PUT으로 토큰 발급 → 토큰으로 GET** |
| 홉 제한 | 무제한 | `hop-limit` 1 (기본) — 컨테이너 SSRF 차단 |
| SSRF 방어 | 약함 | 강함 |

신규 인스턴스는 IMDSv2 강제 권장 (`HttpTokens=required`).

## Elastic IP (EIP)

EC2 네트워크 인터페이스에 부여하는 **정적 공인 IP**. 기본 Public IP는 Stop/Start 시 변경되지만, EIP는 명시적 해제 전까지 고정.

- 계정, 리전당 **기본 5개까지** 보유 가능 (요청으로 증가)
- **무료 조건**: 실행 중인 인스턴스에 연결된 상태 1개
- **유료 발생 조건**:
  - EIP 생성 후 인스턴스에 미연결
  - **중지된 인스턴스**에 연결된 상태
  - 한 인스턴스에 2개 이상 EIP 연결
- ENI 단위로 부여되며, ENI를 다른 인스턴스로 이동시키면 EIP도 따라감 — **장애 복구, 블루/그린 배포**에 활용

권장 패턴: EIP는 **Bastion, NAT Gateway 대체용 NAT Instance** 정도로 제한하고, 웹 서비스는 ALB, CloudFront 뒤로 숨기는 것이 정석.

## ENA (Elastic Network Adapter)

**SR-IOV (Single Root I/O Virtualization)** 기반 고성능 네트워크 인터페이스.

- 최대 **100 Gbps** 대역폭 (인스턴스 패밀리 종속)
- 인스턴스 간 **저지연**, 높은 PPS (Packets Per Second)
- 최신 인스턴스 패밀리는 모두 ENA 지원, Nitro 기반에서 표준
- 클러스터 컴퓨팅, 실시간 분석, 고성능 DB 통신에 필수

## Key Pair

EC2 SSH 접속 시 사용하는 **공개키/개인키 쌍**. AWS가 공개키를 인스턴스에 저장, 사용자가 개인키(`*.pem`)를 보유.

- SSH 접속 시 로그인 정보 **암호화, 해독**에 사용
- **개인키 분실 시 접속 불가** — Key Pair 자체에는 복구 메커니즘 없음, EBS 분리 후 다른 인스턴스에 마운트하여 `authorized_keys` 수정 우회
- OS별 기본 Username 상이:
  - Amazon Linux: `ec2-user`
  - Ubuntu: `ubuntu`
  - CentOS: `centos`
  - Debian: `admin` 또는 `debian`
- **보관 원칙**: 개인키 외부 유출 금지, Git 커밋 금지, 권한 `chmod 400`

현업 권장: SSH Key Pair 의존을 줄이고 **AWS Systems Manager Session Manager**로 대체 (IAM 권한 기반, 포트 22 개방 불필요, 세션 로깅).
