---
tags: [finops, aws, ecr, docker, lifecycle-policy, cost]
status: done
category: "비용&운영(FinOps)"
aliases: ["ECR Cost Reduction", "ECR Lifecycle Policy", "ECR 비용 절감"]
verified_at: 2026-08-05
---

# ECR 비용 절감 — Lifecycle Policy

Amazon ECR(Elastic Container Registry)은 **저장된 이미지 용량 × 시간**으로 과금한다. AWS 공식 요금 페이지의 프라이빗 리포지토리 예시 기준 저장 단가는 **GB당 월 $0.10**이고(2026-08-05 확인, 리전별 요금표로 재확인 필요), 신규 고객은 12개월간 프라이빗 리포지토리 월 500MB가 프리 티어로 제공된다. 배포마다 새 이미지가 쌓이고 구 이미지가 untagged 상태로 남으면 수개월 만에 수백 GB가 누적되고, 리포지토리 수와 배포 빈도에 따라 월 수백에서 수천 달러까지 올라갈 수 있다.

## 비용이 쌓이는 구조

```
매일 1회 배포 × 이미지 300MB × 365일 = ~109 GB / 리포지토리 / 년
$0.10/GB/월 × 109GB = 월 $10.9 / 리포지토리
100개 리포 = 월 $1,090 (109GB 유지 시 연 $13,080)
```

**전제 조건** — 레이어 재사용 없이 배포마다 300MB가 새로 저장되고, Lifecycle Policy 미적용으로 1년간 아무것도 삭제되지 않으며, 100개 리포가 모두 같은 배포 빈도와 이미지 크기를 가진다고 가정했다. 프리 티어와 리전별 단가 차이는 제외했다. 월 $1,090은 누적량이 109GB에 도달한 **1년차 말 시점** 기준이라 1년차 실제 청구액은 연 $13,080이 아니라 선형 누적을 월별로 합산한 그 절반 수준인 약 $7,000이다. 연 $13,080은 저장량이 109GB에서 멈춰 12개월 유지된다고 가정한 값이고, 삭제 없이 같은 속도로 배포가 이어지면 2년차 저장량은 유지가 아니라 계속 늘어 실제 청구액은 이보다 커진다. 반대로 레이어가 공유되면 실제 증가량은 이보다 작다.

- 새 배포 시 기존 이미지의 태그만 사라지고(untagged) **데이터는 남음** → 자동 삭제되지 않음
- 배포 빈도와 리포지토리 수에 비례해 누적 속도가 빨라짐(누적량 자체는 배포 횟수에 선형)

## ECR Lifecycle Policy — 기본 해법

ECR에 **자동 삭제 규칙**을 설정해 주기적으로 오래된 이미지를 정리한다. 콘솔, CLI, Terraform으로 모두 설정 가능.

### 대표 규칙 패턴

**패턴 1 — Untagged 이미지 즉시 정리**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images older than 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": { "type": "expire" }
    }
  ]
}
```

배포마다 기존 태그가 새 이미지로 교체되면서 구 이미지가 untagged가 된다. 이를 1일 후 삭제하면 롤백 가능 창을 확보하면서 용량은 일정하게 유지.

**패턴 2 — 최근 N개만 유지**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 tagged images for rollback",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["prod-"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }
  ]
}
```

프로덕션 롤백 여유(최근 10개)를 보장하면서 그 이전은 제거. `tagPrefixList`로 환경별 구분 가능.

**패턴 3 — 환경별 차등**

- `dev-*`: 최근 3개만 보존 (실험 많음, 롤백 필요 낮음)
- `stage-*`: 최근 5개 보존
- `prod-*`: 최근 20개 보존 (장기 롤백 가능성)

## 태그 전략이 Lifecycle을 좌우한다

정책이 제대로 작동하려면 **태그 규칙이 일관**되어야 한다.

- **Immutable tag** 설정 권장 — 같은 태그에 덮어쓰기 방지 (버전 추적 명확)
- **커밋 SHA + 환경 접두사**(`prod-abc1234`) 조합이 가장 쉽다
- `latest` 사용은 프로덕션에서 지양 — 롤백 추적 불가
- `-dev` / `-test` / `-prod` 접미사로 환경 분리 → Lifecycle 룰 분기에 활용

## 주의점

- **리포지토리별 개별 적용** — 조직 전체 정책은 IAM, CloudFormation, Terraform으로 표준화해 한꺼번에 배포
- **복구 불가** — 삭제된 이미지는 되돌릴 수 없음. 정책 변경은 최소 dev 환경에서 시뮬레이션
- **실행 이미지 삭제 사고** — ECS Task Definition이 참조하는 이미지를 실수로 제거하면 서비스 배포 실패 → `keep last N` 정책 우선, `expire immediately`는 untagged에만
- **Cross-Region Replication**은 별도 — 복제된 리전의 ECR도 각자 정책 설정 필요

## Terraform 적용 예

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 prod images"
        selection    = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged after 1 day"
        selection    = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

## 측정

- **Before/After 스토리지 사용량** — `aws ecr describe-images`의 `imageDetails[].imageSizeInBytes` 합산 또는 Cost Explorer의 ECR 저장 비용 추이
- **비용 변화** — Cost Explorer에서 ECR 서비스 필터
- **배포 실패율 추이** — 정책이 너무 공격적이면 필요한 이미지도 지워질 수 있음

## 면접 체크포인트

- ECR 요금 구조(저장 용량 × 시간) 설명
- Untagged 이미지가 쌓이는 **배포 패턴** 설명 (같은 태그 재사용 시 이전 버전이 untagged가 됨)
- `expire` vs `keep last N` 전략의 차이, 선택 기준
- 이미지 태그 전략(commit SHA, 환경 접두사)이 Lifecycle과 어떻게 연동되는지
- Immutable tag 설정의 이점

## 출처
- [Amazon ECR pricing — AWS 공식 요금 페이지(저장 $0.10/GB-월, 프리 티어)](https://aws.amazon.com/ecr/pricing/)
- [간단하게 AWS ECR 비용 줄이기 — velog @480](https://velog.io/@480/간단하게-AWS-ECR-비용-줄이기)

## 관련 문서
- [[AWS-Cost-Optimization|AWS 비용 최적화 종합 플레이북]]
- [[CICD-Basics|CI/CD 기초]]
