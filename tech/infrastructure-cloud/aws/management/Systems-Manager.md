---
tags: [infrastructure, aws, ssm, systems-manager, parameter-store, patch-manager, session-manager]
status: done
category: "Infrastructure - AWS"
aliases: ["SSM", "AWS Systems Manager", "Systems Manager"]
---

# AWS Systems Manager (SSM)

**EC2, 온프레미스 인프라**를 운영하는 **통합 관리 도구 모음**. 패치, 구성, 세션, 자동화, 인벤토리를 단일 콘솔에서 처리한다. **SSM Agent**가 설치된 노드라면 AWS, 온프레미스, 다른 클라우드 모두 동일하게 관리 가능.

## SSM Agent — 전제 조건

- 대부분 AWS AMI(Amazon Linux, Ubuntu, Windows Server)에 **사전 설치**
- 노드는 **SSM 권한이 부여된 IAM Role** 필요
- 에이전트가 SSM 엔드포인트와 통신 → **인바운드 포트 개방 불필요** (아웃바운드만)

## 주요 도구

### Parameter Store

**구성, 비밀**을 안전하게 저장 (자세한 내용은 [[SSM-Parameter-Store]]).

- **Standard vs Advanced**: Standard 4 KB, 무료, Advanced 8 KB, TTL, 정책 지원 (유료)
- **String / StringList / SecureString** 3가지 유형. SecureString은 **KMS** 암호화
- CloudFormation, Lambda, CodeBuild에서 직접 참조 (`{{resolve:ssm:/db/url}}`)
- vs **Secrets Manager**:
  - **자동 회전, 교차 리전 복제 = Secrets Manager 강점**
  - **저비용, 일반 설정값 = Parameter Store 강점**

### Patch Manager

**Windows/Linux 패치 자동화**.

- **Patch Baseline**: 어떤 패치를 승인할지 규칙 정의 (자동 승인일, 심각도 필터)
- **Patch Group**: 태그로 인스턴스 그룹화 → 그룹별로 다른 베이스라인 적용 (예: prod는 보수적, dev는 즉시 적용)
- **Maintenance Window**와 결합해 정해진 시간에 패치 실행
- 패치 적용 결과를 **Compliance Report**로 추적

### Run Command

**대규모 인스턴스 그룹에서 명령 실행** — SSM의 시그니처 기능.

- SSH, 액세스 키 **불필요** (에이전트 + IAM 권한으로 충분)
- **수십~수천 대 동시 실행**, rate control(동시 실행 수, 오류 허용치) 지원
- 사용 시나리오:
  - 소프트웨어 설치, 업데이트
  - PowerShell, Bash 스크립트 실행
  - Windows Update 트리거
  - 설정 파일 일괄 변경
- 결과를 **S3, CloudWatch Logs**로 출력
- **EventBridge**로 트리거 가능 (이벤트 기반 자동화)

### Session Manager

**SSH/RDP 없이** 브라우저, AWS CLI로 인스턴스 셸 세션.

- **22번 포트 개방 불필요, Bastion 호스트 불필요** — 공격면 대폭 감소
- 세션 로그를 **S3, CloudWatch Logs**로 기록 (감사 추적)
- IAM 정책으로 사용자별, 인스턴스별 접근 제어
- 시험에서 **"SSH 없이 인스턴스 접속"** 또는 **"Bastion 제거"** → Session Manager

### State Manager

**원하는 구성 상태 유지** (Desired State Configuration).

- 인스턴스가 항상 특정 구성을 따르도록 강제 — 드리프트 발생 시 자동 교정
- 예: 모든 노드에 CloudWatch Agent 설치 유지, 방화벽 규칙 일관성 보장
- 정기 일정으로 Association 재실행

### Automation

- 일반 운영 작업을 **Runbook**(이전 Document)으로 정의해 자동 실행
- AMI 생성, EBS 스냅샷, EC2 재시작, 복구 절차 등
- 콘솔/API/EventBridge/CloudWatch Alarm으로 트리거

### Inventory

- 인스턴스에 설치된 **소프트웨어, OS 버전, 네트워크 구성** 수집
- 라이선스 추적, 보안 감사, 드리프트 탐지 기반 데이터
- 결과를 S3 → Athena로 쿼리, QuickSight로 시각화 가능

### Maintenance Window

- 정해진 시간 창에 **Patch Manager, Run Command, Automation** 작업 실행
- 운영 시간 회피 + 변경 관리 정책 준수

### OpsCenter

- 운영 이슈(OpsItem)를 **단일 위치에서 추적, 해결**
- CloudWatch 알람, Config 규칙 위반 등이 OpsItem으로 생성됨
- 해결 자동화(Runbook) 연결 가능

## 시험 체크포인트

- **Parameter Store vs Secrets Manager**: 회전, 교차 리전, RDS 통합 = Secrets Manager / 저비용 일반 설정 = Parameter Store
- **SSH 없이 EC2 접속, Bastion 제거** → **Session Manager** (포트 22 닫혀도 동작)
- **수백 대 인스턴스에 명령 일괄 실행** → **Run Command** (SSH 키 관리 불필요)
- **OS 패치 자동화, 컴플라이언스 추적** → **Patch Manager + Maintenance Window**
- **인스턴스 구성 드리프트 방지** → **State Manager**
- **운영 작업 표준화(AMI 생성, 복구)** → **Automation Runbook**
- **설치 소프트웨어, OS 인벤토리 감사** → **Inventory**
- SSM Agent + **IAM Role**이 필수 — 인바운드 포트 개방 불필요(아웃바운드만)

## 관련 문서

- [[Secrets-Manager]], [[SSM-Parameter-Store]], [[IAM]], [[CloudWatch]], [[EC2|EC2]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
