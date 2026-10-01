---
tags: [cicd, aws, codedeploy, codepipeline, codebuild, deployment]
status: done
verified_at: 2026-09-30
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["AWS Code Services", "AWS CodeDeploy CodePipeline CodeBuild", "AWS Code 시리즈 운영"]
---

# AWS Code 시리즈 운영 — CodeDeploy, CodePipeline, CodeBuild

[[CICD-Tool-Selection|CI/CD 툴 선택]]의 AWS 관리형 파이프라인 절에서 떼어 낸 운영 상세다. 서비스 간 책임 분리와 CodeCommit 제공 상태는 부모 문서에 두고, 여기서는 EC2 배포를 실제로 돌릴 때 필요한 전제, 배포 구성의 성공 판정, lifecycle hook, S3 source와 Docker image build의 함정을 다룬다.

## CodeDeploy EC2 배포의 전제

- **instance profile**: agent가 revision이 있는 S3 bucket이나 GitHub에서 bundle을 받는 권한이다. AWS 예시는 `s3:Get*`, `s3:List*`를 주되 대상 bucket과 agent 설치, 업데이트용 `aws-codedeploy-<region>` bucket으로 좁히라고 권한다. Systems Manager로 agent를 설치하면 `AmazonSSMManagedInstanceCore`도 붙인다.
- **service role**: CodeDeploy가 API를 호출하고 instance와 load balancer를 다루도록 deployment group에 연결하는 역할이다.
- **agent**: EC2와 on-premises 배포에만 필요하고 ECS, Lambda 배포에는 쓰지 않는다. agent는 HTTPS 443으로 나가는 연결만 쓴다. 2026-07-15의 2.0.0부터 Rust 기반 단일 binary라 Ruby가 필요 없고, 설치 script는 regional bucket의 `latestv2/`, Systems Manager Distributor package는 `AWSCodeDeployAgentV2`다. `latest/`는 Ruby가 필요한 1.8.x를 계속 설치하며, 2.x는 opt-in이라 모든 리전에 아직 없을 수 있고 1.8.x에서 자동 업데이트되지 않는다.
- **대상과 revision**: deployment group은 EC2 tag나 Auto Scaling group으로 instance를 고르고 in-place 또는 blue/green을 정한다. revision은 `aws deploy push`처럼 bundle을 zip으로 S3에 올려 등록한다. 로컬 CLI에는 장기 access key보다 역할 기반의 짧은 자격 증명을 쓴다.

## 배포 구성과 성공 판정

EC2와 on-premises의 배포 구성은 배포 중 유지할 minimum healthy hosts(선택적으로 AZ별 값)를 정한다. 지정하지 않으면 `CodeDeployDefault.OneAtATime`이다. 미리 정의된 구성의 성공 판정은 직관과 다르다.

| 구성 | in-place 동작 | 전체 성공 조건 (9대 예) |
|---|---|---|
| `AllAtOnce` | 가능한 많은 instance에 동시에 배포하므로 서비스가 중단될 수 있다 | 한 대라도 성공하면 Succeeded, 9대 모두 실패해야 Failed |
| `HalfAtATime` | 최대 절반(내림), 즉 4대씩 배포 | 절반 이상(올림), 즉 5대 이상 성공 |
| `OneAtATime` | 한 대씩 배포 | 앞의 8대가 모두 성공. 마지막 한 대의 실패는 성공으로 처리 |

- `AllAtOnce`의 Succeeded는 서비스 정상의 근거가 아니다. instance별 결과와 health check를 따로 확인한다.
- 여러 Auto Scaling group에 걸치면 `HalfAtATime`의 절반은 group과 무관하게 전체 기준이라 한 group에만 배포되고도 성공할 수 있다.
- ECS와 Lambda는 minimum healthy hosts 대신 canary, linear, all-at-once traffic shifting 구성을 쓴다.
- 자동 롤백은 배포 실패나 CloudWatch 경보 조건에서 마지막 정상 revision을 새 배포로 다시 배포한다. in-place 롤백은 이 재배포를 거치므로 [[Blue-Green|Blue-Green]]의 트래픽 되돌리기보다 느리고, 이전 script가 만든 파일 같은 부작용은 되돌리지 않는다.

## AppSpec와 lifecycle hook

AppSpec file은 revision의 파일을 어디에 배치하고 배포 생명주기의 어느 시점에 검증, 전환 스크립트를 실행할지 정하는 배포 계약이다.

