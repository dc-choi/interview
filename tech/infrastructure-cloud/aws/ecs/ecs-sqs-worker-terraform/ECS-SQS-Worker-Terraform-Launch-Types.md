---
tags: [infrastructure, aws, ecs, terraform, iac, fargate, ec2, auto-scaling]
status: done
verified_at: 2026-09-22
category: "Infrastructure - AWS"
aliases: ["ECS SQS Worker Terraform Fargate vs EC2", "SQS 워커 Terraform 시작 유형", "ECS Capacity Provider Terraform"]
---

# SQS 워커 ECS 오토스케일링 Terraform — 옵션 A Fargate, 옵션 B EC2

> 상위 문서: [[ECS-SQS-Worker-Terraform|SQS 워커 ECS 오토스케일링 Terraform]]

## 옵션 A — Fargate (레이어 1로 끝)

캐파시티 프로바이더는 FARGATE와 FARGATE_SPOT만 지정하면 된다. 노드 스케일링이 없다.

```hcl
# fargate.tf
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
}

resource "aws_cloudwatch_log_group" "worker" {
  name = "/ecs/${var.service_name}"
}

resource "aws_ecs_task_definition" "worker" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512" # Fargate는 task 레벨 지정 필수
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([{ name = "worker", image = var.container_image, essential = true,
  environment = [{ name = "QUEUE_URL", value = aws_sqs_queue.orders.url }], logConfiguration = { logDriver = "awslogs", options = { "awslogs-group" = aws_cloudwatch_log_group.worker.name, "awslogs-region" = var.region, "awslogs-stream-prefix" = var.service_name } } }])
}
resource "aws_ecs_service" "worker" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 1
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 1
    weight            = 1
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
  }
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.worker.id]
    assign_public_ip = false
  }
  lifecycle {
    ignore_changes = [desired_count]
  }
}
```

## 옵션 B — EC2 (레이어 2 추가)

서비스 오토스케일링은 공통 그대로다. **추가되는 것은 캐파시티 프로바이더 + Managed Scaling + ASG뿐**이다.

```hcl
# ec2.tf — 인스턴스 역할/프로파일(AmazonEC2ContainerServiceforEC2Role), ECS 최적화 AMI 생략
resource "aws_launch_template" "ecs" {
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "t3.medium"
  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs_instance.arn
  }
  # user_data: echo "ECS_CLUSTER=${cluster}" >> /etc/ecs/ecs.config 로 클러스터 조인
}

resource "aws_autoscaling_group" "ecs" {
  vpc_zone_identifier = var.private_subnet_ids
  min_size            = 1
  max_size            = 10
  desired_capacity    = 1
  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }
  protect_from_scale_in = true # managed termination protection 필수 조건
  lifecycle {
    ignore_changes = [desired_capacity]
  }
  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }
}

# 캐파시티 프로바이더 + Managed Scaling (레이어 2, EC2 전용)
resource "aws_ecs_capacity_provider" "ec2" {
  name = "ec2-capacity"
  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"
    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 100 # 100=꽉 채움(저비용), 낮추면 여유 자리 미리 확보
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 10
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.ec2.name]
  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    base              = 1
    weight            = 1
  }
}

# task def(requires_compatibilities=["EC2"], network_mode="bridge", 컨테이너 레벨 cpu/memory) + service(capacity_provider_strategy=ec2-capacity, ignore_changes=[desired_count])는 공통과 동일
```

## 챙길 포인트

- **`ignore_changes = [desired_count]` 필수**: 안 넣으면 `terraform apply`마다 오토스케일링이 늘려놓은 task 수를 원래대로 되돌린다 (흔한 사고).
- **EC2 ASG의 `desired_capacity`도 관리 주체를 분리**: 생성 시에는 1로 시작하되 이후 값은 ECS managed scaling이 조정한다. ASG에도 `ignore_changes = [desired_capacity]`를 두어 Terraform 재적용이 확장된 용량을 1로 되돌리려 하지 않게 한다. 서비스의 `desired_count` 설정과 별개다.
- **`target_capacity` 트레이드오프(EC2)**: 100이면 인스턴스를 빈틈없이 채워 비용 최소(대신 스케일아웃 시 인스턴스 뜰 때까지 task 대기). 80~90으로 낮추면 여유 자리를 미리 둬서 task가 더 빨리 뜨지만 비용 약간 증가.
- **EC2 핵심 차이 재확인**: 서비스 오토스케일링(공통 backlog 정책)은 두 옵션이 토씨 하나 안 틀린다. EC2는 캐파시티 프로바이더 + Managed Scaling이 더해질 뿐이다.

## 출처

- [AWS 공식 문서, Amazon ECS service auto scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [terraform-provider-aws — aws_ecs_capacity_provider, aws_appautoscaling_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS 공식 문서, Send Amazon ECS logs to CloudWatch](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html)
- [HashiCorp, Manage AWS Auto Scaling Groups — Set lifecycle rule](https://developer.hashicorp.com/terraform/tutorials/aws/aws-asg#set-lifecycle-rule)

## 관련 문서

- [[ECS-SQS-Worker-Terraform-Common|공통 리소스 — 큐, IAM, 클러스터, 서비스 오토스케일링]]
- [[ECS|Amazon ECS]]
