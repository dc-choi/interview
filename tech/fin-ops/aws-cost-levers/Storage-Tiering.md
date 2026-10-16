---
tags: [finops, aws, s3, storage, tiering, lifecycle, glacier, ebs, multipart-upload, storage-lens]
status: done
category: "비용&운영(FinOps)"
aliases: ["Storage Tiering", "스토리지 티어링", "S3 storage class", "스토리지 클래스"]
verified_at: 2026-10-14
---

# 스토리지 티어링 (Storage Tiering)

데이터의 접근 빈도가 낮아질 때 더 저렴한 저장 계층으로 옮기는 것이 티어링이다. 모든 데이터가 나이에 따라 덜 사용되는 것은 아니므로 객체 크기, 실제 접근 패턴과 복구 요구를 함께 확인한다. 저장 단가와 **조회 비용/지연을 맞바꾼다**. [[AWS-Pricing]]

## S3 스토리지 클래스

| 클래스 | 단가 | 조회 비용/지연 | 용도 |
|---|---|---|---|
| **Standard** | 높음 | retrieval 요금 없음, 요청 요금 별도/즉시 | 자주 접근 |
| **Intelligent-Tiering** | 계층별 상이 | 자동 이동, 선택형 아카이브는 복원 필요 | 접근 패턴이 변하거나 불명확할 때 검토 |
| **Standard-IA** | 중간 | 조회 요금 + 즉시 | 가끔 접근, 빠른 필요 |
| **One Zone-IA** | 더 낮음 | 조회 요금 | 재생성 가능한 비핵심(단일 AZ) |
| **Glacier Instant** | 낮음 | 조회 요금 + 즉시 | 분기 1회, 즉시 필요 |
| **Glacier Flexible** | 더 낮음 | 분~시간 복원 | 아카이브 |
| **Glacier Deep Archive** | 낮음 | 통상 Standard: 개별 복원 12시간 이내, Batch Operations 사용 시 9~12시간 / Bulk: 48시간 이내 | 규정 보관, 거의 안 봄 |

**핵심 트레이드오프**: 저장 단가가 낮아져도 요청, 조회와 복원 비용까지 합친 총비용은 늘 수 있다. 위 표는 대표 클래스의 비교이며 리전별 견적을 대신하지 않는다. 대규모 복원은 표의 통상 시간보다 오래 걸릴 수 있다.

## Lifecycle Policy로 자동 이동

객체 나이에 따라 클래스를 자동 전환/만료한다.

```
0~30일: Standard
30~90일: Standard-IA
90~365일: Glacier Flexible
365일+: 만료(삭제) 또는 Deep Archive
```

이 예시는 보관 요구와 최소 보관 기간을 확인한 뒤 적용한다. 접근 패턴이 불확실하면 객체 나이만으로 전환하기보다 **Intelligent-Tiering**의 모니터링 비용과 절감 가능성을 비교한다.

## 전환 비용 최적화

- 신규 객체는 업로드 시점에 `StorageClass`를 지정하면 사후 전환 요청을 줄일 수 있다.
- 업로드, COPY, Lifecycle 전환 모두 요청 과금이 발생할 수 있고 단가는 리전과 대상 스토리지 클래스에 따라 다르다.
- COPY는 읽기 요청, 데이터 retrieval, 최소 보관 기간 비용이 추가될 수 있으므로 Lifecycle보다 항상 싸다고 일반화할 수 없다.
- 실제 객체 수, 크기, 현재 클래스, 대상 클래스, 리전으로 AWS Pricing Calculator와 S3 가격표를 사용해 비교한다.

## Intelligent-Tiering 동작과 적용 조건

