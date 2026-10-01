---
tags: [infrastructure, aws, elastic-beanstalk, paas, deployment, autoscaling]
status: done
verified_at: 2026-09-30
category: "Infrastructure - AWS"
aliases: ["AWS Elastic Beanstalk", "Elastic Beanstalk", "Beanstalk"]
---

# AWS Elastic Beanstalk

애플리케이션 소스나 컨테이너를 배포하면 EC2, Auto Scaling, Load Balancer, 보안 그룹과 모니터링 구성을 조정해 주는 AWS 관리형 PaaS다. 인프라 리소스는 계정에 보이고 직접 제어할 수 있지만, 운영체제와 플랫폼 생명주기 책임까지 없어지는 것은 아니다.

## 리소스 모델

- **Application**: 관련 환경과 애플리케이션 버전의 논리적 컨테이너
- **Application version**: S3에 저장된 특정 source bundle과 버전 레이블
- **Environment**: 한 버전을 실행하는 AWS 리소스 집합. dev, staging, production을 별도 환경으로 나눌 수 있음
- **Platform branch와 version**: 운영체제, 런타임, 웹 서버와 Beanstalk 구성의 조합
- **Environment tier**: HTTP 요청을 처리하는 Web server와 SQS 작업을 소비하는 Worker

Elastic Beanstalk 서비스 사용에 별도 추가 요금은 없지만 EC2, ELB, S3, CloudWatch, 데이터 전송 등 생성된 리소스는 각각 과금된다. 무료 인프라로 오해하면 안 된다.

### 환경 사전 설정 — 단일 인스턴스와 고가용성

- **Single instance** 계열 preset은 개발, 테스트용이다. 로드 밸런서 없이 도메인이 인스턴스의 Elastic IP로 연결되고, 배포나 구성 변경 중 인스턴스가 재시작되면 서비스가 끊길 수 있어 프로덕션에 쓰지 않는다
- **High availability** 계열 preset은 로드 밸런서(콘솔 기본 ALB)와 Auto Scaling 그룹을 포함하며 프로덕션 권장이다. preset 중 두 가지는 Spot 인스턴스 요청을 켠다
- 로드 밸런서 유형은 환경을 만들 때만 고를 수 있으므로 나중에 traffic splitting이 필요할 수 있으면 처음부터 ALB로 만든다

## 애플리케이션 배포 정책

| 정책 | 동작 | 핵심 트레이드오프 |
|---|---|---|
| All at once | 기존 인스턴스 전체에 동시에 배포 | 가장 빠르지만 짧은 중단 가능 |
| Rolling | 기존 인스턴스를 배치로 교체 | 중단을 줄이지만 배포 중 용량 감소, 구버전과 신버전 공존 |
| Rolling with additional batch | 새 배치를 먼저 추가하고 순차 배포 | 전체 용량 유지, 추가 시간과 일시 비용 |
| Immutable | 별도 Auto Scaling Group에 전체 신버전 생성 | 격리와 빠른 복구, 배포 시간과 일시 비용 증가 |
| Traffic splitting | 새 그룹에 일부 트래픽을 보내 검증 후 전환 | canary 검증 가능, Application Load Balancer 필요 |

Rollback은 별도의 배포 정책이 아니라 이전 application version을 다시 배포하거나 실패한 새 리소스를 폐기하는 복구 동작이다. 정책 선택은 중단 허용치, 배포 중 필요한 용량, 버전 혼재 가능성, 검증 시간과 추가 비용을 함께 본다.

- 기본 정책은 All at once다(EB CLI로 만든 scalable 환경은 Rolling). 단일 인스턴스 환경은 All at once와 Immutable만 지원하고 Rolling, Rolling with additional batch, Traffic splitting은 로드 밸런싱 환경에서만 쓸 수 있다. 콘솔에서 선택지가 둘뿐이라면 정책이 줄어든 것이 아니라 환경 유형의 차이다
- Rolling은 배치마다 인스턴스를 로드 밸런서에서 떼어 새 버전을 배포하고 다시 붙인 뒤, health check를 통과해야 다음 배치로 넘어간다
- 2026-09-30 문서 기준 이 표는 EC2 기반 Beanstalk Standard 환경 기준이다. Amazon EKS에서 실행되는 Beanstalk Cluster 환경은 `max-surge`, `max-unavailable`로 rolling을 구성하고 Immutable과 Traffic splitting을 지원하지 않는다