- EC2와 on-premises 배포의 AppSpec은 항상 YAML이며 `files`, `permissions`, `hooks`로 복사와 script 실행을 정의한다.
- Lambda와 ECS 배포는 YAML 또는 JSON을 사용하고 traffic routing 구성과 validation Lambda hook을 연결한다.
- 지원하는 hook 이름과 실행 순서는 EC2, Lambda, ECS마다 다르다. 하나의 공통 hook 순서를 암기하지 말고 compute platform별 공식 표를 기준으로 작성한다.
- hook script는 timeout, 실행 사용자, 로그 위치와 재실행 안전성을 명시하고 실패 시 배포가 어느 상태에서 멈추는지 검증한다.

EC2 in-place 배포의 hook 순서는 다음과 같다. 대괄호 구간은 deployment group에 CLB, ALB 또는 NLB를 지정했을 때만 적용되며, load balancer에서 instance를 등록 해제하고 검증 뒤 다시 등록하는 구간이다.

```text
[BeforeBlockTraffic → BlockTraffic → AfterBlockTraffic]
→ ApplicationStop → DownloadBundle → BeforeInstall → Install → AfterInstall
→ ApplicationStart → ValidateService
→ [BeforeAllowTraffic → AllowTraffic → AfterAllowTraffic]
```

