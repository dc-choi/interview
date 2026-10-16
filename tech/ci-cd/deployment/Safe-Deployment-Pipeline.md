---
tags: [cicd, deployment, pipeline, progressive-delivery, rollback, aws, ecs]
status: done
verified_at: 2026-10-14
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Safe Deployment Pipeline", "안전한 배포 파이프라인", "Automated Safe Deployment", "One-Box and Wave Deployment"]
---

# 안전한 자동 배포 파이프라인

배포가 잦아질수록 사람이 그래프를 보고 다음 단계로 넘길지 정하는 방식은 느려지고 판단 기준도 흔들린다. 안전한 자동 배포 파이프라인은 머지 이후의 진행과 중단을 파이프라인의 조건으로 바꾼다. 사전 검증 단계를 통과한 아티팩트를 프로덕션의 작은 단위부터 넓혀 배포하고, 단계마다 bake time 동안 알람과 표본을 확인한 뒤에만 다음 단계로 승격한다.

한 배포 안에서 트래픽 비율을 올리는 판정은 [[Canary|Canary 배포]], 되돌릴 수 있는 범위의 설계는 [[Rollback|롤백 전략]], 무중단의 성립 조건은 [[Zero-Downtime-Deployment|무중단 배포]], 셀 경계를 배포 단위로 쓰는 원리는 [[Cell-Based-Failure-Isolation|셀 기반 장애 격리]]가 다룬다. 이 문서는 그 장치들을 파이프라인 단계로 엮는 방법을 다룬다.

## 핵심 명제

- **진행 조건과 중단 조건을 파이프라인에 둔다.** 리뷰를 거쳐 머지된 변경은 사람이 개입하지 않아도 테스트와 알람 결과에 따라 진행하거나 멈추고 되돌아가야 한다.
- **한 번 빌드한 아티팩트를 승격한다.** AWS DevOps Guidance는 여러 번 빌드하는 것을 안티패턴으로 들고 build once, deploy many를 권한다. 환경마다 빌드하면 구성과 컴포넌트 버전이 달라져 사전 단계에서 보지 못한 실패가 프로덕션에서 나올 수 있다.
- **프로덕션은 작은 단위부터 넓힌다.** Amazon은 프로덕션 배포의 첫 목표를 여러 리전에 동시에 부정적 영향을 주지 않는 것으로 두고, 배포마다 범위를 제한해 실패한 배포가 고객에게 주는 영향을 줄인다.
- **배포 완료는 성공 판정이 아니다.** 배포가 끝난 뒤에도 정한 시간과 최소 표본을 채울 때까지 알람을 본다.
- **코드 밖의 변경도 같은 안전장치를 거친다.** 인프라, 설정과 기능 플래그, OS 패치도 잘못되면 프로덕션에 영향을 주므로 자동 롤백을 갖춘 파이프라인으로 배포한다.

## 단계 구성

아래는 Amazon Builders' Library가 소개한 Amazon의 전형적인 파이프라인이다. 단계 이름은 조직마다 다르므로 각 단계가 답하는 질문을 기준으로 옮긴다.

| 단계 | 답하는 질문 | 대표 검증 |
|---|---|---|
| Source | 리뷰를 거친 변경인가 | 팀원의 승인 뒤 메인 브랜치에 머지하고, 리뷰되지 않은 커밋은 파이프라인이 배포를 막음 |
| Build | 코드가 단독으로 맞는가 | 컴파일, 의존성 API 호출을 mock한 단위 테스트, 네트워크 없이 격리한 빌드, 패키징과 서명 |
| Alpha, Beta | 최신 코드가 기능적으로 동작하는가 | 기능 API 테스트, end-to-end 통합 테스트 |
| Gamma | 프로덕션과 같은 조건에서 기능이 동작하고 배포가 안전한가 | 프로덕션과 같은 배포 구성, 모니터링과 알람, 지속 canary 테스트, gamma 안의 one-box |
| Zeta (선택) | 지금 프로덕션에 떠 있는 코드와 호환되는가 | 프로덕션 엔드포인트만 호출하는 통합 테스트 |
| Prod | 실제 사용자에게 안전한가 | one-box, wave, bake time, 자동 롤백 |