### 버전 업로드와 배포는 별개다

- 애플리케이션 버전 화면에서 source bundle을 업로드하면 Beanstalk가 Region별로 만든 `elasticbeanstalk-<region>-<account-id>` S3 버킷에 저장하고 버전을 등록할 뿐, 환경의 실행 버전은 바뀌지 않는다. 버전을 골라 Deploy(또는 환경 화면의 Upload and deploy)해야 배포된다
- 롤백은 새 파일 없이 이전 버전을 골라 다시 배포한다. 코드만 바꾸는 All at once, Rolling 배포는 인스턴스를 새로 만들지 않아 첫 환경 생성보다 빠르다
- 버전을 삭제해도 S3의 source bundle은 선택하지 않는 한 남고 Beanstalk는 source bundle을 자동 삭제하지 않는다. version lifecycle 설정과 S3 정리를 함께 둔다

애플리케이션 버전 배포와 configuration update는 다른 작업이다. 인스턴스 유형이나 VPC 같은 환경 구성을 바꿀 때는 rolling update, immutable update 또는 resource replacement 동작을 별도로 확인한다.

## 환경 커스터마이징

### `.ebextensions`

source bundle 루트의 `.ebextensions/*.config`에 YAML 또는 JSON으로 option settings와 인스턴스 구성을 선언한다. 파일 확장자는 `.config`여야 한다.

- 환경 옵션, 패키지, 파일, 서비스와 container command 정의
- 동일 옵션을 여러 위치에서 설정하면 console, saved configuration, configuration file 등 우선순위를 확인
- secret 값을 source bundle에 넣지 말고 Secrets Manager나 Parameter Store와 instance role을 사용

### Platform hooks

Amazon Linux 플랫폼에서는 `.platform/hooks`로 application deployment 단계의 스크립트를, `.platform/confighooks`로 configuration deployment 단계의 스크립트를 실행할 수 있다. 스크립트는 실패 시 전체 배포를 실패시킬 수 있으므로 재실행해도 안전하게 만들고 명시적 timeout과 로그를 둔다.

## 서비스 역할과 EC2 instance profile

| 역할 | 누가 맡는가 | 용도와 기본 관리형 정책 |
|---|---|---|
| 서비스 역할 (`aws-elasticbeanstalk-service-role`) | Beanstalk 서비스 (`elasticbeanstalk.amazonaws.com`) | 환경 리소스 관리, health 모니터링, managed platform update. `AWSElasticBeanstalkEnhancedHealth`, `AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy` |
| EC2 instance profile | 환경의 EC2 인스턴스 (`ec2.amazonaws.com`) | 인스턴스 위 애플리케이션과 에이전트의 로그 업로드, X-Ray, worker queue 처리. `AWSElasticBeanstalkWebTier`, `AWSElasticBeanstalkWorkerTier`, `AWSElasticBeanstalkMulticontainerDocker` |

- AWS 보안 지침상 서비스가 다른 서비스(여기서는 EC2)를 신뢰하는 역할을 자동으로 만들 수 없어, Beanstalk는 기본 instance profile `aws-elasticbeanstalk-ec2-role`을 더 이상 만들지 않는다. 계정에 없으면 IAM에서 만들어 환경 생성 때 지정해야 하고, 예전에 생긴 것은 계속 쓸 수 있다. 서비스 역할은 콘솔과 EB CLI가 기본값으로 만들어 준다
- 두 역할을 편의상 하나로 합치지 않는다. 신뢰 주체와 권한 범위가 달라 합치면 인스턴스 위 애플리케이션 코드가 환경 관리 권한까지 얻는다
- 관리형 정책은 필요할 수 있는 권한을 넓게 담으므로 애플리케이션이 쓰는 S3, Secrets Manager 권한은 instance profile에 대상 리소스로 좁혀 따로 붙인다

## Docker 배포

