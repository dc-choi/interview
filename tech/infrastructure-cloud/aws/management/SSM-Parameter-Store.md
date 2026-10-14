---
tags: [infrastructure, aws, ssm, parameter-store, configuration, security]
status: done
category: "Infrastructure - AWS"
aliases: ["SSM Parameter Store", "Parameter Store", "Systems Manager Parameter Store"]
verified_at: 2026-10-14
---

# AWS Systems Manager Parameter Store

환경 이름, 엔드포인트, AMI ID 같은 **정적 구성값**을 중앙에서 관리하는 스토리지. `SecureString`도 지원하지만 DB 자격 증명, API 키, 토큰처럼 교체가 필요한 비밀은 Secrets Manager가 우선이다.

## 핵심

- 구성, 보안 데이터를 AWS 계정 내에 **중앙 집중화**
- 확장성, 내구성 보유 (SDK 사용 용이)
- 평문 또는 KMS 암호화 저장
- 매개변수는 만든 리전에서만 쓸 수 있고, 이름은 리전 안에서 고유하며 대소문자를 구분한다

## 설정을 코드 밖에 두는 이유

12 Factor는 배포마다 달라질 수 있는 모든 값을 설정으로 보고, 빌드에 그 배포의 설정을 결합한 것을 릴리스로 구분한다. 설정이 코드와 분리되어 있는지는 저장소를 당장 공개해도 자격 증명이 노출되지 않는지로 판정한다. Parameter Store는 이런 값을 코드 밖에 두는 저장소로 쓸 수 있고, ECS는 태스크를 시작할 때 값을 환경 변수로 주입한다([[ECS-Secrets-Injection|ECS 런타임 시크릿 주입]]). 수평 확장과 함께 보는 판정 질문은 [[Cloud-Migration-Strategies|클라우드 전환 전략]]에 있다.

## 매개변수 티어

| 티어 | 계정, 리전당 최대 개수 | 값 크기 | 매개변수 정책 | 계정 간 공유 | 비용 경계 |
|------|------------------------|---------|-----------------|------|-----------|
| **Standard** | 10,000 | 4 KB | X | X | 저장은 추가 요금 없음. 높은 처리량은 별도 과금 |
| **Advanced** | 100,000 | 8 KB | O (만료 정책 포함) | O | 과금 |

Standard는 Advanced로 바꿀 수 있지만 Advanced는 Standard로 되돌릴 수 없어 삭제 후 다시 만들어야 한다. 기본 티어를 Intelligent-Tiering으로 두면 4 KB 초과, 매개변수 정책 사용, 리전의 매개변수 10,000개 초과처럼 Advanced가 필요한 요청만 Advanced로 만든다.

## CloudFormation 통합

- CloudFormation이 Parameter Store의 매개변수를 **스택 입력 매개변수**로 활용 가능

## 작동 방식

1. 새로운 매개변수 생성
2. 매개변수 유형과 값 명시 (String / StringList / SecureString)
3. 코드/명령에서 매개변수 참조 (예: `{{resolve:ssm:/db/url}}`)

## 계층 경로와 조회 API

이름에 `/`로 경로를 넣어 `/<환경>/<서비스>/<항목>`처럼 묶는다. 계층은 최대 15단계이고 이름은 `aws`나 `ssm`으로 시작할 수 없다.

| API | 범위 | 주의 |
|---|---|---|
| `GetParameter` | 이름 하나 | `이름:버전`, `이름:레이블`로 특정 버전을 고른다 |
| `GetParameters` | 이름 최대 10개 | 없는 이름은 오류 대신 `InvalidParameters`로 돌아온다 |
| `GetParametersByPath` | 경로 아래 | `Recursive`를 켜면 하위 단계까지 읽는다. 한 번에 최대 10개이고 그보다 적게 와도 `NextToken`이 있으면 이어서 조회한다 |

이름을 이미 알면 `GetParameters`로 필요한 값만 묶어 읽고, 경로 아래 묶음 전체가 필요할 때 `GetParametersByPath`를 쓴다.

## 경로 단위 권한과 재귀 조회

IAM 정책의 `Resource`를 `arn:aws:ssm:<리전>:<계정>:parameter/<경로>/*`로 지정하면 경로 단위로 읽기와 쓰기 권한을 나눌 수 있다. `SecureString`을 복호화하려면 해당 키의 `kms:Decrypt` 권한도 있어야 하며, 고객 관리형 키는 IAM 정책과 키 정책으로 이 권한을 관리한다.

