---
tags: [infrastructure, aws, cloudformation, iac, automation, devops]
status: done
category: "Infrastructure - AWS"
aliases: ["CloudFormation", "AWS CloudFormation", "CFN"]
---

# AWS CloudFormation

AWS의 **네이티브 IaC 서비스**. JSON, YAML 템플릿으로 AWS 리소스(EC2, VPC, RDS, S3, IAM 등)를 코드로 선언하고, 한 번의 작업으로 일관되게 프로비저닝, 업데이트, 삭제한다. 일반 IaC 개념, 도구 비교는 [[IaC]] 참고.

## 핵심 개념

- **인프라 관리 간소화** — AWS 리소스를 일일이 콘솔에서 설정하지 않고 템플릿으로 미리 구성
- 한 번의 명령으로 **EC2, Auto Scaling, ELB, RDS, S3, VPC** 등 다수 리소스를 동시 생성
- 생성된 리소스 모음(스택)은 **다른 계정, 리전으로 이식** 가능
- **CloudFormation 서비스 자체는 무료**, 생성된 리소스는 일반 요금으로 과금

## Template

- 스택을 구성하는 AWS 리소스를 **JSON 또는 YAML**로 선언한 텍스트 파일
- 로컬 또는 **S3 버킷**에 저장 가능 (S3에 두면 재사용, 버전 관리 용이)
- **CloudFormation Designer** GUI로 시각적으로 생성, 편집 가능

### 템플릿 섹션

| 섹션 | 필수 여부 | 역할 |
|------|-----------|------|
| **Resources** | **필수** | 실제 생성할 AWS 리소스 |
| **Parameters** | 선택 | 스택 생성, 업데이트 시 입력받을 값 (예: EC2 인스턴스 타입 t2.micro) |
| **Mappings** | 선택 | 키-값 룩업 테이블 (프로그래밍의 switch와 유사, 예: 리전별 AMI ID) |
| **Conditions** | 선택 | 리소스 생성 조건 (예: prod 환경에서만 RDS 생성) |
| **Outputs** | 선택 | 스택 생성 후 반환할 값 (예: ELB DNS, VPC ID) — 다른 스택에서 참조 가능 |
| **Metadata** | 선택 | 템플릿에 대한 부가 정보 (JSON, YAML 객체) |
| **Transform** | 선택 | SAM, Include 등 매크로 처리 |

- **Outputs의 Export** 기능으로 다른 스택에서 `Fn::ImportValue`로 참조 → 스택 간 의존성 관리

## Stack

- **하나의 단위로 관리되는 AWS 리소스 모음**
- 스택을 생성, 업데이트, 삭제하면 포함된 리소스가 일괄 처리됨
- **스택 삭제** → 스택 내 모든 리소스 삭제. 삭제 보호된 리소스가 있으면 스택 자체가 삭제되지 않음
- **Automatic Rollback on Error** — 스택 내 리소스 중 하나라도 생성 실패 시 **성공한 리소스도 전부 삭제**해서 원래 상태로 복구

## Change Set (변경 세트)

- 스택의 리소스 변경 사항을 **사전에 미리 확인**할 수 있는 기능
- 템플릿을 수정한 후 바로 적용하지 않고 Change Set을 생성 → **어떤 리소스가 추가, 수정, 삭제, 교체될지** 확인 후 실행
- 특히 **교체(replacement)** 가 일어나는 변경(EC2 인스턴스 타입 변경 등)에서 데이터 손실을 예방
- 안전한 프로덕션 변경의 표준 절차

## Drift Detection (드리프트 감지)

- 스택 생성 후 누군가 **콘솔, CLI로 직접 리소스를 수정**한 경우, 템플릿과 실제 상태 사이의 불일치를 감지
- 실행하면 각 리소스가 **IN_SYNC / MODIFIED / DELETED**로 표시됨
- 인프라가 코드와 일치하는지 주기적으로 점검해야 IaC의 신뢰성이 유지됨

## StackSet