Docker 지원 플랫폼에 `Dockerfile` 또는 플랫폼이 요구하는 구성과 source bundle을 배포할 수 있다. private ECR 이미지를 가져올 때는 장기 access key를 파일에 넣지 않고 환경의 EC2 instance profile에 최소 pull 권한을 부여한다. 복잡한 다중 서비스, 세밀한 배치 스케줄링과 독립 확장이 필요하면 [[ECS]] 또는 [[EKS]]를 비교한다.

- **Docker running on AL2023** 브랜치는 container와 source를 EC2 인스턴스에 직접 배포하고 Docker Compose로 여러 container를 실행할 수 있다. 새 환경에는 이 브랜치를 권장한다
- **ECS running on AL2023** 브랜치는 퇴역한 Multi-container Docker(Amazon Linux AMI) 환경의 이전 경로로, Amazon ECS가 container 배치를 조정한다. 컨테이너가 ECS에서 실행된다는 설명은 이 브랜치에만 해당한다

## 운영 체크리스트

- production과 non-production 환경, VPC와 IAM role을 분리한다.
- 실제 application health check 경로를 설정하고 TCP 연결 성공만으로 정상 판단하지 않는다.
- platform branch 지원 상태와 retirement 일정을 추적하고 managed platform update를 검증한다.
- application version lifecycle policy로 S3 버전 누적을 관리하되 현재 배포 버전은 보호한다.
- 배포 이벤트, enhanced health, EC2와 ALB 로그를 함께 보고 실패 지점을 구분한다.
- immutable과 traffic splitting은 임시 인스턴스 비용, burst balance 초기화 영향을 포함해 평가한다.

## 선택 기준

- 전통적인 웹 애플리케이션을 AWS 인프라 제어권을 유지하며 빠르게 배포하면 Beanstalk가 맞을 수 있다.
- 소스나 단일 컨테이너에서 더 높은 추상화가 필요하면 Amazon ECS Express Mode를, 컨테이너 오케스트레이션 제어가 필요하면 [[ECS]]를 비교한다. [[App-Runner|App Runner]]는 신규 고객 온보딩이 종료돼 기존 고객만 사용할 수 있다.
- 플랫폼 커스터마이징이 계속 늘어 Beanstalk 동작을 우회하는 스크립트가 중심이 되면 직접 관리형 컨테이너나 IaC 구성이 더 명확할 수 있다.

## 출처

- [AWS Elastic Beanstalk — Concepts](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts.html)
- [AWS Elastic Beanstalk — Deployment policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html)
- [AWS Elastic Beanstalk — Deploying applications](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.deploy-existing-version.html)
- [AWS Elastic Beanstalk — Managing application versions](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-versions.html)
- [AWS Elastic Beanstalk — Amazon S3 bucket](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/AWSHowTo.S3.html)
- [AWS Elastic Beanstalk — Create environment wizard](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-create-wizard.html)
- [AWS Elastic Beanstalk — Instance profiles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-instanceprofile.html)
- [AWS Elastic Beanstalk — Service roles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-servicerole.html)
- [AWS Elastic Beanstalk — Docker platform branches](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/docker-platform.html)
- [AWS Elastic Beanstalk — Configuration files](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html)
- [AWS Elastic Beanstalk — Platform hooks](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html)
- [AWS Elastic Beanstalk — Pricing](https://aws.amazon.com/elasticbeanstalk/pricing/)
- [AWS App Runner Developer Guide, Availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)
- [Sungmin Kim 강사 — Elastic Beanstalk란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=81291)
- [Sungmin Kim 강사 — Elastic Beanstalk 웹 애플리케이션 배포](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=81292)
- [Sungmin Kim 강사 — Web Application Update](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=81293)
- [Sungmin Kim 강사 — Web Application Update 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=81294)
- [Sungmin Kim 강사 — Customize Elastic Beanstalk](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=81295)
- [Sungmin Kim 강사 — Docker와 Elastic Beanstalk 실습](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=85085)
- [Sungmin Kim 강사 — Docker와 Elastic Beanstalk 보충](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=233548)

## 관련 문서

- [[App-Runner|AWS App Runner]]
- [[ECS|Amazon ECS]]
- [[ECR|Amazon ECR]]
- [[CloudFormation]]