- 사전 단계의 서비스는 다른 팀이 소유한 서비스의 프로덕션 엔드포인트를 호출하고, 같은 팀의 다른 마이크로서비스는 같은 단계의 사전 엔드포인트를 호출한다.
- gamma는 기능 검증에 더해 프로덕션과 같은 배포 구성과 알람으로 배포 자체가 안전한지 검증하는 단계다. 배포 구성과 알람이 프로덕션과 다르면 gamma를 통과해도 프로덕션의 배포 실패를 예측하지 못한다.
- 처음부터 모든 단계를 갖출 필요는 없다. 소스, 빌드, 테스트 환경, 프로덕션으로 이어지는 자동 배포부터 만들고 그 위에 검증과 확산 단계를 더하는 순서가 현실적이다(2020년 AWS 발표의 권고).

## 프로덕션 확산 — one-box와 wave

- **one-box**: 각 프로덕션 wave는 one-box 단계로 시작한다. one-box는 가상 머신 하나, 컨테이너 하나 또는 Lambda 함수 호출의 작은 비율이며, 보통 그 리전이나 가용 영역 전체 요청의 최대 10%를 받는다. one-box 단계는 그 박스 하나로 범위를 좁힌 지표로도 롤백한다.
- **wave**: 리전을 점점 커지는 묶음으로 나눈다. 첫 wave는 요청이 적은 리전에서 가용 영역(또는 셀)을 하나씩, 두 번째 wave는 요청이 많은 리전에서 같은 방식으로 배포한다. 이후 3개 리전, 최대 12개 리전, 나머지 리전 순으로 넓힌다.
- **리전 안의 교체 폭**: 리전 안의 전형적인 롤링 배포는 한 번에 서비스 박스의 최대 33%를 교체하고, 영향을 더 줄이려는 일부 팀은 한 번에 5%까지만 배포한다.

리전이 하나인 작은 서비스에도 같은 원리를 옮길 수 있다. 프로덕션과 같은 구성의 사전 환경, 프로덕션 일부 태스크(Canary 비율이나 blue/green 테스트 트래픽), 전체 순으로 넓히고 각 단계에서 판정할 표본이 충분한지 확인한다. 표본이 부족한 서비스의 대안은 [[Canary|Canary 배포]]의 저트래픽 절을 따른다(적용 제안).

## Bake time — 배포가 끝난 뒤 기다리는 시간

bake time은 한 단계의 배포가 끝난 뒤 다음 단계로 승격하기 전까지 알람을 계속 관찰하는 기간이다. 특정 요청 조합이나 시간이 지나야 나타나는 결함은 배포 직후의 지표에 보이지 않을 수 있다.

- Amazon의 전형적인 파이프라인은 one-box 단계 뒤 최소 1시간, 첫 리전 wave 뒤 최소 12시간, 나머지 wave 뒤 최소 2~4시간을 기다린다. 이 보수적인 기본값으로 모든 리전에 배포하는 데 보통 4~5 영업일이 걸린다. Amazon의 사례 값이므로 다른 서비스의 기준으로 그대로 옮기지 않는다.
- 시간만이 아니라 지표의 최소 데이터 포인트도 조건으로 둔다(예: Create API 요청 최소 100건). 요청이 적은 시간대에는 시간이 지나도 판정할 표본이 모이지 않기 때문이다.
- bake time 동안 이전 버전을 살려 두면 롤백이 트래픽 되돌리기로 끝난다. ECS에서는 기본 blue/green의 `bakeTimeInMinutes`와 CodeDeploy의 termination wait time이 이 기간에 해당한다([[Blue-Green|Blue-Green 배포]]의 Amazon ECS 절).

## 알람 기반 자동 롤백과 배포 차단