`GetParametersByPath`를 재귀로 호출하면 상위 경로에 접근할 수 있는 주체는 그 아래 모든 단계를 본다. `/a` 권한이 있으면 IAM에서 `/a/b`를 명시적으로 거부해도 `/a`를 재귀 조회해 `/a/b`를 읽을 수 있다. 하위 경로의 Deny로 접근을 막는 설계에 기대지 말고, 읽는 주체가 다른 값은 처음부터 다른 최상위 경로로 나눈다(설계 점검).

## 버전과 레이블

`PutParameter`의 `Overwrite` 기본값은 꺼져 있어 기존 이름에 다시 쓰면 `ParameterAlreadyExists`로 실패한다. 덮어쓸 때마다 버전이 1씩 늘고, `GetParameterHistory`로 이전 값과 레이블을 조회한다. 계층 경로의 매개변수는 유형을 바꿀 수 없으므로 `String`을 `SecureString`으로 바꾸려면 새 매개변수를 만든다.

- **보존 한도:** 버전은 최대 100개까지 남는다. 새 버전을 만들면 가장 오래된 버전이 지워지지만, 그 버전에 레이블이 있으면 지우지 않고 새 버전 생성이 `ParameterMaxVersionLimitExceeded`로 실패한다. 레이블을 새 버전으로 옮긴 뒤 다시 쓴다.
- **레이블 규칙:** 레이블은 특정 버전의 별칭이다. 한 버전에 최대 10개를 붙이고, 같은 매개변수의 두 버전에 같은 레이블을 붙일 수 없으며, 다른 버전으로 옮길 수 있다. 매개변수를 만들 때는 붙일 수 없다.
- **고정 조회:** `이름:버전`이나 `이름:레이블`로 조회하면 그 값이 고정된다. 없는 버전을 지정하면 최신 값으로 대체되지 않고 실패한다.
- **승격과 되돌리기:** 읽는 쪽이 `이름:production`처럼 레이블을 참조하면 승인한 버전으로 레이블을 옮겨 값을 승격하고, 이전 버전으로 옮겨 되돌릴 수 있다(설계 예시). 통합 기능마다 레이블 지원이 다르며 CloudFormation의 `ssm` 동적 참조는 레이블을 지원하지 않는다.

## SecureString 암호화와 복호화 권한

- 키를 지정하지 않으면 Systems Manager가 계정에 만든 AWS 관리형 키 `aws/ssm`을 쓴다. 이 키에는 접근 제어 정책을 직접 설정할 수 없으므로 키 정책으로 복호화 주체를 나누려면 고객 관리형 키를 쓴다. 대칭 KMS 키만 지원한다.
- Standard `SecureString`(최대 4,096바이트)은 KMS `Encrypt`로 직접 암호화하고 Advanced는 AWS Encryption SDK의 봉투 암호화를 쓴다([[KMS]]).
- `WithDecryption` 없이 조회하면 암호문이 돌아온다. 켜면 Parameter Store가 호출자를 대신해 KMS `Decrypt`를 호출한다.
- KMS 요청에는 매개변수 ARN이 `PARAMETER_ARN` encryption context로 들어간다. 이 값은 CloudTrail 같은 감사 로그에 평문으로 남아 어떤 매개변수를 복호화했는지 식별하는 데 쓰이고, IAM 정책의 `kms:EncryptionContext:PARAMETER_ARN` 조건으로 복호화할 수 있는 매개변수를 좁힐 수 있다.

## 처리량 한도와 시작 시점 조회

처리량은 계정과 리전 단위의 TPS 한도이며 티어와 별개 설정이다.

| API | 기본 처리량 | 높은 처리량 |
|---|---|---|
| `GetParameter`, `GetParameters`, `GetParametersByPath` | 세 API 합산 40 TPS | 각각 10,000, 1,000, 100 TPS |
| `PutParameter`, `DescribeParameters`, `GetParameterHistory`, 레이블 작업 | 3 TPS | 10 TPS |
| `DeleteParameter`, `DeleteParameters` | 3 TPS | 5 TPS |

Auto Scaling이 인스턴스를 한꺼번에 늘리거나 ECS 서비스 업데이트로 대체 태스크가 동시에 시작하면서 각자 설정을 읽으면 기본 한도를 넘어 `ThrottlingException`이 날 수 있다. ECS의 `secrets` 주입도 실행 역할로 `ssm:GetParameters`를 호출하므로 같은 계정과 리전의 한도를 쓴다고 보고 배포 규모와 함께 점검한다.

