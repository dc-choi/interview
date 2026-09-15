---
tags: [infrastructure, aws, ecs, terraform, iac, sqs, auto-scaling]
status: index
category: "Infrastructure - AWS"
aliases: ["ECS SQS Worker Terraform", "SQS 워커 Terraform", "ECS backlog autoscaling Terraform"]
---

# SQS 워커 ECS 오토스케일링 Terraform

> 상위 문서: [[ECS-Service-AutoScaling|ECS Service Auto Scaling]]

SQS를 소비하는 ECS 워커를 backlog-per-task로 오토스케일하는 IaC. **공통 리소스 + 옵션 A(Fargate) 또는 옵션 B(EC2)** 구조다. 두 옵션 모두 `aws_ecs_service.worker`를 정의하므로 A와 B를 동시에 쓰면 안 된다. Fargate는 스케일링 레이어 1개, EC2는 2개라는 차이가 코드에 그대로 드러난다([[ECS-Service-AutoScaling]]).

- [[ECS-SQS-Worker-Terraform-Common|공통 리소스 — 큐와 DLQ, 최소 권한 태스크 역할, Container Insights 클러스터, backlog-per-task Metric Math 정책]]
- [[ECS-SQS-Worker-Terraform-Launch-Types|옵션 A Fargate, 옵션 B EC2 — 캐파시티 프로바이더, task def와 서비스, ASG + Managed Scaling, ignore_changes와 target_capacity]]

## 관련 문서

- [[ECS|ecs 폴더 인덱스]]