- **알람 구성**: 오류율과 높은 지연처럼 고객에게 영향을 주는 지표, CPU 같은 인프라 지표의 임계값으로 마이크로서비스별 high-severity 알람을 만들고, 팀 단위 aggregate 알람으로 다시 묶는다. 팀의 high-severity 알람 중 하나라도 알람 상태가 되면 그 리전에서 팀의 모든 마이크로서비스에 진행 중인 배포가 자동으로 롤백된다.
- **지표 이상**: 요청 수가 갑자기 0으로 떨어지는 것처럼 배포 중 지표에 이상이 생겨도 자동으로 롤백할 수 있다. 오류율만 보면 트래픽이 끊긴 장애를 놓친다.
- **롤백 대상**: 이전에 배포한 컨테이너 이미지나 Lambda 배포 패키지로 되돌린다. 패키지는 불변이고 체크섬으로 무결성을 확인한다. 태그 대신 digest로 대상을 고정하는 방법은 [[Rollback|롤백 전략]]과 [[Docker-Image-Pipeline|Docker 이미지 파이프라인]]에 있다.
- **배포 차단**: aggregate 알람이 알람 상태이면 파이프라인이 변경을 프로덕션으로 진행시키지 않는다. 고심각도 장애를 복구하기 위한 변경은 개발자가 이 차단을 해제하고 배포할 수 있다.
- 판정 지표의 버전 구분과 SLO 연결은 [[Deploy-Observability|배포 가시성]]과 [[SLI-SLO|SLI, SLO]]를 따른다.

## 배포 시간 제한

온콜 엔지니어는 밤, 사무실 휴일과 주말에 대응을 시작하기까지 더 오래 걸린다. 그래서 자동 배포의 time window에서 이 시간을 제외하고, 많은 팀이 금요일과 늦은 오후 배포도 제외한다. 배포 뒤 문제가 생겨 밤이나 주말에 온콜을 호출해야 할 위험을 줄이려는 장치다.

time window는 자동 배포의 위험을 대응할 사람이 있는 시간에만 여는 정책이다. 장애 복구 배포의 예외 경로는 위의 배포 차단 해제처럼 따로 정해 둔다(운영 제안).

## 인프라와 설정도 파이프라인으로

- Amazon의 파이프라인은 애플리케이션 코드뿐 아니라 웹사이트 정적 자산, 도구, 테스트, 인프라, 설정과 애플리케이션 밑의 OS까지 모든 소스 변경을 검증하고 배포한다. 전형적인 마이크로서비스는 애플리케이션 코드, 인프라, OS 패치, 설정과 기능 플래그, 운영 도구 파이프라인을 따로 두며, 모두 애플리케이션 코드 파이프라인과 같은 안전장치(자동 롤백 등)를 쓴다.
- 파이프라인을 나누면 통합 테스트에 막힌 애플리케이션 변경이 인프라 변경의 프로덕션 반영까지 막지 않는다. 반대로 2020년 AWS 발표는 컨테이너 애플리케이션에는 애플리케이션 이미지와 IaC 템플릿을 한 파이프라인에 두는 구성이 가장 좋은 방법이라고 소개했다. 위 Builders' Library의 파이프라인 분리와 다른 당시 권고다. 빌드 단계가 새 이미지 digest를 템플릿에 반영하고 그 템플릿을 테스트와 프로덕션에 같은 순서로 배포한다. 이미지와 인프라의 조합을 함께 검증하고 어느 커밋이 어느 환경에 배포됐는지 추적하기 쉽지만, 한쪽 변경이 막히면 다른 쪽도 기다린다.
- 어느 구성이든 콘솔 수동 변경을 배포 경로로 쓰지 않는다. 테스트 환경의 통합 테스트를 통과한 이미지라도 프로덕션 대상 그룹의 헬스 체크 경로를 손으로 다르게 설정했다면 문제가 프로덕션에서 처음 드러난다. 같은 템플릿으로 두 환경을 만들면 이런 차이가 리뷰와 사전 단계에서 드러난다.
- AWS CDK는 TypeScript, JavaScript, Python, Java, C#/.NET, Go로 인프라를 정의하고 CloudFormation으로 배포한다. 빌드에서 `cdk synth`로 만든 템플릿을 승격 대상으로 쓸 수 있다. construct 수준별 검토 범위는 [[CDK-vs-Terraform|CDK vs Terraform]], 변경 세트 실행은 [[CloudFormation|CloudFormation]]을 본다.
- CDK Pipelines는 스스로 갱신되는 파이프라인이다. 애플리케이션 stage나 stack을 추가하면 파이프라인이 자신을 다시 구성한다. `addWave`는 같은 wave에 넣은 stage를 병렬로 배포하므로 위의 점점 커지는 순차 wave와 뜻이 다르다. 순차 확산이 필요하면 wave를 순서대로 여러 개 두고 그 사이에 판정 단계를 넣는다(설계 제안).

