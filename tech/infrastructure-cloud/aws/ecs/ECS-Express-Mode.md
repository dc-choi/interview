---
tags: [infrastructure, aws, ecs, fargate, deployment]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["ECS Express Mode", "ECS 간편 배포"]
---

# ECS Express Mode의 자동 구성과 운영 경계

ECS Express Mode는 컨테이너 기반 웹 서비스의 Fargate 실행, HTTPS 진입점과 확장 설정을 함께 구성한다. 기본 생성 경로는 이미지, task execution role과 infrastructure role을 입력받는다. 애플리케이션 코드가 AWS API를 호출할 때 쓰는 task role은 별도다.

## 자동으로 만드는 구성

- ECS 클러스터, task definition과 service
- ALB, HTTPS listener와 target group, 인증서와 보안 그룹
- Application Auto Scaling, CloudWatch 로그 그룹과 배포 오류 감지 alarm

`create-express-gateway-service` 요청 뒤에는 서비스와 리소스의 준비 상태를 확인한다. 생성 요청이 받아들여졌다는 사실만으로 애플리케이션 응답까지 성공한 것은 아니다.

## 기본값을 가용성 보장으로 읽지 않는다

2026-10-07 공식 문서 기준이다.

| 항목 | 기본 동작 | 확인할 점 |
|---|---|---|
| 실행 용량 | 1 vCPU, 메모리 2 GB | 앱의 시작 시간과 메모리 사용량 |
| 태스크 수 | 최소 1, 최대 20 | 최소 1개만으로 동시 다중 AZ 복제본이 생기지는 않음 |
| 확장 지표 | CPU 목표 60% | CPU가 실제 부하를 반영하는가 |
| 배포 | Canary | Express Mode에서는 배포 전략 변경 불가 |
| 네트워크 | 미지정 시 default VPC의 public subnet | 공개 진입점과 private 진입점 중 필요한 구성 |

같은 VPC에서 최대 25개 Express Mode 서비스가 ALB를 공유할 수 있다. 이는 서비스마다 전용 ALB를 만든다는 뜻이 아니다. 최초 서비스가 정한 ALB의 서브넷과 AZ 조건도 후속 서비스에 영향을 준다.

## 도입 판단

아래는 자동 구성 범위에서 도출한 운영 점검이다.

- 배포 전 앱 포트, health check 경로와 최소 태스크 수를 정한다.
- 장애 시 로그와 alarm을 읽고 실제 요청 성공을 확인한다.
- 필요한 배포 전략과 네트워크 구성이 Express Mode의 변경 제한에 맞는지 확인한다.
- 생성된 리소스의 운영 비용을 별도로 계산한다. 배포 단계가 줄어도 실행 자원이 사라지는 것은 아니다.

## 출처

- [Amazon ECS, Resources created by Amazon ECS Express Mode services](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html)
- [Amazon ECS, Create your first Express Mode service using the AWS CLI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-getting-started.html)

## 관련 문서

- [[ECS|ECS 구성과 IAM 역할]]
- [[ECS-Service-AutoScaling|서비스 확장 지표와 용량]]
- [[ECS-Rolling-Deployment|일반 ECS 롤링 배포]]