- 같은 값은 애플리케이션에서 일정 시간 캐시한다. Lambda는 Parameters and Secrets Lambda Extension의 로컬 캐시를 쓸 수 있다.
- 경로 전체를 반복해 읽지 않고 필요한 이름만 `GetParameters`로 읽는다.
- 많은 인스턴스나 태스크가 같은 초에 읽지 않도록 시작 시점의 조회를 분산한다.
- 그래도 한도에 걸리면 높은 처리량을 켠다. 언제든 켜고 끌 수 있고, 켜면 Standard 매개변수 조회도 API 상호작용 1만 건당 0.05달러가 부과된다. 상호작용은 요청이 다룬 매개변수 수로 세므로 한 요청이 10개를 돌려주면 10건이다. Advanced 매개변수의 상호작용은 기본 처리량에서도 같은 단가로 과금된다.

## 공개 매개변수

일부 AWS 서비스는 공통 산출물 정보를 `/aws/service/` 아래 공개 매개변수로 게시한다. ECS 최적화 AMI의 최신 권장값은 `/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended`에 AMI ID, 이미지 이름, 컨테이너 에이전트 버전 등을 담은 JSON으로 있고, 하위 매개변수 `recommended/image_id`는 AMI ID만 돌려준다.

```bash
aws ssm get-parameters \
  --names /aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id \
  --query "Parameters[0].Value"
```

CloudFormation에서 `AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>` 유형의 기본값이나 버전 없는 `ssm` 동적 참조로 이 이름을 쓰면 스택을 만들거나 갱신할 때 최신 값을 읽는다. 같은 템플릿도 배포 시점마다 다른 AMI를 고를 수 있으므로, 재현이 필요하면 특정 AMI 이름의 매개변수를 참조하거나 해석된 AMI ID를 배포 기록에 남긴다(운영 제안).

## Secrets Manager와 비교

| 측면 | Parameter Store | Secrets Manager |
|------|-----------------|-----------------|
| **비용** | Standard 저장은 추가 요금 없음. Advanced, 높은 처리량은 과금 | 비밀 수와 API 호출량에 따라 과금 |
| **자동 교체** | 기본 제공 X | O |
| **RDS 통합** | X | O |
| **사용처** | 일반 설정값, API 키, 환경 정보 | DB 자격 증명, 회전 필요 비밀 |

## 시험 빈출 포인트

- "**환경 변수, 설정값** 저장" → Parameter Store
- "회전 필요 없으면" → Parameter Store (저렴)
- "회전 필요" → Secrets Manager
- "CloudFormation 스택 매개변수 외부 관리" → Parameter Store

## 관련 문서

- [[Secrets-Manager]], [[KMS]], [[CloudFormation]], [[Systems-Manager]], [[ECS-Secrets-Injection]], [[Cloud-Migration-Strategies]]

## 출처

- [AWS Systems Manager, Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Systems Manager pricing](https://aws.amazon.com/systems-manager/pricing/)
- [AWS Secrets Manager, What is AWS Secrets Manager?](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS Systems Manager, Choosing parameter tiers in Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html)
- [AWS Systems Manager, Working with parameter hierarchies in Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html)
- [AWS Systems Manager API Reference, GetParameters](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParameters.html)
- [AWS Systems Manager API Reference, GetParametersByPath](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html)
- [AWS Systems Manager API Reference, PutParameter](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html)
- [AWS Systems Manager, Working with parameter versions in Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-versions.html)
- [AWS Systems Manager, Working with parameter labels in Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html)
- [AWS Systems Manager, AWS KMS encryption for Parameter Store SecureString parameters](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html)
- [AWS Systems Manager, Managing Parameter Store throughput](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-throughput.html)
- [AWS Systems Manager, Working with public parameters in Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters.html)
- [Amazon ECS, Retrieving Amazon ECS-optimized Linux AMI metadata](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html)
- [AWS CloudFormation, Get a plaintext value from Systems Manager Parameter Store](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html)
- [The Twelve-Factor App, III. Config](https://12factor.net/config)
- [The Twelve-Factor App, V. Build, release, run](https://12factor.net/build-release-run)
- [AWS System Manager : Parameter Store를 사용한 AWS 구성 데이터 관리 기법 — Amazon Web Services Korea](https://www.youtube.com/watch?v=tx8RgakkTIU)