- 기본 자동 전환: **30일 미접근 → Infrequent Access, 90일 미접근 → Archive Instant Access**. 두 계층의 객체를 `GetObject` 등으로 접근하면 Frequent Access로 돌아온다. `HeadObject`나 목록 조회는 같은 복귀 조건이 아니다.
- 선택형 Archive Access와 Deep Archive Access는 비동기 복원을 허용할 때 활성화한다. 기본 Archive Instant Access와 달리 읽기 전에 복원이 필요하다.
- 비용: 저장, 요청과 객체별 모니터링 비용을 구분한다. Intelligent-Tiering의 Standard와 Bulk 복원은 무료지만 Archive Access의 Expedited 복원은 유료다. 모든 접근 비용이 없다는 뜻이 아니다.
- **128KB 미만 객체는 자동 티어링 대상이 아니다.** 모니터링 요금 없이 Frequent Access에 남는다. 정확히 128KB인 객체는 이 제외 조건에 해당하지 않는다.
- 적용 제안: 128KB 이상 객체 비중, 미접근 기간과 복원 지연 허용 여부로 판단한다. CDN은 필수 조건이 아니며 캐시가 있으면 최종 사용자 요청 수와 S3 접근 횟수를 구분해 본다.

## S3 Inventory로 사전 분석

전환 전에 객체 분포(크기, 개수, 현재 클래스)를 알아야 의사결정이 선다. S3 Inventory는 버킷 전체 또는 설정한 접두사의 객체 메타데이터를 CSV/ORC/Parquet 리포트로 정기 생성한다. Athena로 SQL 분석해 128KB 이상 객체 비중, 총 용량 등을 뽑아 Intelligent-Tiering 적합성을 판단한다.

```sql
SELECT COUNT(*) AS object_count,
       SUM(size)/1024/1024/1024 AS total_size_gb
FROM s3_inventory_table
WHERE size >= 128 * 1024;  -- Intelligent-Tiering 티어 이동 대상
```

## 미완료 멀티파트 업로드 정리

멀티파트 업로드는 시작한 뒤 만료가 없어 완료하거나 중단할 때까지 이미 올라간 part를 보관한다. 최종 객체가 없어도 part 저장 요금이 계속 붙고 업로드 과정의 요청 요금도 붙으므로 티어링 분석과 별도로 확인한다. part는 업로드 때 지정한 스토리지 클래스로 과금하지만 Glacier Flexible Retrieval이나 Deep Archive를 지정한 업로드의 진행 중 part에는 완료 전까지 S3 Standard 저장 단가가 적용된다. 미완료 업로드를 지울 때는 스토리지 클래스와 관계없이 조기 삭제 요금이 없다.

### 찾는 방법

- **객체 목록**: 완료 전에는 객체가 만들어지지 않으므로 객체 목록에 나타나지 않는다.
- **CloudWatch 일간 저장 지표**: 범용 버킷의 `BucketSizeBytes`와 `NumberOfObjects`에는 미완료 part의 크기와 개수도 들어간다. 지표가 객체 목록의 합계보다 크면 이전 버전과 함께 미완료 업로드도 원인 후보로 확인한다.
- **S3 Storage Lens 무료 지표**: 미완료 업로드의 바이트, 개수와 비율, 7일이 지난 미완료 업로드의 바이트와 개수를 버킷 단위까지 내려가 본다. 계정마다 있는 기본 대시보드(`default-account-dashboard`)는 그 계정만 다룬다. 조직 전체는 관리 계정에서 trusted access를 켠 뒤 관리 계정이나 위임 관리자가 만든 조직 수준 대시보드에서 본다. 무료 지표는 매일 집계해 콘솔에서 14일 동안 조회하며 범용 버킷만 대상이다.
- **`ListMultipartUploads`**(CLI `aws s3api list-multipart-uploads`): 버킷의 진행 중 업로드를 요청당 최대 1,000개씩 돌려준다. 버킷마다 호출한다. 범용 버킷은 `s3:ListBucketMultipartUploads` 권한이 필요하고, 디렉터리 버킷은 `s3express:CreateSession` 권한을 주고 세션 기반 인증으로 호출하도록 권장한다.
- **CUR 기반 CUDOS 대시보드(Cloud Intelligence Dashboards)**: Buckets with Incomplete MultiPart Uploads Last 30 Days 시각화는 최근 30일의 리소스별 CUR 행에서 버킷별 `InitiateMultipartUpload` 요청 수와 `CompleteMultipartUpload` 요청 수의 차이를 보여 준다. `line_item_resource_id`는 내보내기에서 리소스 ID 포함을 선택해야 채워진다. 요청 수 차이는 남은 part의 바이트가 아니므로 후보 버킷을 고르는 데 쓰고 용량은 Storage Lens로, 남은 업로드 목록은 `ListMultipartUploads`로 확인한다. 30일보다 먼저 시작해 남아 있는 업로드는 이 차이에 잡히지 않고 이미 중단한 업로드는 차이에 남는다. 오래 남은 업로드는 Storage Lens의 7일 초과 지표로 확인한다.