## AWS와 ECS 도구에 대응시키기

2026-10-14 공식 문서 기준이다.

| 역할 | 도구와 동작 |
|---|---|
| 트리거 | CodePipeline의 ECR 소스 액션은 지정 태그(미지정 시 `latest`)의 이미지 push로 파이프라인을 시작하고 출력 변수로 `ImageDigest`를 준다 |
| 빌드 | CodeBuild가 이미지를 빌드해 빌드마다 고유한 태그로 push한다. 태그 규칙은 [[Docker-Image-Pipeline|Docker 이미지 파이프라인]], 스캔 결과와 배포 승인의 구분은 [[ECR|Amazon ECR]] |
| 롤링, ECS 기본 blue/green | CodePipeline ECS 표준 액션이 `imagedefinitions.json`으로 서비스가 쓰는 태스크 정의의 새 리비전을 만들어 배포한다. 2025-09 AWS Containers Blog 기준으로 ECS 기본 blue/green 서비스의 이미지 변경도 이 액션으로 배포할 수 있지만 다른 서비스 설정 변경은 담지 못한다 |
| CodeDeploy blue/green | CodePipeline의 ECS와 CodeDeploy blue/green 배포 액션을 쓰거나, `aws ecs deploy`로 태스크 정의 등록, AppSpec 갱신, 배포 생성과 완료 대기를 한 번에 한다 |
| GitHub Actions | `configure-aws-credentials`는 GitHub OIDC로 짧은 수명의 자격 증명을 받는 방식을 권하며 `id-token: write` 권한이 필요하다. `amazon-ecs-deploy-task-definition`은 태스크 정의를 등록해 서비스에 배포하고, `wait-for-service-stability`를 켜면 안정 상태를 기다린다(`wait-for-minutes` 기본 30분, 최대 6시간) |
| 그 밖의 자동화 | Jenkins 같은 도구에서는 AWS CLI로 태스크 정의를 등록하고 서비스를 갱신한 뒤 `aws ecs wait services-stable`로 기다린다 |

- **베이스 이미지와 공용 사이드카**: 중앙 팀이 관리하는 베이스 이미지나 로깅, 프록시 사이드카 이미지가 갱신되면 ECR 소스 액션으로 그 이미지를 쓰는 서비스 파이프라인을 자동으로 시작할 수 있다. 새 버전을 사람이 주기적으로 확인하지 않아도 되고, 갱신도 같은 단계와 bake time을 거친다. 트리거는 태그로 받더라도 배포 기록과 롤백 대상은 digest로 남긴다.
- **ECS 표준 액션의 기준 리비전**: 이 액션은 서비스가 현재 쓰는 리비전을 기준으로 새 리비전을 만든다. 서비스를 갱신하지 않고 등록만 한 태스크 정의 리비전은 무시한다.
- **`aws ecs deploy`의 대기 한도**: 기본 30분, 배포 그룹에 대기 시간을 설정했다면 그보다 최대 10분 더(최대 6시간) 안에 배포가 성공하지 않으면 종료 코드 255로 끝난다.
- **waiter 성공은 새 리비전의 성공이 아니다**: `services-stable`은 15초마다 서비스를 조회해 서비스마다 배포가 하나뿐이고 실행 중인 태스크 수가 원하는 수와 같으면 성공하며, 40번 확인에 실패하면 종료 코드 255로 끝난다. 이 조건은 어떤 리비전이 남았는지 묻지 않으므로, deployment circuit breaker가 이전 배포로 롤백을 마친 뒤에도 성공할 수 있다(조건식에 따른 추론). 대기 뒤 서비스의 태스크 정의와 배포의 `rolloutState`도 확인한다(운영 제안). 반대로 40번(약 10분) 안에 조건을 채우지 못하면 배포가 그 뒤 성공해도 255로 끝나므로, 오래 걸리는 배포는 종료 코드만으로 실패를 판정하지 않고 `describe-service-deployments`의 `status`로 확인한다(운영 제안).

## 흔한 실수

