---
tags: [aws, sagemaker, unified-studio, ci-cd, deployment, airflow, data-pipeline]
status: done
verified_at: 2026-11-09
category: "Infrastructure - AWS"
aliases: ["SageMaker Unified Studio CI/CD CLI", "aws-smus-cicd-cli", "SageMaker Unified Studio 배포 자동화"]
---

# SageMaker Unified Studio의 CI/CD CLI

SageMaker Unified Studio(SMUS)의 데이터와 AI 애플리케이션은 Glue job, Athena, Airflow workflow, QuickSight 대시보드처럼 여러 서비스의 자원을 함께 쓴다. 이런 애플리케이션을 dev에서 test, prod로 옮기려면 단계마다 서비스별 설정을 바꾸고 자원을 의존 순서대로 만들어야 한다. CI/CD CLI(`aws-smus-cicd-cli`)는 이 과정을 manifest 하나로 선언하고 명령으로 실행하게 하는 오픈 소스 명령줄 도구다. 2026-11-09에 AWS 문서, 공지, 블로그와 GitHub README를 대조했으며 실제 계정에서 실행하지 않았다.

## 역할 분담

- 데이터 팀은 애플리케이션을 `manifest.yaml`에 한 번 정의한다. 무엇을 배포할지(content)와 단계별 대상(stages)을 적는다.
- DevOps 팀은 같은 manifest로 대상 단계에 배포한다. 설정 치환, 의존 순서와 자원 생성은 CLI가 맡는다.
- 단계 하나는 전용 SMUS project 하나에 대응한다. 단계마다 domain, 계정과 리전이 다를 수 있다.

## Manifest 구조

| 위치 | 내용 |
| --- | --- |
| `applicationName` | 애플리케이션 이름 |
| `content` | 배포할 대상. 주요 키는 `storage`(파일 묶음과 S3 connection), `git`(저장소), `quicksight`(대시보드), `workflows`(Airflow workflow와 connection), `catalog`(SageMaker Catalog 자원), `notebooks`(bundle-deploy 모드 전용) |
| `stages.<이름>` | 단계별 `domain`(id, name, tags 중 하나로 식별, region 필수), `project`(name, README 예시의 `owners` 목록, 선택적 role), `environment_variables`, `deployment_configuration`(대상 connection, 디렉터리, 압축, 덮어쓸 parameter) |
| `stages.<이름>.bootstrap.actions` | deploy 안에서 순서대로 실행할 작업. workflow 생성과 실행, QuickSight dataset refresh, EventBridge 이벤트 발행, DataZone connection 생성 등 |

Manifest schema 문서와 README 예시는 bootstrap을 단계 아래에 둔다. Bootstrap action 문서에는 최상위에 둔 예시도 있으므로 단계 아래에 쓰는 형태를 기준으로 삼는다. 구조상 추론으로, 단계 아래에 두면 같은 애플리케이션이라도 test에서는 workflow를 바로 실행하고 prod에서는 생성만 하도록 단계별로 다르게 적을 수 있다.

Bootstrap의 실행 시점도 자료마다 다르다. 데모와 CLI 명령 문서는 deploy가 파일 업로드(Bundle Deployment)를 마친 뒤 마지막 단계에서 bootstrap action을 실행한다고 적고, bootstrap action 문서의 이벤트 처리 절은 bundle 배포 전 bootstrap 단계에서 순서대로 처리한다고 적는다. 업로드한 파일에 의존하는 action은 실제 순서를 시험 단계에서 확인한다.

Workflow 정의는 Python DAG 대신 YAML로 쓴 Airflow DAG를 쓸 수 있다. 정의 안에서는 `{proj.connection.default.s3_shared.s3Uri}`, `{domain.region}`, `{env.<이름>}`, `{stage.name}` 같은 placeholder로 project connection과 단계 값을 참조하고, manifest의 `${AWS_REGION}` 같은 변수와 함께 배포 시점에 대상 단계의 값으로 바뀐다. 그래서 dev의 버킷 이름이나 계정 ID를 코드에 박지 않는다. `{env.<이름>}`은 manifest의 `environment_variables`를 읽는다. Manifest schema는 workflow 파일 변수도 `${...}` 형태로 적어 README 예시의 `{...}`와 다르므로, 실제로 동작하는 예시 표기를 따르고 시험 단계에서 치환 결과를 확인한다. 두 표기의 우선순위와 `${...}`가 OS 환경 변수를 읽는지는 확인한 자료에 적혀 있지 않다.

## 명령

AWS Big Data Blog의 명령 표는 다음 9개를 싣는다.

| 명령 | 하는 일 |
| --- | --- |
| `describe` | manifest를 검증하고 대상 project 존재와 실행 역할 권한을 확인한다. `--connect`로 실제 AWS에 대해 검사한다 |
| `bundle` | 원본 단계에서 코드, workflow 정의와 설정을 모아 버전 있는 배포 archive로 묶는다 |
| `deploy` | archive나 manifest의 내용을 대상 단계에 의존 순서대로 반영한다. `--dry-run`으로 미리 볼 수 있다 |
| `test` | 배포 뒤 서비스가 동작하고 준비됐는지 검증한다 |
| `create` | 기존 SMUS project에서 시작용 manifest를 만든다 |
| `run` | MWAA나 Airflow Serverless의 workflow 실행을 시작한다 |
| `monitor` | workflow 실행 상태를 본다 |
| `logs` | workflow 실행 로그를 가져온다 |
| `destroy` | 배포한 자원을 지우고 조건에 따라 project도 지운다. 정리나 실패 복구에 쓴다 |