### Lifecycle 규칙으로 정리한다

- `AbortIncompleteMultipartUpload`의 `DaysAfterInitiation`은 업로드 시작 시점부터 센다. 그 안에 완료되지 않은 업로드는 중단 대상이 되어 S3가 part를 지운다. 이미 진행 중인 업로드에도 적용되고 완료된 객체는 지우지 않는다.
- 객체 만료 규칙은 미완료 업로드를 지우지 않으므로 이 작업을 따로 넣는다. 객체 태그 필터를 쓰는 규칙에는 넣을 수 없으므로 버킷 전체나 접두사로 범위를 정한 규칙에 넣는다.
- 콘솔에서는 버킷의 Management 탭에서 규칙을 만들고 Delete expired object delete markers or incomplete multipart uploads 아래의 Delete incomplete multipart uploads와 일수를 고른다. 버킷 전체 범위는 확인 체크가 필요하다.
- 규칙 반영에는 보통 몇 분이 걸리고, 규칙 조건을 만족한 뒤 실제 작업이 끝나기까지도 지연이 있을 수 있다. 규칙을 바꾸거나 끄기 전에는 `ListMultipartUploads` 같은 LIST API로 실제 정리 결과를 확인한다.
- 개별 업로드는 `AbortMultipartUpload`로 중단한다. 진행 중이던 part 업로드는 중단 뒤에도 성공할 수 있으므로 part 업로드가 끝난 뒤 중단해야 저장 공간이 모두 풀린다. 중단 뒤에는 `ListParts`로 part 목록이 비었는지 확인하고 남아 있으면 다시 중단한다.

### 조직 전체와 IaC의 기본값으로 둔다

- 새 버킷은 템플릿에 규칙을 넣는다. CloudFormation은 `AWS::S3::Bucket` Lifecycle 규칙의 `AbortIncompleteMultipartUpload.DaysAfterInitiation`, Terraform AWS provider는 `aws_s3_bucket_lifecycle_configuration`의 `abort_incomplete_multipart_upload.days_after_initiation`을 쓴다.
- 버킷의 Lifecycle 구성은 하나다. `PutBucketLifecycleConfiguration`은 기존 구성을 덮어쓰고, Terraform에서도 한 버킷에 `aws_s3_bucket_lifecycle_configuration`을 여러 개 선언하면 구성 차이가 계속 생긴다. 기존 버킷에는 현재 규칙과 합친 구성을 적용한다.
- 규칙이 없는 버킷은 Storage Lens 고급 지표로 올린 뒤 advanced cost optimization metrics를 켜면 버킷별 규칙 수 지표 `AbortIncompleteMPULifecycleRuleCount`로 찾을 수 있다. 고급 지표는 추가 요금이 든다.
- 적용 제안: 정상 업로드와 재시도의 최장 시간을 확인해 정리 기준이 진행 중인 업로드를 끊지 않도록 정한다. AWS의 미완료 업로드 정리 안내 문서는 예시 기준으로 7일을 쓰며 Storage Lens 무료 지표도 7일이 지난 미완료 업로드를 따로 집계한다.

