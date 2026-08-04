---
tags: [infrastructure, aws, cloudformation, iac, automation, devops]
status: done
verified_at: 2026-08-04
category: "Infrastructure - AWS"
aliases: ["CloudFormation", "AWS CloudFormation", "CFN"]
---

# AWS CloudFormation

AWS의 **네이티브 IaC 서비스**. JSON, YAML 템플릿으로 AWS 리소스(EC2, VPC, RDS, S3, IAM 등)를 코드로 선언하고, 한 번의 작업으로 일관되게 프로비저닝, 업데이트, 삭제한다. 일반 IaC 개념, 도구 비교는 [[IaC]] 참고.

## 핵심 개념

- **인프라 관리 간소화** — AWS 리소스를 일일이 콘솔에서 설정하지 않고 템플릿으로 미리 구성
- 한 번의 명령으로 **EC2, Auto Scaling, ELB, RDS, S3, VPC** 등 다수 리소스를 동시 생성
- 같은 템플릿을 **다른 계정, 리전에서 재사용**할 수 있지만 리전별 리소스 지원, AMI와 ARN 같은 값은 분리해야 함
- `AWS::*`, `Alexa::*` resource provider에는 CloudFormation 추가 요금이 없고 생성된 리소스는 일반 요금으로 과금. third-party/private extension과 custom hook은 handler operation 요금이 발생할 수 있음

## Template

- 스택을 구성하는 AWS 리소스를 **JSON 또는 YAML**로 선언한 텍스트 파일
- 로컬 또는 **S3 버킷**에 저장 가능 (S3에 두면 재사용, 버전 관리 용이)
- **AWS Infrastructure Composer**의 CloudFormation console mode로 시각적으로 생성, 편집 가능. 기존 CloudFormation Designer보다 권장되는 도구

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
- **스택 삭제** → 기본적으로 포함 리소스를 삭제하지만 `DeletionPolicy`, retain option과 리소스별 삭제 제약에 따라 보존되거나 삭제가 실패할 수 있음
- **Automatic Rollback on Error**가 기본 동작이다. 다만 preserve successfully provisioned resources를 선택하면 성공한 리소스를 유지한 채 실패 지점에서 진단, 재시도할 수 있음

## Change Set (변경 세트)

- 스택의 리소스 변경 사항을 **사전에 미리 확인**할 수 있는 기능
- 템플릿을 수정한 후 바로 적용하지 않고 Change Set을 생성 → **어떤 리소스가 추가, 수정, 삭제, 교체될지** 확인 후 실행
- 특히 **교체(replacement)** 가 일어나는 변경에서 삭제, 데이터 이전과 중단 위험을 검토
- Change Set은 변경을 미리 보여 주지만 실행 성공을 보장하지 않는다. runtime condition, custom resource와 서비스별 제약은 실행 중 실패할 수 있음
- 전통적인 Change Set은 이전 템플릿과 새 템플릿을 비교한다. 지원 리소스에서는 drift-aware change set으로 실제 상태, 이전 배포 상태, 목표 상태의 3-way diff를 검토할 수 있음

## Drift Detection (드리프트 감지)

- 스택 생성 후 누군가 **콘솔, CLI로 직접 리소스를 수정**한 경우, 템플릿과 실제 상태 사이의 불일치를 감지
- 실행하면 각 리소스가 **IN_SYNC / MODIFIED / DELETED**로 표시됨
- drift detection을 지원하는 리소스만 검사하며 지원하지 않는 리소스는 `NOT_CHECKED`. 템플릿이나 parameter에 명시한 속성만 비교하므로 기본값까지 모두 감지한다고 가정하면 안 됨
- 부모 스택의 drift detection은 nested stack 내부를 자동 검사하지 않으므로 각 nested stack을 별도로 검사
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

## AWS Serverless Application Model (SAM)

AWS SAM template specification은 CloudFormation을 확장한 서버리스 전용 축약 문법이다. `Transform: AWS::Serverless-2016-10-31`과 `AWS::Serverless::Function`, API, event source 같은 리소스를 사용하면 배포 시 CloudFormation 리소스로 변환된다.

- SAM CLI는 프로젝트 초기화, 로컬 실행, build와 deploy 흐름을 제공한다.
- 현재 기본 흐름은 `sam build`로 의존성과 artifact를 준비하고 `sam deploy`로 package upload와 CloudFormation 배포를 수행하는 방식이다.
- SAM은 별도 상태 관리 엔진이 아니다. 최종 stack, change set, rollback과 IAM 권한은 CloudFormation 동작을 따른다.

## Rollback 동작

- **생성 중 실패** — 기본적으로 **Automatic Rollback**. preserve successfully provisioned resources를 선택하면 성공 리소스를 유지하고 실패 리소스부터 재개 가능
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
- 스택 생성 중 일부 실패 → 기본은 **Automatic Rollback**, 진단과 재개가 필요하면 preserve successfully provisioned resources
- 변경 적용 전 **무엇이 어떻게 바뀌는지 미리 확인** → **Change Set**
- 실제 상태의 drift까지 포함한 3-way 비교 → 지원 리소스의 **drift-aware change set**
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
- 서버리스 축약 문법과 CLI build/deploy → **AWS SAM**, 최종 프로비저닝은 CloudFormation
- `AWS::*`, `Alexa::*` provider는 추가 요금 없음. third-party/private extension과 custom hook handler는 과금 가능

## 출처

- AWS SAA C03 학습 자료 (로컬)
- [AWS CloudFormation — Template anatomy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html)
- [AWS CloudFormation — Infrastructure Composer](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/infrastructure-composer-for-cloudformation.html)
- [AWS CloudFormation — Change sets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html)
- [AWS CloudFormation — Drift detection](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html)
- [AWS CloudFormation — Drift-aware change sets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/drift-aware-change-sets.html)
- [AWS CloudFormation — Stack failure options](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html)
- [AWS CloudFormation — Pricing](https://aws.amazon.com/cloudformation/pricing/)
- [AWS SAM — How SAM works](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam-overview.html)
- [AWS SAM — Deploying applications](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-deploying.html)
- [Sungmin Kim 강사 — CloudFormation이란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90165)
- [Sungmin Kim 강사 — CloudFormation 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90166)
- [Sungmin Kim 강사 — Serverless Application Model](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90167)
- [Sungmin Kim 강사 — CloudFormation Nested Stack](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90170)
- [Sungmin Kim 강사 — CloudFormation과 SAM 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90168)

## 관련 문서

- [[IaC]]
- [[EC2|EC2]]
- [[VPC]]
- [[IAM]]
- [[S3]]
