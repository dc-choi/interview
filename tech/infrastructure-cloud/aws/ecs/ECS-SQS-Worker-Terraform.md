---
tags: [infrastructure, aws, ecs, terraform, iac, sqs, auto-scaling]
status: done
category: "Infrastructure - AWS"
aliases: ["ECS SQS Worker Terraform", "SQS 워커 Terraform", "ECS backlog autoscaling Terraform"]
---

# SQS 워커 ECS 오토스케일링 Terraform

> 상위 문서: [[ECS-Service-AutoScaling|ECS Service Auto Scaling]]

SQS를 소비하는 ECS 워커를 backlog-per-task로 오토스케일하는 IaC. **공통 리소스 + 옵션 A(Fargate) 또는 옵션 B(EC2)** 구조다. 두 옵션 모두 `aws_ecs_service.worker`를 정의하므로 A와 B를 동시에 쓰면 안 된다. Fargate는 스케일링 레이어 1개, EC2는 2개라는 차이가 코드에 그대로 드러난다([[ECS-Service-AutoScaling]]).

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

## 옵션 A — Fargate (레이어 1로 끝)

캐파시티 프로바이더는 FARGATE와 FARGATE_SPOT만 지정하면 된다. 노드 스케일링이 없다.

```hcl
# fargate.tf
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
}

resource "aws_ecs_task_definition" "worker" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"   # Fargate는 task 레벨 지정 필수
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions    = jsonencode([{ name = "worker", image = var.container_image, essential = true,
    environment = [{ name = "QUEUE_URL", value = aws_sqs_queue.orders.url }], logConfiguration = { logDriver = "awslogs", options = {} } }])
}

resource "aws_ecs_service" "worker" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 1
  capacity_provider_strategy { capacity_provider = "FARGATE"       base = 1  weight = 1 }
  capacity_provider_strategy { capacity_provider = "FARGATE_SPOT"            weight = 4 }
  network_configuration {
    subnets = var.private_subnet_ids  security_groups = [aws_security_group.worker.id]
    assign_public_ip = false
  }
  lifecycle { ignore_changes = [desired_count] }  # 오토스케일링이 관리 → drift 무시
}
```

## 옵션 B — EC2 (레이어 2 추가)

서비스 오토스케일링은 공통 그대로다. **추가되는 것은 캐파시티 프로바이더 + Managed Scaling + ASG뿐**이다.

```hcl
# ec2.tf — 인스턴스 역할/프로파일(AmazonEC2ContainerServiceforEC2Role), ECS 최적화 AMI 생략

resource "aws_launch_template" "ecs" {
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "t3.medium"
  iam_instance_profile { arn = aws_iam_instance_profile.ecs_instance.arn }
  # user_data: echo "ECS_CLUSTER=${cluster}" >> /etc/ecs/ecs.config 로 클러스터 조인
}

resource "aws_autoscaling_group" "ecs" {
  vpc_zone_identifier = var.private_subnet_ids
  min_size = 1   max_size = 10   desired_capacity = 1
  launch_template { id = aws_launch_template.ecs.id  version = "$Latest" }
  protect_from_scale_in = true                        # managed termination protection 필수 조건
  tag { key = "AmazonECSManaged"  value = "true"  propagate_at_launch = true }
}

# 캐파시티 프로바이더 + Managed Scaling (레이어 2, EC2 전용)
resource "aws_ecs_capacity_provider" "ec2" {
  name = "ec2-capacity"
  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"
    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 100   # 100=꽉 채움(저비용), 낮추면 여유 자리 미리 확보
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 10
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.ec2.name]
  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name  base = 1  weight = 1
  }
}

# task def(requires_compatibilities=["EC2"], network_mode="bridge", 컨테이너 레벨 cpu/memory) + service(capacity_provider_strategy=ec2-capacity, ignore_changes=[desired_count])는 공통과 동일
```

## 챙길 포인트

- **`ignore_changes = [desired_count]` 필수**: 안 넣으면 `terraform apply`마다 오토스케일링이 늘려놓은 task 수를 원래대로 되돌린다 (흔한 사고).
- **`target_capacity` 트레이드오프(EC2)**: 100이면 인스턴스를 빈틈없이 채워 비용 최소(대신 스케일아웃 시 인스턴스 뜰 때까지 task 대기). 80~90으로 낮추면 여유 자리를 미리 둬서 task가 더 빨리 뜨지만 비용 약간 증가.
- **metric math 폴백**: `customized_metric_specification`의 `metrics {}` 블록은 비교적 최신 provider에서 지원된다. provider가 낮으면 Lambda가 `BacklogPerTask`를 직접 `PutMetricData`하고(Container Insights 불필요, 0 나누기도 코드에서 차단) 정책은 단일 메트릭 형태로 건다(`namespace`, `metric_name`, `statistic`, `dimensions`).
- **EC2 핵심 차이 재확인**: 서비스 오토스케일링(공통 backlog 정책)은 두 옵션이 토씨 하나 안 틀린다. EC2는 캐파시티 프로바이더 + Managed Scaling이 더해질 뿐이다.

## 관련 문서

- [[ECS-Service-AutoScaling|ECS Service Auto Scaling (backlog-per-task)]]
- [[ECS|Amazon ECS]]
- [[IaC|Infrastructure as Code]]
- [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 선택: Lambda vs ECS]]

## 출처

- [Amazon ECS service auto scaling — AWS 공식 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [terraform-provider-aws — aws_ecs_capacity_provider, aws_appautoscaling_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
</content>