- 단계와 대기 시간은 있는데 알람과 최소 표본 조건이 없어 시간이 지나면 자동으로 승격한다.
- 스테이징의 배포 구성과 알람이 프로덕션과 달라 배포 검증 단계의 역할을 못 한다.
- 첫 프로덕션 단계가 모든 가용 영역이나 모든 고객을 한 번에 덮는다.
- 배포는 자동인데 롤백은 사람 호출에 의존한다.
- bake time이 끝나기 전에 이전 버전을 지워 롤백 수단부터 없앤다.
- 환경마다 다시 빌드하거나 mutable 태그로 배포해 사전 단계에서 검증한 것과 다른 아티팩트가 프로덕션에 올라간다.
- 인프라와 설정을 콘솔에서 바꿔 파이프라인을 거치지 않는다.
- 밤과 주말에도 자동 배포가 진행돼 대응이 가장 느린 시간에 실패가 드러난다.

## 면접 체크포인트

- gamma 단계가 alpha, beta와 다른 질문에 답하는 이유를 설명할 수 있는가.
- one-box와 wave가 장애 범위를 어떻게 제한하는지 가용 영역, 셀, 리전 경계와 연결해 말할 수 있는가.
- bake time에 시간 조건과 최소 데이터 포인트 조건을 함께 두는 이유를 말할 수 있는가.
- 자동 롤백에서 오류율 말고 요청 수 급감도 봐야 하는 이유를 설명할 수 있는가.
- 애플리케이션과 인프라 파이프라인을 나눌 때와 합칠 때의 트레이드오프를 말할 수 있는가.
- `aws ecs wait services-stable`의 성공을 배포 성공으로 보면 안 되는 경우를 설명할 수 있는가.

## 출처

- [Automating safe, hands-off deployments — Amazon Builders' Library, Clare Liguori](https://builder.aws.com/content/3ErTKQOTKc5NIw031UePBPxTQ6I/automating-safe-hands-off-deployments)
- [AWS, Anti-patterns for continuous delivery (DevOps Guidance)](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/anti-patterns-for-continuous-delivery.html)
- [AWS, Amazon ECR source action reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECR.html)
- [AWS, Amazon Elastic Container Service deploy action reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECS.html)
- [Migrating from AWS CodeDeploy to Amazon ECS for blue/green deployments — AWS Containers Blog](https://aws.amazon.com/blogs/containers/migrating-from-aws-codedeploy-to-amazon-ecs-for-blue-green-deployments/)
- [AWS CLI, aws ecs deploy](https://docs.aws.amazon.com/cli/latest/reference/ecs/deploy.html)
- [AWS CLI, aws ecs wait services-stable](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)
- [AWS CLI, aws ecs describe-service-deployments](https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-service-deployments.html)
- [AWS, What is the AWS CDK?](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- [AWS, Continuous integration and delivery (CI/CD) using CDK Pipelines](https://docs.aws.amazon.com/cdk/v2/guide/cdk-pipeline.html)
- [aws-actions/configure-aws-credentials — GitHub](https://github.com/aws-actions/configure-aws-credentials)
- [aws-actions/amazon-ecs-deploy-task-definition — GitHub](https://github.com/aws-actions/amazon-ecs-deploy-task-definition) — 대기 입력의 기본값은 저장소의 `action.yml` 기준
- [AWS Fargate와 Amazon ECS를 활용한 CI/CD 모범사례 — AWS Game Master 온라인 세미나, 유재석](https://www.youtube.com/watch?v=ZRPdVY5lFBM) — 2020-04-28 업로드, re:Invent 2019 동명 세션의 한국어 발표. 당시 기능 설명은 위 공식 문서로 다시 대조했다

## 관련 문서

- [[Canary|Canary 배포]]
- [[Blue-Green|Blue-Green 배포]]
- [[Rollback|롤백 전략]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Cell-Based-Failure-Isolation|셀 기반 장애 격리]]
- [[Docker-Image-Pipeline|Docker 이미지 파이프라인]]
- [[ECS-Rolling-Deployment|ECS 롤링 배포]]
- [[ECR|Amazon ECR]]
- [[CDK-vs-Terraform|CDK vs Terraform]]
- [[CloudFormation|CloudFormation]]
- [[Deploy-Observability|배포 가시성]]
- [[SLI-SLO|SLI, SLO]]
- [[Feature-Flag|Feature Flag]]
- [[CICD-Tool-Selection-AWS-Code-Services|AWS Code 시리즈 운영]]