- `DownloadBundle`, `Install`, `BlockTraffic`, `AllowTraffic`은 agent 예약 이벤트라 script를 걸 수 없다. `Install`에서 복사할 대상은 `files` 절로 정한다.
- `ApplicationStop`은 직전에 성공한 revision의 AppSpec과 script를 실행한다. 첫 배포에서는 돌지 않고, 잘못 배포된 중지 script가 다음 배포를 실패시킬 수 있다.
- `BeforeInstall`은 복호화와 현재 버전 백업, `AfterInstall`은 설정과 파일 권한 변경, `ApplicationStart`는 `ApplicationStop`에서 멈춘 service의 재시작, `ValidateService`는 배포 검증에 쓴다.
- script 성공은 종료 코드 0으로 판정한다. 중간 명령의 실패를 삼키지 않는 원칙은 [[Single-Host-SPA-API-Deployment-SSH-Workflow#녹색 표시는 마지막 명령의 종료 코드다|SSH 배포 script]]와 같다. hook의 timeout은 기본값과 이벤트당 최대치가 모두 3600초다.

## CodePipeline S3 source

- S3 source action은 versioning을 켠 bucket과 object key를 지정하고 source를 zip 하나로 올린다. zip이 아닌 단일 파일도 올릴 수 있지만 zip을 기대하는 후속 action은 실패한다. 같은 key에 새 버전을 올리면 pipeline이 시작되고, 실행의 source revision은 object의 ETag와 version ID로 표시된다.
- console로 만들면 bucket 변경 때 pipeline을 시작하는 EventBridge 규칙이 생긴다. CLI나 CloudFormation에서 `PollForSourceChanges`를 생략하면 polling이 기본이라 event 규칙까지 두면 실행이 중복된다. event 기반이면 `false`로 둔다.
- source action은 교차 리전으로 만들 수 없고 artifact bucket은 pipeline 리전에 있어야 한다. 다른 리전의 action마다 그 리전의 artifact bucket이 필요하므로 source bucket, pipeline과 배포 대상 리전을 맞추면 구성이 단순하다.
- build가 필요 없는 bundle이면 build stage를 건너뛴 source와 deploy 두 단계로도 충분하다.
- 실습 뒤에는 CloudFormation stack, CodeDeploy application, pipeline과 bucket을 지워 비용이 남지 않게 한다.

## CodeBuild로 Docker image를 만들어 ECR에 push

- buildspec은 기본으로 source root의 `buildspec.yml`을 찾고 `version: 0.2`를 권한다. phase는 `install`, `pre_build`, `build`, `post_build` 순이며 보통 `pre_build`에서 `aws ecr get-login-password | docker login`, `build`에서 build와 tag, `post_build`에서 push를 한다.
- 공식 문서는 Docker image를 build하는 project에 privileged mode를 켜라고 안내한다. 켜지 않으면 Docker daemon과 통신하는 build가 실패할 수 있다. VPC build와 Windows의 조건은 문서로 따로 확인한다.
- 첫 build가 ECR 로그인에서 실패하면 대개 service role 권한 문제다. push에는 `ecr:GetAuthorizationToken`(Resource `*`)과 대상 repository ARN으로 좁힌 `BatchCheckLayerAvailability`, `InitiateLayerUpload`, `UploadLayerPart`, `CompleteLayerUpload`, `PutImage`, `BatchGetImage`가 필요하다. 관리형 정책을 통째로 붙이기보다 이 범위로 제한한다. 로그인 token은 12시간 유효하다.
- phase 전이는 비대칭이다. `pre_build`가 실패하면 `build`와 `post_build`를 건너뛰고 끝나지만 `build`가 실패해도 `post_build`는 실행된다. push 전에 `CODEBUILD_BUILD_SUCCEEDING`이 1인지 확인하거나 `build`에 `on-failure: ABORT`를 둔다.
- mutable repository에 같은 tag(`latest`)를 다시 push하면 tag가 새 image로 옮겨 가고 이전 image는 tag 없이 남는다. 누적은 lifecycle policy의 untagged 규칙으로 정리하고 release tag 덮어쓰기는 tag immutability로 막는다 ([[ECR|Amazon ECR]]). 배포는 tag보다 digest로 고정한다 ([[Docker-Image-Pipeline|Docker image pipeline]]).
- 관리형 build image는 계속 바뀐다. 2026-09-30 기준 Ubuntu 계열은 `aws/codebuild/standard:5.0`부터 Ubuntu 24.04 기반 `8.0`까지 있으므로 새 project는 공식 목록에서 고른다. 전체 build log는 CloudWatch Logs로 남겨 실패 원인을 추적한다.

## 출처

- [AWS CodeDeploy — Deployment configurations](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html)
- [AWS CodeDeploy — Create an IAM instance profile](https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html)
- [AWS CodeDeploy — Working with the CodeDeploy agent (version history)](https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent.html)
- [AWS CodeDeploy — Install the agent for Amazon Linux or RHEL](https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent-operations-install-linux.html)
- [AWS CodeDeploy — AppSpec files](https://docs.aws.amazon.com/codedeploy/latest/userguide/application-specification-files.html)
- [AWS CodeDeploy — AppSpec hooks](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html)
- [AWS CodeDeploy — Redeploy and roll back a deployment](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html)
- [AWS CodePipeline — Amazon S3 source action reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-S3.html)
- [AWS CodePipeline — Add a cross-region action](https://docs.aws.amazon.com/codepipeline/latest/userguide/actions-create-cross-region.html)
- [AWS CodeBuild — Create a build project (privileged mode)](https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html)
- [AWS CodeBuild — Docker sample](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html)
- [AWS CodeBuild — Build phase transitions](https://docs.aws.amazon.com/codebuild/latest/userguide/view-build-details-phases.html)
- [AWS CodeBuild — Environment variables in build environments](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html)
- [AWS CodeBuild — EC2 compute images](https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html)
- [Amazon ECR — IAM permissions for pushing an image](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html)
- [Amazon ECR — Private registry authentication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)
- [Sungmin Kim 강사 — CodeDeploy](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=66574)
- [Sungmin Kim 강사 — CodeDeploy 실습 1부 (입문)](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=67219)
- [Sungmin Kim 강사 — CodeDeploy 실습 2부 (입문)](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=67874)
- [Sungmin Kim 강사 — CodeDeploy Life Cycle Event Hooks](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=76001)
- [Sungmin Kim 강사 — CodeDeploy 실습 1부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=76256)
- [Sungmin Kim 강사 — CodeDeploy 실습 2부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=76218)
- [Sungmin Kim 강사 — CodePipeline 실습 1부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=75999)
- [Sungmin Kim 강사 — CodePipeline 실습 2부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=76000)
- [Sungmin Kim 강사 — ECS + ECR + CodeBuild 실습 1부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=85083)
- [Sungmin Kim 강사 — ECS + ECR + CodeBuild 실습 2부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=85084)
- [Sungmin Kim 강사 — ECS + ECR + CodeBuild 실습 2부 보충영상](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=231771)

## 관련 문서

- [[CICD-Tool-Selection|CI/CD 툴 선택]]
- [[CI-Tool-Selection|CI 도구 비교]]
- [[Blue-Green|Blue-Green 배포]]
- [[ECR|Amazon ECR]]
- [[Docker-Image-Pipeline|Docker image pipeline]]
- [[Systems-Manager|Systems Manager]]