저장소의 CLI 명령 문서는 Amazon Q CLI 연동용 `integrate`까지 10개를 싣는다. `--dry-run`과 `--connect` 같은 옵션은 README와 명령 문서에서 확인했다.

README의 기본 흐름은 `describe --connect`로 검증하고, 필요하면 `bundle`로 묶은 뒤 `deploy --dry-run`, `deploy`, `test` 순서로 진행하며 정리할 때 `destroy`를 쓴다. 블로그의 Glue와 QuickSight 예시에서 deploy는 ETL 스크립트와 workflow 정의를 project의 S3 storage connection에 올리고, MWAA Serverless에 Airflow workflow를 만들어 실행해 Glue job과 database를 만든 뒤 QuickSight 대시보드를 가져온다. SageMaker Catalog의 데이터가 필요하면 CLI가 접근에 필요한 구독 요청을 만들고 승인을 기다린 뒤 진행한다. CLI 명령 문서 기준으로 대기는 최대 5분이며 접근을 얻지 못하면 배포가 실패한다.

## CI/CD 파이프라인과의 연결

- CLI는 일반 명령줄 도구라 GitHub Actions, GitLab CI, Jenkins 같은 CI 시스템에서 같은 명령을 쓴다. 저장소에는 GitHub Actions workflow 예시와 범용 template이 있다.
- 예시 파이프라인은 bundle, manifest 검증, test 단계 배포, 통합 테스트, prod 배포 순서로 진행한다. 데모는 배포하는 대상이 Glue job인지 SageMaker model인지 Bedrock agent인지 파이프라인이 알 필요가 없다고 설명한다.
- 데모는 dev 계정에서 bundle한 archive를 다른 계정과 리전의 test 단계에 deploy하며, deploy 전에 대상 계정의 자격 증명을 설정한다.

## 운영 체크포인트

- `bundle`은 `--targets`로 고른 원본 단계의 파일을 받아 묶는다(데모의 원본은 dev였고, archive에는 S3 파일과 QuickSight 대시보드 export가 함께 들어갔다). 생략하면 기본 target을 쓰지만 명령 문서는 기본 target이 무엇인지 정의하지 않으므로 CI에서는 `--targets`를 명시한다. 운영상 추론으로, 원본 단계에서 손으로 고친 파일도 그대로 다음 단계로 넘어갈 수 있으므로 원본 단계를 무엇으로 볼지 먼저 정한다.
- Bootstrap action은 deploy 안에서 실행된다. Workflow 실행이나 dataset 전체 refresh를 prod 단계에도 넣으면 배포가 곧 데이터 작업 실행이 되므로 단계별로 분리한다.
- Catalog 구독 승인이 5분 안에 나지 않으면 deploy가 실패한다. 구독을 미리 승인받거나 승인 절차를 배포 전 단계로 분리하고, 이 실패를 재시도할지 정한다.
- `destroy`는 되돌릴 수 없다. CLI 명령 문서는 manifest와 workflow 정의에 적힌 자원이면 사용자가 손으로 만든 자원도 지울 수 있다고 경고한다. 같은 문서의 삭제 단계는 manifest에 `project.create: true`가 있을 때만 DataZone project를 지우고(manifest schema에는 이 키가 문서화되지 않았다), `default.*` connection과 `amazon.datazone.*` 자원은 지우지 않는다고 적는다.
- README 안에서도 EMR, Redshift와 Lambda의 지원 상태가 절마다 다르게 적혀 있다. 쓰려는 서비스가 현재 지원 범위인지 배포 전에 저장소 문서와 실제 동작으로 확인한다.
- 공지는 CLI 자체의 추가 비용이 없고 사용한 자원 비용만 낸다고 설명한다. SMUS를 쓸 수 있는 리전에서 쓸 수 있다(2026-04-23 공지 기준).

## 출처

- [Amazon SageMaker Unified Studio User Guide, CI/CD for Amazon SageMaker Unified Studio](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/cicd.html)
- [Amazon SageMaker Unified Studio now offers CI/CD CLI for data and AI applications — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/04/amazon-smus-ci-cd-cli/)
- [Automate deployment of data and AI applications with Amazon SageMaker Unified Studio CI/CD CLI — AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/automate-deployment-of-data-and-ai-applications-with-amazon-sagemaker-unified-studio-ci-cd-cli/)
- [CICD-for-SageMakerUnifiedStudio — GitHub, aws](https://github.com/aws/CICD-for-SageMakerUnifiedStudio)
- [CICD-for-SageMakerUnifiedStudio, CLI Commands Reference](https://github.com/aws/CICD-for-SageMakerUnifiedStudio/blob/main/docs/cli-commands.md)
- [CICD-for-SageMakerUnifiedStudio, Application Manifest Schema](https://github.com/aws/CICD-for-SageMakerUnifiedStudio/blob/main/docs/manifest-schema.md)
- [CICD-for-SageMakerUnifiedStudio, Bootstrap Actions](https://github.com/aws/CICD-for-SageMakerUnifiedStudio/blob/main/docs/bootstrap-actions.md)
- [Amazon SageMaker Unified Studio CI/CD CLI Demo — Amazon Web Services](https://www.youtube.com/watch?v=CuDq4eNjN1Y)

## 관련 문서

- [[SageMaker-Catalog-Discovery|SageMaker Catalog의 탐색과 분석]]
- [[Glue]]
- [[QuickSight]]
- [[AWS-Analytics|AWS 분석 서비스]]