## EBS / EFS 티어링

- **EBS gp2 → gp3**: gp3는 IOPS와 처리량을 독립 설정한다. 전환 전 gp2의 크기, 관측 IOPS와 처리량, burst credit 의존성을 확인하고 동등한 gp3 설정의 리전별 비용을 비교한다.
- **io2**: 고IOPS 전용(비쌈) — 정말 필요한 DB만.
- **EBS 스냅샷**: 증분 저장이지만 누적됨 → 보존 정책 필요. [[ECR-Cost-Reduction|ECR lifecycle]]과 같은 발상.
- **EFS Infrequent Access**: Lifecycle 정책에 따라 IA로 이동한다. 접근 시 Standard로 돌아올지는 별도 정책이다.

### EBS 아카이브는 증분 크기 그대로 과금하지 않는다

아카이브한 스냅샷은 전체 스냅샷으로 저장된다. 매일 만든 증분 스냅샷을 모두 아카이브하면 Standard에 유지할 때보다 비용이 늘 수 있다. 최소 아카이브 기간은 90일이며 그 전에 삭제하거나 영구 복원하면 남은 기간의 요금이 발생한다. 볼륨 생성 전에 Standard 계층으로 복원해야 하고 복원에는 최대 72시간이 걸릴 수 있다.

적용 제안: 단가 할인율만 보지 말고 전체 스냅샷 크기, 보관 기간과 복원 목표를 함께 비교한다. 월간, 분기와 연간 보관 후보와 즉시 복구용 백업을 구분한다.

### EFS의 재접근은 자동 복귀를 뜻하지 않는다

EFS는 Standard에서 마지막으로 접근한 시점을 내부 타이머로 추적하며 디렉터리 목록 같은 메타데이터 조회는 파일 접근으로 세지 않는다. IA나 Archive에서 접근해도 기본값으로는 Standard로 돌아오지 않는다. 첫 접근 후 복귀가 필요하면 `TransitionToPrimaryStorageClass: AFTER_1_ACCESS` 정책을 설정한다. 이 전환의 소요 시간은 파일 크기와 파일 시스템 부하에 따라 달라진다.

2026-10-14 부분 검증 범위는 S3 클래스와 복원, Intelligent-Tiering, Inventory, 미완료 업로드의 과금과 탐지, Lifecycle 정리, EBS 아카이브와 EFS Lifecycle이다. 실제 계정의 정책, 비용 절감률과 복원 시간을 시험한 결과는 아니다.

## 관측 데이터와 연결

로그/메트릭 장기 보존도 같은 원리 — 핫은 빠른 스토리지, 콜드는 S3/Glacier. [[Long-Term-Retention]]

## 흔한 함정

- 자주 보는 데이터를 Glacier에 → 조회 요금이 저장 절감 초과
- 작은 객체 다량을 IA/Glacier에 → 최소 객체 크기/기간 과금으로 역효과
- 128KB 미만 객체가 대부분인데 Intelligent-Tiering 절감을 기대 → 자동 티어링 대상이 아니라 효과가 제한적
- gp2의 성능 특성을 확인하지 않고 gp3 전환 후 동일 성능이나 절감을 가정
- 스냅샷/이전 버전이 무한 누적 → lifecycle 미설정
- 객체 만료 규칙만 두고 미완료 멀티파트 업로드도 정리된다고 가정 → `AbortIncompleteMultipartUpload` 작업이 따로 필요
- 기존 버킷에 미완료 업로드 규칙만 담은 구성을 적용 → 기존 Lifecycle 규칙을 덮어씀

## 면접 체크포인트

