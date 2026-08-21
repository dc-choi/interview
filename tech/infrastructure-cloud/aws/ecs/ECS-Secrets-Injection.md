---
tags: [infrastructure, aws, ecs, security, secrets, iam]
status: done
verified_at: 2026-08-21
category: "Infrastructure - AWS"
aliases: ["ECS Secrets Injection", "ECS 시크릿 주입", "ECS 런타임 시크릿"]
---

# ECS 런타임 시크릿 주입

> 상위 문서: [[ECS|Amazon ECS]]

DB 비밀번호나 API 키를 태스크 정의에 평문으로 적는 대신 Secrets Manager나 SSM Parameter Store에서 기동 시점에 끌어오는 구조. 누가 값을 가져오는지(Task Execution Role), 언제 가져오는지(컨테이너 최초 기동), 갱신하면 무슨 일이 생기는지가 핵심이다.

## 주입 지점 세 곳

| 위치 | 용도 |
|---|---|
| `containerDefinitions.secrets` | 컨테이너 환경변수로 주입 |
| `logConfiguration.secretOptions` | 로그 백엔드 인증이 필요한 드라이버 |
| `repositoryCredentials` | AWS 밖 프라이빗 레지스트리 인증 |

기본형은 `secrets`다. `name`은 컨테이너 안에서 쓸 환경변수 이름, `valueFrom`은 값이 있는 곳의 참조다.

```json
{
  "secrets": [
    { "name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:111122223333:secret:prod/db-AbCdEf" },
    { "name": "API_KEY",     "valueFrom": "arn:aws:ssm:ap-northeast-2:111122223333:parameter/prod/api-key" }
  ]
}
```

## valueFrom 문법

Secrets Manager는 콜론으로 이어지는 확장 형식을 받는다.

```
arn:aws:secretsmanager:<region>:<account-id>:secret:<secret-name>:<json-key>:<version-stage>:<version-id>
```

- `json-key`를 주면 JSON 시크릿에서 그 키의 값만 주입하고, 생략하면 시크릿 전체 문자열이 들어간다.
- `version-stage`와 `version-id`는 함께 쓸 수 없고, 둘 다 생략하면 `AWSCURRENT` 라벨의 버전을 가져온다.
- 뒷자리를 안 쓰더라도 콜론 자리는 남겨야 한다. 키만 지정하면 `...:username1::`, 버전 ID만 지정하면 `...:::9d4cb84b-...` 형태다.

SSM Parameter Store는 태스크와 같은 리전이면 파라미터 이름이나 전체 ARN 중 아무거나 쓸 수 있고, 다른 리전이면 전체 ARN이어야 한다.

## Task Execution Role과 Task Role

시크릿을 가져오는 주체는 앱이 아니라 에이전트다. 두 역할을 섞으면 바로 실패한다.

| 역할 | 사용 주체 | 쓰이는 순간 |
|---|---|---|
| **Task Execution Role** | ECS, Fargate 에이전트 | 이미지 pull, `awslogs` 전송, 시크릿 조회 |
| **Task Role** | 컨테이너 안 애플리케이션 | 앱 코드가 호출하는 AWS API(S3, DynamoDB 등) |

공식 문서는 실행 역할의 권한이 에이전트에게 임시 자격증명 형태로 전달될 뿐 컨테이너에서 직접 접근 가능한 것은 아니라고 명시한다. 즉 실행 역할에 S3 권한을 붙여도 앱은 그 권한을 쓰지 못한다.

실행 역할에 추가해야 하는 액션은 참조 대상에 따라 다르다.

| 참조 대상 | 필요 액션 |
|---|---|
| Secrets Manager 시크릿 | `secretsmanager:GetSecretValue` |
| SSM 파라미터 | `ssm:GetParameters` |
| SSM 파라미터가 다시 Secrets Manager를 참조 | `ssm:GetParameters` + `secretsmanager:GetSecretValue` |
| 고객 관리 KMS 키로 암호화된 값 | 위 권한 + 해당 키 ARN에 대한 `kms:Decrypt` |

기본 KMS 키를 쓰면 `kms:Decrypt`를 따로 줄 필요가 없다. 관리형 정책 `AmazonECSTaskExecutionRolePolicy`에는 시크릿 조회 권한이 없으므로 인라인 정책으로 리소스 ARN을 좁혀 붙인다. SSM 파라미터를 참조하는 EC2 시작 유형 태스크에는 에이전트 설정 `ECS_ENABLE_AWSLOGS_EXECUTIONROLE_OVERRIDE=true`가 추가로 필요하고, `awslogs` 드라이버를 쓰는 Windows 태스크도 같은 변수를 요구한다.

## 회전하면 실행 중 태스크는 어떻게 되는가

값은 **컨테이너가 최초로 기동할 때 한 번** 주입된다. 이후 시크릿이 갱신되거나 회전해도 이미 돌고 있는 컨테이너는 새 값을 받지 못한다. 반영하려면 서비스는 force new deployment, 단독 태스크는 정지 후 재시작이다.

운영에서 이 성질이 만드는 결과는 세 가지다.

