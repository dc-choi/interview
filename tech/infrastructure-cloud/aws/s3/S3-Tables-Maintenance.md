---
tags: [aws, s3, iceberg, data-lake, maintenance]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["S3 Tables 유지보수", "S3 Tables Maintenance", "관리형 Iceberg 테이블"]
---

# S3 Tables와 Iceberg 유지보수 경계

S3 Tables는 분석용 테이블을 저장하는 서비스다. 일반 목적 버킷에 파일을 직접 관리하는 구성과 달리, table bucket 안에 Apache Iceberg 테이블을 둔다. 조회에는 Athena, Redshift, Spark 같은 호환 엔진을 사용한다. 저장소와 쿼리 엔진의 역할을 구분한다.

## 자동화되는 세 가지 작업

2026-10-07 AWS 공식 문서 기준으로 아래 작업은 기본 활성화되며 설정을 변경하거나 비활성화할 수 있다.

| 작업 | 설정 단위 | 하는 일 |
|---|---|---|
| Compaction | 테이블 | 작은 파일을 큰 파일로 합쳐 조회 효율 개선, 행 단위 삭제 반영 |
| Snapshot management | 테이블 | 보존 개수와 기간에 따라 스냅샷 만료 |
| Unreferenced file removal | Table bucket | 참조되지 않는 파일을 비현재 상태로 표시한 뒤 삭제, 버킷 내 모든 테이블에 적용 |

Compaction은 새 스냅샷을 만든다. 스냅샷 만료와 실제 파일 삭제는 별도 작업이므로, 만료 직후 저장 용량이 모두 줄었다고 가정하지 않는다. Compaction에는 추가 비용도 발생한다. [테이블 유지보수](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-maintenance.html)

## 스냅샷 만료와 파일 삭제

만료된 스냅샷만 참조하던 파일은 noncurrent로 표시되고, 파일 정리 정책의 유예기간이 지난 뒤 삭제된다. 삭제된 파일은 복구할 수 없다. 테이블 외부의 참조는 삭제 방지 근거로 취급되지 않는다. [버킷 유지보수](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-table-buckets-maintenance.html)

적용할 때는 필요한 과거 조회 기간, 장기 실행 작업과 복구 요구를 먼저 정하고 보존 정책을 맞춘다. 이는 삭제 동작에서 도출한 운영 점검 기준이며, 자동 유지보수만으로 백업과 복구 요구가 충족된다는 뜻은 아니다.

### Iceberg 설정과 서비스 설정의 충돌

확인 시점의 S3 Tables snapshot management는 다음 조건에서 테이블 전체의 자동 스냅샷 만료에 실패한다.

- 사용자 정의 Iceberg tag 또는 branch가 존재한다.
- Iceberg 테이블 속성에 `history.expire.max-snapshot-age-ms` 또는 `history.expire.min-snapshots-to-keep`이 설정돼 있다.

보존은 S3 Tables의 유지보수 설정으로 관리하고, 작업 상태는 `GetTableMaintenanceJobStatus`로 확인한다. 기존 tag나 branch를 제거하기 전에는 사용하는 작업과 보존 요구를 확인한다. [제약과 상태 조회](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-maintenance.html)

## 권한과 도입 판단

S3 Tables는 `s3tables` 서비스 네임스페이스를 사용한다. 일반 S3 권한만으로 테이블 접근이 해결됐다고 가정하지 않는다. Glue Data Catalog 통합은 분석 서비스가 테이블을 발견하고 접근하도록 연결하는 기능이며, 접근 권한 설계는 별도로 필요하다. [기능과 접근 관리](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables.html)

### 분석 통합과 조회 권한은 다르다

2026-10-07 공식 문서 기준, Lake Formation으로 분석 서비스에 통합한 table bucket은 IAM과 Lake Formation의 권한 검사를 모두 통과해야 조회할 수 있다. 카탈로그가 보인다는 사실만으로 데이터 조회 권한이 생기지 않는다.

- 통합을 수행한 사용자 외에 다른 IAM 사용자나 역할이 조회하려면 필요한 Lake Formation 권한을 부여한다.
- 메타데이터 접근 권한과 실제 데이터의 읽기, 쓰기 권한을 구분한다.
- Lake Formation 권한은 부여한 리전에 적용된다. 다른 리전에도 같은 권한이 있다고 가정하지 않는다.

따라서 검증할 때는 관리자 계정의 성공만 확인하지 않고 실제 분석 작업이 사용하는 역할로 조회한다. 이 절은 Lake Formation 통합 경로에 대한 설명이다. [테이블과 데이터베이스 접근 관리](https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-permissions-tables.html)

### Table bucket policy와 table policy의 범위

2026-10-09 공식 접근 관리 문서로 확인한 추가 범위다. 유지보수 절 전체를 재검증한 것은 아니므로 문서의 `verified_at`은 유지한다.

S3 Tables의 테이블은 `s3tables` 네임스페이스의 ARN으로 식별한다. 일반 S3 객체 prefix 권한을 그대로 복사하는 대신, 테이블 ARN과 필요한 `s3tables` 작업을 기준으로 권한을 정한다.

- **Table bucket policy**는 버킷과 namespace 수준 작업, 여러 테이블에 공통인 권한을 관리할 수 있다.
- **Table policy**는 개별 테이블의 작업 권한을 관리한다.
- 요청은 IAM 정책과 관련 리소스 정책을 함께 평가한다. 버킷 정책이 삭제를 허용해도 테이블 정책이 `DeleteTable`을 명시적으로 거부하면 삭제할 수 없다.
- 데이터 읽기와 메타데이터 접근도 구분한다. 공식 SELECT 예시는 `s3tables:GetTableData`와 `s3tables:GetTableMetadataLocation`을 함께 허용한다.

따라서 접근 실패는 테이블 식별자, 작업 권한, 명시적 거부와 사용하는 분석 통합의 추가 권한 순서로 확인한다. ARN 단위로 관리할 수 있다는 사실이 Lake Formation 검사나 명시적 거부를 없애지는 않는다.

### 자체 관리와 비교할 질문

- 작은 파일 병합과 스냅샷 정리에 실제로 얼마나 운영 시간이 드는가?
- 현재 엔진과 카탈로그, 권한 구성이 table bucket에 연결되는가?
- 유지보수 비용을 포함해 같은 데이터와 쿼리에서 총비용이 개선되는가?
- 유지보수 실패와 데이터 복구를 누가 확인하는가?

관리형 서비스의 효과는 반복 유지보수 부담을 줄이는 데서 평가한다. 개별 고객 사례의 비용 절감률을 다른 데이터 레이크의 예상 절감률로 옮기지 않는다.

## 출처

- [AWS, Working with Amazon S3 Tables and table buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables.html)
- [AWS, Maintenance for tables](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-maintenance.html)
- [AWS, Maintenance for table buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-table-buckets-maintenance.html)
- [AWS, Managing access to a table or database with Lake Formation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-permissions-tables.html)
- [AWS, Access management for S3 Tables](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-setting-up.html)
- [AWS, Resource-based policies for S3 Tables](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-resource-based-policies.html)

## 관련 문서

- [[S3|Amazon S3]]
- [[Redshift|Redshift와 레이크 테이블 조회]]
- [[IAM|IAM 권한 평가]]
