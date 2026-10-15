---
tags: [infrastructure, aws, cloudformation, iac, automation, devops]
status: done
verified_at: 2026-10-07
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
- 템플릿 안 참조: `!Ref`는 파라미터 이름이면 그 값을, 리소스 논리 ID면 리소스를 식별하는 값(보통 이름, EC2 인스턴스는 ID, EIP는 IP)을 돌려준다. ARN 같은 다른 속성은 `!GetAtt`로 읽는다
- 생성 순서: `!Ref`, `!GetAtt`, `!Sub` 참조는 암묵적 의존성이 되어 참조 대상이 먼저 만들어지고 나중에 삭제된다. 의존성이 없는 리소스는 병렬로 만들며, 참조 없이 순서만 필요할 때(VPC gateway attachment 뒤에 만들 public IP 리소스, 역할 정책이 먼저 있어야 하는 리소스)는 `DependsOn`으로 명시한다

### SSM으로 AMI를 참조할 때의 값 확정 시점

`AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>`는 AMI ID 대신 Parameter Store의 키를 입력받고, `!Ref`로 해석된 AMI ID를 리소스에 전달한다. 공개 매개변수의 기본 개념은 [[SSM-Parameter-Store#공개 매개변수|공개 매개변수]]를 참고한다. 다음은 2026-10-14 공식 문서로 부분 대조한 배포 시점의 주의점이다.

- `UsePreviousValue=true`는 **같은 Parameter Store 키를 유지**한다는 뜻이다. 예전에 해석한 AMI ID를 고정하는 옵션이 아니며, 업데이트 시 그 키의 최신 값을 다시 읽는다.
- 변경 세트를 만들 때 읽은 값은 변경 세트에 담긴다. 실행 시에는 변경 세트의 값을 사용하므로, 생성과 실행 사이에 Parameter Store 값이 바뀌어도 실행 직전에 최신 AMI를 다시 선택한다고 가정하지 않는다.
- `describe-change-set`과 `describe-stacks`에서 해석된 값을 확인할 수 있다. 실행 전 변경 세트의 AMI ID와 리소스 변경을 검토하고, 적용 후 스택의 해석값을 대조한다.
- 파라미터의 허용값 같은 제약은 Parameter Store **키**를 검증한다. 그 키에 저장된 값의 적합성까지 검증하는 것으로 해석하지 않는다.

재현 가능한 배포를 위해 키 이름뿐 아니라 해석된 AMI ID도 배포 기록에 남기는 것을 운영 기준으로 삼을 수 있다. 실제 AWS 배포는 실행하지 않았고 나머지 버전 민감 주장은 재검증하지 않아 기존 `verified_at`을 유지한다.

## Stack

- **하나의 단위로 관리되는 AWS 리소스 모음**
- 스택을 생성, 업데이트, 삭제하면 포함된 리소스가 일괄 처리됨
- **스택 삭제** → 기본적으로 포함 리소스를 삭제하지만 `DeletionPolicy`, retain option과 리소스별 삭제 제약에 따라 보존되거나 삭제가 실패할 수 있음
- **Automatic Rollback on Error**가 기본 동작이다. 다만 preserve successfully provisioned resources를 선택하면 성공한 리소스를 유지한 채 실패 지점에서 진단, 재시도할 수 있음

### 삭제, 교체와 업데이트 보호의 경계

부분 검증(2026-10-16): CloudFormation의 보호 정책별 공식 문서를 대조했다. 삭제를 막는 설정과 삭제 과정에서 자원을 남기는 설정은 적용 시점이 다르다.

| 수단 | 적용 범위와 한계 |
|---|---|
| Termination protection | 스택 삭제 요청을 막는다. 업데이트 자체를 막지 않으며, 업데이트가 중첩 스택을 제거하면 그 중첩 스택은 삭제될 수 있다. 설정은 root 스택에서 관리한다. |
| Stack policy | 스택 업데이트 중 지정 리소스의 `Update:Modify`, `Update:Replace`, `Update:Delete`를 제한한다. 전체 스택 삭제와 IAM 접근 제어를 대신하지 않는다. 보호 대상에는 명시적 `Deny`를 둔다. |
| `DeletionPolicy: Retain` | 스택 삭제 또는 템플릿에서 리소스 정의를 제거할 때 물리 자원을 남긴다. 속성 변경에 따른 교체에서 이전 자원을 보존하는 설정은 아니다. |
| `UpdateReplacePolicy: Retain` | 업데이트로 교체되는 이전 물리 자원을 남긴다. 교체 자체를 막거나 새 자원으로 데이터를 이전하는 기능으로 해석하지 않는다. |

보존된 자원은 CloudFormation 관리 범위에서 빠져도 계속 존재하며 해당 비용이 발생한다. 운영 점검에서는 보존 대상과 이후 관리 책임을 함께 정한다. IAM으로 스택 변경 권한뿐 아니라 `SetStackPolicy`, `UpdateTerminationProtection`처럼 보호를 바꾸는 권한도 검토한다. Stack policy는 승인된 업데이트 동안 임시 정책으로 재정의할 수 있으므로 영구적인 변경 불가 보장이 아니다. 이 절만 대조했으며 실제 삭제나 업데이트는 실행하지 않았다.

### IN_PROGRESS가 길어질 때의 진단 순서

`CREATE_IN_PROGRESS`, `UPDATE_IN_PROGRESS`, `DELETE_IN_PROGRESS`는 진행 상태이며 그 자체로 장애를 뜻하지 않는다. CloudFormation이 기다리는 리소스의 안정화 조건과 예상 소요 시간을 먼저 확인한다.

1. Resources에서 진행 중인 리소스의 논리 ID와 물리 ID를 찾고, Events에서 해당 작업의 시작 시각을 확인한다.
2. 해당 서비스의 콘솔과 이벤트를 확인한다. 예를 들어 ECS라면 서비스 이벤트와 태스크 상태를 대조한다.
3. 서비스 화면만으로 원인이 드러나지 않으면 그 시각 주변의 CloudTrail 이벤트에서 해당 리소스 API와 오류를 찾는다. EBS 업데이트라면 `ModifyVolume`이 단서가 될 수 있다. 로그 반영이 늦을 수 있으므로 즉시 조회한 빈 결과를 호출 부재로 단정하지 않는다.
4. 원인과 리소스별 복구 방법을 확인한 뒤 기다림, 수정 또는 업데이트 취소를 선택한다. 상태를 빨리 끝내려는 목적만으로 스택이나 의존 리소스를 삭제하지 않는다. 삭제는 위 보호 정책과 데이터 보존 범위를 함께 검토한다.

2026-10-16 AWS Knowledge Center의 검색 본문으로 진단 순서를 부분 대조했다(페이지 직접 열람은 실패). 실제 계정에서 재현하지 않았으며 리소스별 제한 시간과 나머지 버전 민감 주장은 재검증하지 않아 기존 `verified_at`을 유지한다.

### DELETE_FAILED 진단과 잔존 리소스

2026-10-07 공식 문서 대조 기준이다. 스택 Events에서 실패한 논리 ID와 사유를 확인하고, 삭제를 막는 원인을 먼저 구분한다.

- **외부 의존성과 리소스 제약**: 스택 밖에서 사용 중인 리소스나 비어 있지 않은 S3 버킷은 삭제가 실패할 수 있다. 의존성을 해소하거나 데이터를 보존할지 결정한 뒤 재시도한다.
- **서비스 역할과 권한**: 삭제에 쓰는 역할과 하위 서비스의 삭제 권한을 확인한다. `DeleteStack`의 `RoleARN`으로 사용할 역할을 지정할 수 있으며, 생략하면 기존에 스택과 연결된 역할을 사용한다.
- **Custom resource 응답**: Lambda 실행 성공만으로 완료되지 않는다. `Delete` 요청을 받은 provider가 제한 시간 안에 `ResponseURL`로 `SUCCESS` 또는 `FAILED` 응답을 보내야 한다. 기본 `ServiceTimeout`은 3,600초이며 무응답 원인을 고치지 않은 재시도는 다시 시간 초과할 수 있다.

`DELETE_FAILED`에서 `RetainResources`에 **논리 ID**를 지정하면 해당 리소스를 남기고 스택을 삭제할 수 있다. `DeletionMode=FORCE_DELETE_STACK`도 리소스 전체의 물리적 삭제를 보장하지 않는다. 콘솔의 강제 삭제는 삭제에 실패한 리소스와 그 의존 리소스를 보존한다.

삭제 뒤에는 Deleted 필터에서 스택의 Resources를 열어 `DELETE_SKIPPED`를 확인하고, 남은 리소스의 사용 여부, 비용과 정리 책임을 별도로 기록한다. Custom resource를 건너뛰었어도 provider가 만든 실제 자원이 사라졌다고 가정하지 않는다.

## Change Set (변경 세트)

- 스택의 리소스 변경 사항을 **사전에 미리 확인**할 수 있는 기능
- 템플릿을 수정한 후 바로 적용하지 않고 Change Set을 생성 → **어떤 리소스가 추가, 수정, 삭제, 교체될지** 확인 후 실행
- 특히 **교체(replacement)** 가 일어나는 변경에서 삭제, 데이터 이전과 중단 위험을 검토
- Change Set은 변경을 미리 보여 주지만 실행 성공을 보장하지 않는다. runtime condition, custom resource와 서비스별 제약은 실행 중 실패할 수 있음
- 전통적인 Change Set은 이전 템플릿과 새 템플릿을 비교한다. 지원 리소스에서는 drift-aware change set으로 실제 상태, 이전 배포 상태, 목표 상태의 3-way diff를 검토할 수 있음

### REVIEW_IN_PROGRESS와 변경 세트 실행

새 스택에 `ChangeSetType=CREATE`로 변경 세트를 만들면 스택 ID는 생기지만 스택에 템플릿과 리소스는 아직 생성되지 않는다. 변경 세트를 실행하기 전까지 스택은 `REVIEW_IN_PROGRESS`에 머문다. 이 상태만으로 리소스 생성 장애라고 판단하지 않는다.

1. 대상 계정과 리전을 확인하고 스택의 Change sets에서 적용할 변경 세트와 변경 내용을 검토한다.
2. 콘솔의 Execute change set 또는 `aws cloudformation execute-change-set --change-set-name <변경-세트-ARN>`으로 실행한다. 실행 요청 이후에는 Events나 `describe-stacks`로 실제 진행과 최종 상태를 확인한다.
3. CodePipeline에서는 `CHANGE_SET_REPLACE`가 변경 세트를 만들거나 교체하고, `CHANGE_SET_EXECUTE`가 이를 실행한다. 변경 세트 생성 방식의 파이프라인이라면 실행 action이 이어지는지, `StackName`과 `ChangeSetName`이 의도한 대상인지 확인한다. `CREATE_UPDATE`로 직접 생성하거나 갱신하는 구성과 구분한다.

2026-10-14 공식 API와 사용자 가이드로 이 절을 부분 대조했다. 실제 AWS 계정에서 배포를 실행한 결과는 아니며, 문서의 나머지 버전 민감 주장을 전부 재검증하지 않아 기존 `verified_at`을 유지한다.

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

### 폐쇄 또는 정지된 계정의 Stack instance 분리

2026-10-13 공식 API와 AWS Knowledge Center 검색 본문 대조 기준. 대상 계정에 접근할 수 없어 삭제가 막히면 `DeleteStackInstances`의 `RetainStacks=true`로 StackSet과의 연결을 제거할 수 있다. 이 작업은 대상 스택과 리소스의 물리적 삭제가 아니다.

- **Self-managed permissions**: 대상 `Accounts`와 `Regions`를 지정한다.
- **Service-managed permissions**: `DeploymentTargets`에 OU와 대상 계정을 지정하고 `AccountFilterType=INTERSECTION`으로 해당 OU 안의 지정 계정만 선택한다. OU 전체를 대상으로 하는 `NONE`과 구분한다.
- **보존 옵션**: CLI의 `--retain-stacks`는 스택과 리소스를 남긴다. 일반 스택 삭제의 `RetainResources`가 논리 리소스 ID를 받는 것과 다른 범위다.

운영 점검에서는 계정, 리전과 권한 모델을 확인한 뒤 작업 결과와 StackSet에서의 분리 여부를 대조한다. 남은 자원의 정리 책임은 별도로 관리한다. 이 절은 문서에 근거한 절차이며 실제 계정에서 삭제를 실행한 결과가 아니다. 부분 대조이므로 기존 검증일은 유지한다.

## Nested Stack (중첩 스택)

- 스택 안에서 다른 스택을 리소스로 선언 (`AWS::CloudFormation::Stack`)
- 공통 컴포넌트(VPC, 보안 그룹 등)를 **재사용 가능한 모듈**로 분리
- 거대한 단일 템플릿을 작은 단위로 쪼개 가독성, 재사용성 향상
- StackSet(여러 계정, 리전 배포)과 다름 — Nested는 **한 스택 안의 계층 구조**
- 주요 속성: `TemplateURL`(자식 템플릿 위치. `https://`로 시작하는 S3 객체 URL, 최대 1MB), `Parameters`(자식 템플릿 파라미터에 넘길 값), `TimeoutInMinutes`(자식이 `CREATE_COMPLETE`에 이를 때까지 기다리는 분 단위 시간. 기본값은 없고, 넘기면 자식과 부모를 함께 롤백), `NotificationARNs`(스택 이벤트를 받을 SNS topic, 최대 5개), `Tags`
- 로컬 경로의 자식 템플릿은 `aws cloudformation package`가 S3에 올리고 `TemplateURL`을 S3 URL로 바꾼 템플릿을 만들어 준다. 콘솔이나 CLI로 직접 넣을 때는 S3 콘솔의 객체 URL을 쓴다
- 부모는 자식 출력을 `!GetAtt 자식논리ID.Outputs.출력이름`으로 읽는다. 업데이트는 root 스택에서 실행하며 템플릿이 바뀐 자식만 갱신된다

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
- `sam package`로 코드를 S3에 올리고 코드 위치를 S3로 바꾼 패키지 템플릿을 만든 뒤 `sam deploy --template-file`로 배포하던 두 단계 흐름은 이제 `sam deploy`가 암묵적으로 수행한다. 업로드 버킷은 `--s3-bucket` 또는 `--resolve-s3`로 정하고, 명령행 값은 `--save-params`로 `samconfig.toml`에 저장해 재사용한다.
- SAM은 별도 상태 관리 엔진이 아니다. 최종 stack, change set, rollback과 IAM 권한은 CloudFormation 동작을 따른다. SAM이 만든 함수와 역할도 스택 리소스라 스택을 지우면 함께 삭제된다.

### SAM의 정적 검사와 변경 세트 검토를 분리한다

2026-10-16 공식 SAM CLI 문서 기준, `sam validate --lint`는 cfn-lint 규칙으로 템플릿을 검사하며 설정 파일의 사용자 규칙과 검사 옵션도 적용한다. 검사 통과는 템플릿에 대한 결과이며 실제 계정의 배포 성공을 보장하지 않는다.

`sam deploy --no-execute-changeset`은 변경 세트를 만들고 적용하지 않은 채 종료한다. 따라서 로컬에서만 수행하는 검사로 취급하지 않는다. 운영 검토에서는 생성, 교체, 삭제와 IAM 변경을 확인하고 승인된 변경 세트를 실행한 뒤 스택 결과와 애플리케이션 동작을 별도로 확인한다. `--confirm-changeset`은 계산된 변경 세트를 배포할지 묻는 대화형 옵션이므로, 변경 세트 생성 후 종료하는 옵션과 구분한다.

이 절은 CLI 옵션의 동작만 대조했으며 실제 배포는 수행하지 않았다. 기존 본문의 나머지 버전 민감 주장은 재검증하지 않아 `verified_at`을 유지한다.

## Capabilities 확인 — IAM 리소스와 매크로

IAM 리소스를 만드는 템플릿은 권한 변경을 명시적으로 승인해야 한다. 대상은 `AWS::IAM::Role`, `Policy`, `ManagedPolicy`, `InstanceProfile`, `User`, `Group`, `AccessKey`, `UserToGroupAddition`이며, 승인 없이 생성, 업데이트를 요청하면 `InsufficientCapabilities` 오류로 실패한다. 콘솔은 IAM 리소스 생성 확인 체크박스로 같은 승인을 받는다.

| 값 | 필요한 경우 |
|---|---|
| `CAPABILITY_IAM` | IAM 리소스가 있을 때 |
| `CAPABILITY_NAMED_IAM` | 사용자 지정 이름의 IAM 리소스가 있을 때(이때는 필수) |
| `CAPABILITY_AUTO_EXPAND` | 매크로(`AWS::Serverless`, `AWS::Include` transform 포함)가 든 템플릿을 change set 검토 없이 바로 만들 때, 매크로와 nested stack이 함께 있을 때 |

- SAM 함수는 실행 역할을 자동으로 만들기 때문에 `sam deploy`에도 `--capabilities CAPABILITY_IAM`이 필요하다. `sam deploy`는 change set으로 배포하므로 SAM transform만으로는 `CAPABILITY_AUTO_EXPAND`가 필요 없고, nested application이 있을 때 추가한다
- 승인은 형식이 아니라 생성될 역할과 정책을 검토했다는 표시다. CI에서 capabilities를 고정해 넘길 때도 change set의 IAM 변경을 리뷰 대상으로 둔다

## Rollback 동작

- **생성 중 실패** — 기본적으로 **Automatic Rollback**. preserve successfully provisioned resources를 선택하면 성공 리소스를 유지하고 실패 리소스부터 재개 가능
- **업데이트 중 실패** — **Rollback on Update Failure** → 변경 전 상태로 복구
- 디버깅이 필요하면 Rollback을 비활성화하여 실패한 상태 그대로 유지 가능 (단, 비용 발생)

### UPDATE_ROLLBACK_FAILED 복구

2026-10-07 공식 문서로 확인한 복구 절차다. 업데이트 실패 뒤 이전 상태로 되돌리는 작업까지 실패하면 이 상태가 되며, 새 업데이트보다 롤백 복구가 먼저다.

1. 스택 Events에서 롤백 실패 원인을 확인하고 필요한 권한이나 리소스 상태를 복구한다. 일시적인 타임아웃은 변경 없이 재시도할 수 있다.
2. `aws cloudformation continue-update-rollback --stack-name <스택명>`으로 재개하고, 명령 종료만 보지 말고 스택이 `UPDATE_ROLLBACK_COMPLETE`에 도달했는지 확인한다.
3. 원인 해결이 어려울 때만 `--resources-to-skip`에 최소한의 논리 ID를 지정한다. 대상은 **롤백 중** `UPDATE_FAILED`가 된 리소스이며, 최초 업데이트 중 실패한 리소스를 무조건 지정하는 옵션이 아니다.
4. 건너뛴 리소스의 `UPDATE_COMPLETE` 표시는 실제 복구를 보장하지 않는다. 다음 업데이트 전에 템플릿과 실제 리소스의 불일치를 해소한다.

중첩 스택 내부 리소스는 `NestedStackName.ResourceLogicalID` 형식으로 지정한다. `AWS::CloudFormation::Stack` 리소스 자체를 건너뛸 때는 대응하는 자식 스택이 `DELETE_IN_PROGRESS`, `DELETE_COMPLETE`, `DELETE_FAILED` 중 하나여야 한다.

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
- IAM 리소스를 만드는 스택이 `InsufficientCapabilities`로 실패 → `CAPABILITY_IAM`, 이름을 붙인 IAM 리소스면 `CAPABILITY_NAMED_IAM`
- 리소스 생성 순서 제어 → `!Ref`, `!GetAtt`의 암묵적 의존성, 필요하면 `DependsOn`
- `AWS::*`, `Alexa::*` provider는 추가 요금 없음. third-party/private extension과 custom hook handler는 과금 가능

## 출처

- [Why is my CloudFormation stack stuck in an IN_PROGRESS state? — AWS re:Post](https://repost.aws/knowledge-center/cloudformation-stack-stuck-progress) — Resources, Events, 서비스 콘솔과 CloudTrail을 연결하는 절차를 검색 본문으로 확인
- [AWS CloudFormation — Protect CloudFormation stacks from being deleted](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-protect-stacks.html)
- [AWS CloudFormation — Prevent updates to stack resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html)
- [AWS CloudFormation — DeletionPolicy attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)
- [AWS CloudFormation — UpdateReplacePolicy attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)
- [AWS CloudFormation — Specify existing resources at runtime with CloudFormation-supplied parameter types](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html)
- [AWS CloudFormation — CreateChangeSet](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateChangeSet.html)
- [AWS CloudFormation — Execute a change set for a CloudFormation stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets-execute.html)
- [AWS CloudFormation — CloudFormation configuration properties reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html)
- [Delete stack instances from CloudFormation stack sets in closed or suspended AWS accounts — AWS re:Post](https://repost.aws/knowledge-center/cloudformation-removal-stacksets) — 검색 본문에서 계정 상태와 RetainStacks 조건 확인, 직접 열람은 403
- [AWS CloudFormation — DeleteStackInstances](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DeleteStackInstances.html)
- [AWS CloudFormation — DeploymentTargets](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DeploymentTargets.html)
- [AWS CloudFormation — Troubleshooting, Delete stack fails](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html#troubleshooting-errors-delete-stack-fails)
- [AWS CloudFormation — Delete a stack from the CloudFormation console](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-delete-stack.html)
- [AWS CloudFormation — DeleteStack API](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DeleteStack.html)
- [AWS CloudFormation — Custom resource request and response reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref.html)
- [AWS CloudFormation — Continue rolling back an update](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-continueupdaterollback.html)
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
- [AWS SAM — sam deploy](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html)
- [AWS SAM — Validate your AWS SAM applications with CloudFormation Linter](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/validate-cfn-lint.html)
- [AWS SAM — sam package](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-package.html)
- [AWS CloudFormation — CreateStack Capabilities](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateStack.html)
- [AWS CloudFormation — AWS::CloudFormation::Stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudformation-stack.html)
- [AWS CloudFormation — Nested stacks](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-nested-stacks.html)
- [AWS CloudFormation — Ref](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-ref.html)
- [AWS CloudFormation — DependsOn attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html)
- [Sungmin Kim 강사 — CloudFormation이란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90165)
- [Sungmin Kim 강사 — CloudFormation 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90166)
- [Sungmin Kim 강사 — Serverless Application Model](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90167)
- [Sungmin Kim 강사 — CloudFormation Nested Stack](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90170)
- [Sungmin Kim 강사 — CloudFormation과 SAM 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=90168)
- [Sungmin Kim 강사 — Code Pipeline 실습 1부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=75999)

## 관련 문서

- [[IaC]]
- [[EC2|EC2]]
- [[VPC]]
- [[IAM]]
- [[S3]]