- 회전 주기와 배포 주기가 어긋나면 옛 자격증명을 쥔 태스크가 남는다. Secrets Manager는 회전 시 버전에 `AWSCURRENT`, `AWSPREVIOUS` 같은 스테이징 라벨을 붙여 관리하므로 회전 직후 옛 값이 잠시 유효할 수 있지만, 유효 기간은 회전 전략에 달렸다. 앱에 인증 실패 재시도와 재연결이 없으면 회전이 곧 장애다.
- `valueFrom`에 `version-id`나 `version-stage`를 고정하면 회전해도 그 버전만 계속 가져온다. 자동 회전을 쓸 거라면 기본 `AWSCURRENT`를 그대로 두는 편이 맞다.
- 재배포 없이 최신 값이 필요하면 주입 대신 앱이 SDK로 직접 조회하고 권한을 Task Role에 준다. 대신 캐싱, 호출량, 조회 실패 처리를 앱이 떠안는다. 회전 빈도와 재기동 비용을 보고 고르는 트레이드오프다.

플랫폼 요건도 걸린다. Fargate에서 시크릿 전체를 주입하려면 플랫폼 버전 1.3.0 이상, JSON 키나 특정 버전을 지정하려면 1.4.0 이상(Linux) 또는 1.0.0(Windows)이 필요하다. EC2에서는 컨테이너 에이전트 1.22.0 이상, 키와 버전 지정은 1.37.0 이상이다. 프라이빗 서브넷에서 NAT 없이 쓰려면 Secrets Manager와 Systems Manager 인터페이스 VPC 엔드포인트를 둔다.

## 평문 environment가 새는 경로

`environment`에 넣은 값은 태스크 정의의 일부다. 태스크 정의는 `DescribeTaskDefinition` 응답과 콘솔 화면에 그대로 나오므로, `ecs:DescribeTaskDefinition` 권한만 있는 사람이면 누구나 읽는다. 공식 문서도 자격증명 같은 민감 정보에 평문 환경변수를 쓰지 말라고 명시한다. 여기에 두 가지가 더 붙는다.

- 태스크 정의는 리비전 단위로 쌓인다. 한 번 평문으로 등록했다면 값을 `secrets`로 바꾸는 것만으로는 부족하고 시크릿 자체를 회전해야 한다.
- `docker inspect`와 로그로도 환경변수가 드러난다.

`secrets`로 주입해도 컨테이너 안에서는 결국 환경변수이므로, 앱과 컨테이너 로그와 디버깅 도구는 값을 볼 수 있다. 공식 문서가 이 잔여 위험을 인정하면서 제시하는 대안이 두 가지다. 암호화된 S3 버킷에 두고 Task Role로 접근을 좁혀 앱이 직접 읽는 방식, 그리고 사이드카가 시크릿을 공유 볼륨에 쓰고 컨테이너 순서 제어로 앱보다 먼저 끝나게 하는 방식이다. 볼륨은 태스크 범위라 태스크가 끝나면 함께 삭제된다.

## 빌드 타임 자격증명과의 경계

런타임 시크릿과 배포 파이프라인의 AWS 자격증명은 다른 문제다. 태스크 정의의 `secrets`는 앱이 쓸 값이고, GitHub Actions가 ECR에 푸시하고 ECS 서비스를 갱신할 때 쓰는 자격증명은 OIDC 기반 `AssumeRoleWithWebIdentity`로 발급받는 임시 자격증명이어야 한다. 장기 액세스 키를 리포지토리 시크릿에 두면 회전도 폐기도 사람 손에 남는다. 신뢰 정책의 `sub` 조건 설계는 [[IAM-Role-Federation|IAM Role, AssumeRole과 Federation]] 참고.

## 면접 체크포인트

- Task Execution Role과 Task Role의 경계, 실행 역할 권한이 컨테이너에 직접 노출되지 않는다는 점
- Secrets Manager 참조에는 `secretsmanager:GetSecretValue`, SSM 참조에는 `ssm:GetParameters`, 고객 관리 키에는 `kms:Decrypt`가 추가로 필요하다는 점
- 시크릿은 기동 시 1회 주입이고 회전 반영에는 새 태스크 기동이 필요하다는 점
- 재배포 없는 즉시 반영이 요건이면 주입 대신 앱의 직접 조회 + Task Role로 옮긴다는 판단
- 평문 `environment`가 `DescribeTaskDefinition`으로 읽히고 리비전에 남는다는 점
- `secrets`를 써도 컨테이너 내부 노출은 남으므로 S3나 사이드카 볼륨 방식이 더 강한 격리라는 점

## 출처

- [Pass sensitive data to an Amazon ECS container — 주입 지점, 회전 시 재배포, S3와 사이드카 대안](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)
- [Pass Secrets Manager secrets through Amazon ECS environment variables — valueFrom 형식, 플랫폼 요건](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html)
- [Pass Systems Manager parameters through Amazon ECS environment variables — 이름 대 ARN, 리전 조건](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html)
- [Amazon ECS task execution IAM role — 필요 액션과 정책 예시](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)
- [Amazon ECS task definition parameters — environment, secrets 필드 설명](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
- [DescribeTaskDefinition API — 태스크 정의 전체 반환](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTaskDefinition.html)

## 관련 문서

- [[ECS|Amazon ECS]]
- [[ECS-Rolling-Deployment|ECS 롤링 배포 메커니즘]]
- [[Secrets-Manager|AWS Secrets Manager]]
- [[SSM-Parameter-Store|SSM Parameter Store]]
- [[KMS|KMS]]
- [[IAM-Role-Federation|IAM Role, AssumeRole과 Federation]]
