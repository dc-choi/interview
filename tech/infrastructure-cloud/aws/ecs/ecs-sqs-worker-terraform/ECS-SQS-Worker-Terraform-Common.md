---
tags: [infrastructure, aws, ecs, terraform, iac, sqs, auto-scaling]
status: done
verified_at: 2026-09-04
category: "Infrastructure - AWS"
aliases: ["ECS SQS Worker Terraform 공통", "SQS 워커 Terraform 공통 리소스", "backlog-per-task Terraform 정책"]
---

# SQS 워커 ECS 오토스케일링 Terraform — 공통 리소스

> 상위 문서: [[ECS-SQS-Worker-Terraform|SQS 워커 ECS 오토스케일링 Terraform]]

## 공통 — 큐, IAM, 클러스터, 서비스 오토스케일링 (Fargate와 EC2 공통)

```hcl
# variables.tf — region, cluster_name, service_name, queue_name, container_image(ECR URI), private_subnet_ids, vpc_id 입력
# sqs.tf — DLQ(retention 14일) + 소스 큐
resource "aws_sqs_queue" "orders" {
  name                       = var.queue_name
  visibility_timeout_seconds = 180  # 처리 시간 고려
  receive_wait_time_seconds  = 20   # long polling
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 5
  })
}
# iam.tf — 실행 역할(AmazonECSTaskExecutionRolePolicy 부착) + 태스크 역할
#   태스크 역할 정책(aws_iam_role_policy) = 큐 ARN에 최소 권한 4개만:
#   sqs:ReceiveMessage, DeleteMessage, GetQueueAttributes, ChangeMessageVisibility
```

클러스터는 **Container Insights를 켜야** `RunningTaskCount` 메트릭이 나온다(metric math에 필요).

```hcl
# ecs-common.tf
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name
  setting { name = "containerInsights"  value = "enabled" }
}

# 서비스 오토스케일링 (레이어 1, Fargate와 EC2 공통)
resource "aws_appautoscaling_target" "worker" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = 1
  max_capacity       = 20
}

resource "aws_appautoscaling_policy" "backlog_per_task" {
  name               = "backlog-per-task"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 1000  # 허용지연 ÷ 건당 처리시간
    scale_in_cooldown  = 300   # 줄일 땐 보수적
    scale_out_cooldown = 60    # 늘릴 땐 빠르게

    customized_metric_specification {                 # metric math: visible / tasks
      metrics {
        id = "visible"  return_data = false
        metric_stat {
          metric {
            namespace   = "AWS/SQS"
            metric_name = "ApproximateNumberOfMessagesVisible"
            dimensions { name = "QueueName"  value = aws_sqs_queue.orders.name }
          }
          stat = "Average"
        }
      }
      metrics {
        id = "tasks"  return_data = false
        metric_stat {
          metric {
            namespace   = "ECS/ContainerInsights"
            metric_name = "RunningTaskCount"
            dimensions { name = "ClusterName"  value = aws_ecs_cluster.main.name }
            dimensions { name = "ServiceName"  value = aws_ecs_service.worker.name }
          }
          stat = "Average"
        }
      }
      metrics { id = "backlogPerTask"  expression = "visible / tasks"  return_data = true }
    }
  }
}
```

## 챙길 포인트

- **metric math 폴백**: `customized_metric_specification`의 `metrics {}` 블록은 비교적 최신 provider에서 지원된다. provider가 낮으면 Lambda가 `BacklogPerTask`를 직접 `PutMetricData`하고(Container Insights 불필요, 0 나누기도 코드에서 차단) 정책은 단일 메트릭 형태로 건다(`namespace`, `metric_name`, `statistic`, `dimensions`).

## 출처

- [AWS 공식 문서, Amazon ECS service auto scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [terraform-provider-aws — aws_ecs_capacity_provider, aws_appautoscaling_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 관련 문서

- [[ECS-SQS-Worker-Terraform-Launch-Types|옵션 A Fargate, 옵션 B EC2 — 캐파시티 프로바이더와 task def]]
- [[ECS-Service-AutoScaling|ECS Service Auto Scaling (backlog-per-task)]]
- [[IaC|Infrastructure as Code]]
- [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 선택: Lambda vs ECS]]