- **여러 AWS 계정, 여러 리전**에 동일한 스택을 동시에 배포하는 기능
- 조직(AWS Organizations) 단위로 일괄 배포 가능
- 대표 사용 사례 — 모든 계정에 **공통 IAM 역할, CloudTrail, 보안 베이스라인** 일괄 적용

## Nested Stack (중첩 스택)

- 스택 안에서 다른 스택을 리소스로 선언 (`AWS::CloudFormation::Stack`)
- 공통 컴포넌트(VPC, 보안 그룹 등)를 **재사용 가능한 모듈**로 분리
- 거대한 단일 템플릿을 작은 단위로 쪼개 가독성, 재사용성 향상
- StackSet(여러 계정, 리전 배포)과 다름 — Nested는 **한 스택 안의 계층 구조**

## CloudFormation Helper Scripts

EC2 인스턴스가 부팅될 때 메타데이터를 해석하고 패키지 설치, 서비스 시작 등을 자동화하는 스크립트.

| 스크립트 | 역할 |
|----------|------|
| **cfn-init** | 메타데이터를 읽어 **패키지, 파일, 서비스** 설치, 구성 |
| **cfn-signal** | EC2 인스턴스 생성, 업데이트 **성공 여부를 CloudFormation에 신호** |
| **cfn-get-metadata** | 메타데이터를 가져옴 |
| **cfn-hup** | 메타데이터 변경을 **주기적으로 감지**하고 cfn-init 재실행 |

- **cfn-signal + CreationPolicy** 조합 — EC2 인스턴스 부팅, 구성이 완료된 후 신호를 보내야 스택이 CREATE_COMPLETE 상태로 진행. 타임아웃을 함께 지정해 무한 대기 방지

## Rollback 동작

- **생성 중 실패** — 기본적으로 **Automatic Rollback** → 성공한 리소스도 모두 삭제
- **업데이트 중 실패** — **Rollback on Update Failure** → 변경 전 상태로 복구
- 디버깅이 필요하면 Rollback을 비활성화하여 실패한 상태 그대로 유지 가능 (단, 비용 발생)

## CloudFormation vs 다른 IaC

| 기준 | CloudFormation | Terraform | CDK |
|------|----------------|-----------|-----|
| 범위 | **AWS 전용** | 멀티 클라우드 | AWS 중심 (CloudFormation 컴파일) |
| 언어 | JSON, YAML | HCL | TypeScript, Python, Java 등 |
| 상태 관리 | **AWS 자체 관리** | tfstate 파일 (S3, DynamoDB 권장) |
| Drift 감지 | **네이티브 지원** | `terraform plan`으로 비교 |

- AWS만 사용하고 **AWS 서비스 통합, 관리가 우선**이면 CloudFormation
- 멀티 클라우드, 온프레미스도 다루면 Terraform이 유리 (자세한 비교는 [[IaC]])

## 시험 체크포인트

- **JSON, YAML 텍스트 파일**로 AWS 리소스 선언 → Template
- 스택 생성 중 일부 실패 → **Automatic Rollback** (성공한 리소스도 삭제)
- 변경 적용 전 **무엇이 어떻게 바뀌는지 미리 확인** → **Change Set**
- 누가 콘솔로 손댄 흔적 감지 → **Drift Detection**
- **여러 계정, 여러 리전에 동일 스택 일괄 배포** → **StackSet**
- 한 스택 안에 모듈처럼 다른 스택 포함 → **Nested Stack**
- EC2 부팅 완료 신호를 CloudFormation에 보냄 → **cfn-signal + CreationPolicy**
- EC2 부팅 시 패키지, 파일, 서비스 자동 구성 → **cfn-init**
- 메타데이터 변경 감지해서 재실행 → **cfn-hup**
- 사용자 입력값(EC2 타입 등) → **Parameters**
- 리전별 AMI ID 같은 룩업 테이블 → **Mappings**
- 조건에 따라 리소스 생성 여부 결정 → **Conditions**
- 다른 스택에서 참조할 값 노출 → **Outputs + Export** → `Fn::ImportValue`
- **CloudFormation 자체는 무료**, 생성된 리소스만 과금

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[IaC]]
- [[EC2|EC2]]
- [[VPC]]
- [[IAM]]
- [[S3]]
