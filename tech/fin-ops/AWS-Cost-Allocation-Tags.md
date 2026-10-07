---
tags: [finops, aws, tagging, cost-allocation, eks]
status: done
verified_at: 2026-10-07
category: "비용&운영(FinOps)"
aliases: ["AWS 비용 할당 태그", "AWS Cost Allocation Tags"]
---

# AWS 비용 할당 태그

## 태깅과 비용 보고는 별도 단계다

리소스에 태그를 붙이는 작업은 비용 귀속의 입력을 만드는 단계다. 사용자 정의 태그를 청구 보고서에 쓰려면 Billing and Cost Management에서 해당 **태그 키를 활성화**해야 한다. 활성화와 비활성화는 같은 키를 사용하는 모든 값에 적용된다.

태그 적용 후 활성화 목록에 키가 나타나기까지 최대 24시간, 활성화 처리에 다시 최대 24시간이 걸릴 수 있다. 태깅 직후 비용 보고서에 값이 없다는 이유만으로 자동화 실패라고 판단하지 않는다.

## 비용 질문에서 태그를 정한다

다음은 태그 설계 예시이며 AWS가 강제하는 필수 키 목록은 아니다.

| 비용 질문 | 예시 키 | 값의 기준 |
|---|---|---|
| 어느 업무가 사용하는가 | `service` | 서비스 분류표 |
| 어느 환경인가 | `environment` | 운영, 검증, 개발 환경의 표준값 |
| 누가 비용을 검토하는가 | `team` | 개인 이름 대신 담당 팀 |

태그를 늘리기 전에 키별 책임자와 허용값을 정한다. 리소스 이름에서 팀을 추정해야 한다면 확정된 명명 규칙과 예외 목록을 먼저 확인한다. 모호한 값은 자동으로 덮어쓰지 않고 미분류로 남기는 편이 비용 귀속 오류를 줄인다.

## 자동화에서 놓치기 쉬운 범위

- Resource Groups Tagging API의 `GetResources`는 현재 태그가 있거나 과거에 태그가 있었던 리소스를 조회한다. `TagFilters`가 없으면 태그를 제거한 리소스도 빈 `Tags` 목록으로 반환될 수 있지만, 태그를 붙인 적 없는 리소스까지 전수 발견하지는 못한다. 미태깅 자산 탐색에는 AWS Resource Explorer의 `tag:none` 검색을 함께 검토한다.
- EKS 태그는 Kubernetes label이나 annotation과 별개의 메타데이터다. EKS 리소스에 붙인 태그가 연결된 다른 리소스로 자동 전파된다고 가정하지 않는다.
- `aws:eks:cluster-name`은 EKS에 참여하는 EC2 인스턴스 비용을 클러스터별로 나누는 AWS 생성 태그다. Control plane 비용은 포함하지 않으며, 비용 분석에 쓰려면 활성화해야 한다.
- EKS 태그 키와 값은 대소문자를 구분한다. 표준 표기는 한 가지로 정하되, 대문자를 쓰면 청구 데이터가 반드시 깨진다는 규칙으로 확대하지 않는다.

## 과거 태그와 공유 비용은 별도로 처리한다

2026-10-07 공식 문서 기준, 관리 계정 사용자는 최대 12개월의 비용 할당 태그 backfill을 요청할 수 있다. 현재 활성화 상태를 과거 기간에 적용하는 기능이며, 리소스에 태그가 없었던 기간의 값을 새로 만들어 주지는 않는다. 현재 비활성화된 키를 backfill하면 과거 비용 데이터에서도 그 키가 비활성화될 수 있다.

Cost Categories는 계정, 서비스, 태그 등의 규칙으로 비용을 묶는다. 일반 분류 결과와 공유 비용의 **split charge 계산 결과**는 구분한다.

| 배분 방식 | 기준 |
|---|---|
| Proportional | 각 대상의 비용에 비례 |
| Fixed | 사용자가 정한 비율 |
| Even split | 대상에 균등 배분 |

공유 비용을 source로 먼저 분류한 뒤 대상 category 값에 나눈다. 규칙은 위에서 아래로 평가되므로 공유 비용 분류 규칙의 순서를 확인한다. 같은 값을 split charge의 source와 target으로 동시에 쓰지는 못한다.

**Split charge 결과는 Cost Categories 상세 페이지와 다운로드 CSV에서 확인한다. CUR와 Cost Explorer의 비용을 바꾸거나 다른 비용 관리 도구로 배분 결과를 전달하지 않는다.** 내부 비용 보고에 사용할 때는 원래 청구 비용과 배분 후 비용을 분리해 표시한다. 예산 경보도 자동으로 배분 후 금액을 감시한다고 가정하지 않는다.

## 운영 완료 기준

다음은 태깅 결과와 비용 보고의 연결을 확인하는 점검 절차다.

1. 대상 계정, 리전과 리소스 종류의 목록을 확보한다.
2. 미태깅 자산과 잘못 분류된 자산을 나누고, 기존 값의 변경 사유를 기록한다.
3. 태그 키 활성화와 처리 지연을 확인한다.
4. 대표 리소스의 실제 비용 행을 확인하고, 태그로 귀속되지 않는 비용은 별도로 남긴다.

비용 분류를 완료해도 유휴 여부가 증명된 것은 아니다. 삭제나 축소는 실제 사용 지표와 의존성을 따로 확인한다.

## 출처

- [AWS Billing, Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Resource Groups Tagging API, GetResources](https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/API_GetResources.html)
- [Amazon EKS, Organize Amazon EKS resources with tags](https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html)
- [AWS Billing, Backfill cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Billing, Creating cost categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/create-cost-categories.html)
- [AWS Billing, Splitting charges within cost categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화]]
- [[Cost-Anomaly|비용 이상 탐지]]
- [[EKS|Amazon EKS]]
