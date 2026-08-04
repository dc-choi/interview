---
tags: [infrastructure, aws, elastic-beanstalk, paas, deployment, autoscaling]
status: done
verified_at: 2026-08-04
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

## 애플리케이션 배포 정책

| 정책 | 동작 | 핵심 트레이드오프 |
|---|---|---|
| All at once | 기존 인스턴스 전체에 동시에 배포 | 가장 빠르지만 짧은 중단 가능 |
| Rolling | 기존 인스턴스를 배치로 교체 | 중단을 줄이지만 배포 중 용량 감소, 구버전과 신버전 공존 |
| Rolling with additional batch | 새 배치를 먼저 추가하고 순차 배포 | 전체 용량 유지, 추가 시간과 일시 비용 |
| Immutable | 별도 Auto Scaling Group에 전체 신버전 생성 | 격리와 빠른 복구, 배포 시간과 일시 비용 증가 |
| Traffic splitting | 새 그룹에 일부 트래픽을 보내 검증 후 전환 | canary 검증 가능, Application Load Balancer 필요 |

Rollback은 별도의 배포 정책이 아니라 이전 application version을 다시 배포하거나 실패한 새 리소스를 폐기하는 복구 동작이다. 정책 선택은 중단 허용치, 배포 중 필요한 용량, 버전 혼재 가능성, 검증 시간과 추가 비용을 함께 본다.

애플리케이션 버전 배포와 configuration update는 다른 작업이다. 인스턴스 유형이나 VPC 같은 환경 구성을 바꿀 때는 rolling update, immutable update 또는 resource replacement 동작을 별도로 확인한다.

## 환경 커스터마이징

### `.ebextensions`

source bundle 루트의 `.ebextensions/*.config`에 YAML 또는 JSON으로 option settings와 인스턴스 구성을 선언한다. 파일 확장자는 `.config`여야 한다.

- 환경 옵션, 패키지, 파일, 서비스와 container command 정의
- 동일 옵션을 여러 위치에서 설정하면 console, saved configuration, configuration file 등 우선순위를 확인
- secret 값을 source bundle에 넣지 말고 Secrets Manager나 Parameter Store와 instance role을 사용

### Platform hooks

Amazon Linux 플랫폼에서는 `.platform/hooks`로 application deployment 단계의 스크립트를, `.platform/confighooks`로 configuration deployment 단계의 스크립트를 실행할 수 있다. 스크립트는 실패 시 전체 배포를 실패시킬 수 있으므로 재실행해도 안전하게 만들고 명시적 timeout과 로그를 둔다.

## Docker 배포

Docker 지원 플랫폼에 `Dockerfile` 또는 플랫폼이 요구하는 구성과 source bundle을 배포할 수 있다. private ECR 이미지를 가져올 때는 장기 access key를 파일에 넣지 않고 환경의 EC2 instance profile에 최소 pull 권한을 부여한다. 복잡한 다중 서비스, 세밀한 배치 스케줄링과 독립 확장이 필요하면 [[ECS]] 또는 [[EKS]]를 비교한다.

## 운영 체크리스트

- production과 non-production 환경, VPC와 IAM role을 분리한다.
- 실제 application health check 경로를 설정하고 TCP 연결 성공만으로 정상 판단하지 않는다.
- platform branch 지원 상태와 retirement 일정을 추적하고 managed platform update를 검증한다.
- application version lifecycle policy로 S3 버전 누적을 관리하되 현재 배포 버전은 보호한다.
- 배포 이벤트, enhanced health, EC2와 ALB 로그를 함께 보고 실패 지점을 구분한다.
- immutable과 traffic splitting은 임시 인스턴스 비용, burst balance 초기화 영향을 포함해 평가한다.

## 선택 기준

- 전통적인 웹 애플리케이션을 AWS 인프라 제어권을 유지하며 빠르게 배포하면 Beanstalk가 맞을 수 있다.
- 소스나 단일 컨테이너에서 더 높은 추상화가 필요하면 [[App-Runner|App Runner]], 컨테이너 오케스트레이션 제어가 필요하면 [[ECS]]를 비교한다.
- 플랫폼 커스터마이징이 계속 늘어 Beanstalk 동작을 우회하는 스크립트가 중심이 되면 직접 관리형 컨테이너나 IaC 구성이 더 명확할 수 있다.

## 출처

- [AWS Elastic Beanstalk — Concepts](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts.html)
- [AWS Elastic Beanstalk — Deployment policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html)
- [AWS Elastic Beanstalk — Configuration files](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html)
- [AWS Elastic Beanstalk — Platform hooks](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html)
- [AWS Elastic Beanstalk — Pricing](https://aws.amazon.com/elasticbeanstalk/pricing/)
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