- 저장 단가 vs 조회 요금/복원 지연의 트레이드오프
- S3 클래스 선택 기준(접근 빈도, 즉시성, 내구 AZ)
- 접근 패턴 불명 시 Intelligent-Tiering을 검토하는 이유와 128KB 조건, 선택형 아카이브와 유료 Expedited 복원
- 전환 비용은 업로드, COPY, Lifecycle의 요청 단가와 retrieval, 최소 보관 기간을 함께 계산해야 하는 이유
- gp2→gp3 전환 전 성능과 비용을 비교하는 이유, io2를 아끼는 이유
- lifecycle 자동 전환/만료와 스냅샷 누적 관리
- S3 Inventory + Athena로 전환 전 객체 분포를 분석하는 이유
- 객체 목록에 없는 미완료 멀티파트 업로드가 과금되는 이유, Storage Lens와 `ListMultipartUploads`와 CUR 요청 수 차이로 찾는 방법, 정리 규칙의 태그 필터 제약

## 출처

- [AWS — S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
- [AWS 공식 문서, Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [AWS 공식 문서, Understanding archive retrieval options](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html)
- [AWS 공식 문서, How S3 Intelligent-Tiering works](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html)
- [AWS 공식 문서, Amazon S3 Inventory](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory.html)
- [AWS 공식 문서, Aborting a multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/abort-mpu.html)
- [AWS 공식 문서, Configuring a bucket lifecycle configuration to delete incomplete multipart uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html)
- [AWS 공식 문서, Uploading and copying objects using multipart upload in Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [AWS 공식 문서, ListMultipartUploads](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListMultipartUploads.html)
- [AWS 공식 문서, AbortMultipartUpload](https://docs.aws.amazon.com/AmazonS3/latest/API/API_AbortMultipartUpload.html)
- [AWS 공식 문서, Lifecycle configuration elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html)
- [AWS 공식 문서, Setting an S3 Lifecycle configuration on a bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-set-lifecycle-configuration-intro.html)
- [AWS 공식 문서, PutBucketLifecycleConfiguration](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html)
- [AWS 공식 문서, Understanding Amazon S3 Storage Lens](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_basics_metrics_recommendations.html)
- [AWS 공식 문서, Amazon S3 Storage Lens metrics glossary](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_metrics_glossary.html)
- [AWS 공식 문서, Metrics and dimensions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html)
- [AWS 공식 문서, Line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [AWS 공식 문서, AWS::S3::Bucket AbortIncompleteMultipartUpload](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-abortincompletemultipartupload.html)
- [Terraform Registry, aws_s3_bucket_lifecycle_configuration](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration)
- [AWS 공식 문서, Considerations and limitations for archiving Amazon EBS snapshots](https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive-considerations.html)
- [AWS 공식 문서, Managing storage lifecycle](https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html)
- [AWS 공식 문서, LifecyclePolicy](https://docs.aws.amazon.com/efs/latest/APIReference/API_LifecyclePolicy.html)
- [AWS — EBS volume types (gp3 vs gp2)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html)
- [S3 비용 최적화 (Intelligent-Tiering, CopyObject 전환, S3 Inventory) — 인프랩 기술블로그](https://tech.inflab.com/20251029-optimize-s3/)
- [How to find and remove incomplete multi part uploads — Amazon Web Services](https://www.youtube.com/watch?v=9mo0xzYw1ao)
- [CUDOS-v5-definition.yaml — Cloud Intelligence Dashboards Framework](https://github.com/aws-solutions-library-samples/cloud-intelligence-dashboards-framework/blob/main/dashboards/cudos/CUDOS-v5-definition.yaml)
- [resource_view.sql (CUDOS) — Cloud Intelligence Dashboards Framework](https://github.com/aws-solutions-library-samples/cloud-intelligence-dashboards-framework/blob/main/cid/builtin/core/data/queries/cudos/resource_view.sql)

## 관련 문서

- [[S3|Amazon S3]]
- [[S3-File-Upload-Direct-Transfer|S3 멀티파트 업로드 흐름과 Abort]]
- [[EBS|EBS (gp3/io2)]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[Long-Term-Retention|장기 보존 (관측 데이터 티어링)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
