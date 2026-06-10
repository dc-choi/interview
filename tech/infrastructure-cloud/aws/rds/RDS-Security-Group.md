---
tags: [infrastructure, aws, rds, security-group]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Security Group", "보안 그룹"]
---

# AWS RDS Security Group 구성

**Security Group(SG)** 은 AWS 리소스의 **stateful 방화벽**. RDS에 아무 SG나 붙이면 안 되는 이유와 최소 권한 원칙으로 설정하는 법.

## Security Group 기초

- **Stateful**: 인바운드 허용된 트래픽의 응답은 아웃바운드 규칙 무관하게 자동 허용
- **기본 거부**: 명시적 allow 규칙이 없으면 모두 차단
- **리소스 단위**: 한 리소스에 여러 SG 적용 가능, 여러 리소스가 같은 SG 공유 가능
- **Stateless 방화벽인 NACL**(서브넷 단위)과 다름

## RDS 자동 생성 SG의 문제

RDS 인스턴스 생성 마법사가 만들어주는 `rds-launch-wizard-N` SG:
- **생성자 IP만 인바운드 허용** — 다른 위치에서 접속 안 됨
- **Lambda·EC2 애플리케이션에서 접근 불가** (다른 IP에서 오니까)
- 이름이 모호해 나중에 여러 개 쌓이면 관리 혼돈

→ 대부분 **새로 만들어 붙이는** 게 정석.

## 적용 패턴

### 안티패턴
```
RDS Security Group:
  Inbound: 0.0.0.0/0 port 3306  ← 전세계 공개
```
즉시 Shodan에 검색되고 무차별 대입 공격 받음. 절대 금지.

### 느슨한 패턴 (개발용)
```
RDS Security Group (RDB-SG):
  Inbound:
    - Source: <내 IP>/32 port 3306     ← 로컬 개발 접속
    - Source: <회사 IP>/32 port 3306   ← 사무실 접속
```
IP 기반 허용. **내 IP 바뀌면 접속 불가** — 유동 IP 환경에서 불편.

### 권장 패턴 (프로덕션)
```
Application Security Group (API-SG):
  Inbound:
    - Source: 0.0.0.0/0 port 443       ← 공개 API

RDS Security Group (RDB-SG):
  Inbound:
    - Source: sg-API-SG port 3306       ← API에서만 접근
                                          (IP가 아니라 SG 참조)
```

**Security Group이 다른 Security Group을 참조**하는 것이 핵심.
- API 인스턴스가 몇 대든 자동으로 허용
- API IP가 변해도 SG ID는 불변 → 유지보수 필요 없음
- "API 계층 → DB 계층" 같은 **계층별 보안 모델**을 IaC로 표현 가능

## 실무 흐름

### 1. 계층별 SG 생성
```
API-SG        (웹·API 서버용)
DB-SG         (RDS용)
Cache-SG      (ElastiCache용)
Bastion-SG    (SSH 게이트웨이)
```

### 2. 각 SG에 규칙 정의
```
API-SG inbound:
  - 0.0.0.0/0 port 443 (HTTPS)
  - Bastion-SG port 22 (SSH, 배스천 경유)

DB-SG inbound:
  - API-SG port 3306 (DB 접근은 API에서만)
  - Bastion-SG port 3306 (DBA가 배스천 경유로 직접 접근)

Cache-SG inbound:
  - API-SG port 6379

Bastion-SG inbound:
  - <사무실 IP>/32 port 22
```

### 3. 리소스에 SG 할당
- RDS 인스턴스 → DB-SG
- EC2·ECS Task → API-SG
- ElastiCache → Cache-SG
- Bastion EC2 → Bastion-SG

### 4. 자동 생성 SG 제거
RDS가 만든 `rds-launch-wizard-N`은 분리·삭제.

## Lambda에서 RDS 접근

Lambda를 VPC 안에 배치하면 해당 VPC의 SG 규칙을 따름.
```
Lambda-SG outbound:
  - 0.0.0.0/0 port 443 (외부 API 호출)
  - DB-SG port 3306

DB-SG inbound:
  - Lambda-SG port 3306  ← 추가
```

Lambda가 VPC 안에 있으면 Cold Start 약간 증가하지만 RDS 직접 접근 가능. 또는 **RDS Proxy**를 앞단에 두어 연결 풀 관리.

## SG vs NACL 차이

| 축 | Security Group | Network ACL |
|---|---|---|
| 적용 단위 | 리소스(EC2·RDS) | 서브넷 |
| 상태 | **Stateful** | Stateless (응답도 명시 필요) |
| 규칙 | Allow만 | Allow + Deny |
| 평가 순서 | 모든 규칙 평가 | 번호순 첫 매칭 |
| 기본값 | 전부 차단 | 전부 허용 (기본 NACL) |

대부분 **SG만으로 충분**. NACL은 서브넷 수준의 추가 방어선.

## 최소 권한 원칙 적용

- **포트 범위 최소화** — `3306`만, `3306-9999` 같은 범위 금지
- **Source 범위 최소화** — IP 대신 SG 참조
- **불필요한 SG 삭제** — 쓰지 않는 SG는 보안 감사 시 위험 신호
- **문서화** — SG 이름·설명에 용도 명시 (`DB-SG: Allow MySQL from API tier only`)

## IaC로 관리

수동 콘솔 설정은 재현·감사·버전 관리 어려움. **Terraform·CDK·CloudFormation**으로:

```hcl
resource "aws_security_group" "db" {
  name = "RDB-SG"
  description = "Allow MySQL from API tier"

  ingress {
    from_port = 3306
    to_port   = 3306
    protocol  = "tcp"
    security_groups = [aws_security_group.api.id]
  }
}
```

코드로 관리하면 리뷰·PR·롤백 가능.

## 흔한 실수

- **`0.0.0.0/0`으로 열어두고 "임시로" 방치** — 거의 영구화
- **IP 하드코딩** — 유동 IP 환경에서 깨짐, SG 참조 선호
- **자동 생성 SG 방치** — 이름 모호·여러 개 쌓임
- **로그 못 봄** — SG 자체는 로깅 없음. **VPC Flow Logs** 활성화로 드롭된 패킷 추적

## 면접 체크포인트

- Security Group이 stateful인 것의 의미
- 자동 생성 SG를 쓰지 말아야 하는 이유
- IP 참조 vs SG 참조의 차이와 장점
- SG와 NACL의 차이 (리소스 vs 서브넷, stateful vs stateless)
- 최소 권한 원칙을 SG에 적용하는 방법

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 17. DB에 Security Group 할당](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-17.-DB%EC%97%90-Security-Group%EC%9D%84-%EB%A7%8C%EB%93%A4%EC%96%B4-%ED%95%A0%EB%8B%B9%ED%95%98%EA%B8%B0-cajtiqe36n)

## 관련 문서
- [[AWS|AWS EC2·ALB]]
- [[AWS-Lambda|AWS Lambda]]
- [[IaC|Infrastructure as Code]]
