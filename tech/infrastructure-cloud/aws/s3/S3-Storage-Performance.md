---
tags: [infrastructure, aws, s3, object-storage]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 스토리지 모델", "S3 성능 최적화", "S3 Express One Zone"]
verified_at: 2026-10-13
---

# S3 스토리지 모델과 성능

## 핵심 모델 — Bucket / Object / Key

| 개념 | 의미 |
|------|------|
| **Bucket** | 최상위 컨테이너. general purpose bucket 이름은 AWS partition 전체에서 고유하고, bucket 자체는 선택한 한 Region에 생성 |
| **Object** | 저장 단위. 모든 리전에서 최대 50 TB, 멀티파트 상한 기준 실제 48.8 TiB |
| **Key** | 객체 식별자 (파일 경로처럼 보이지만 실제론 단일 문자열) |
| **Prefix** | Key의 앞부분, 가상 디렉토리, 성능 파티션 단위 |
| **Version ID** | 버전 관리를 켠 버킷에서 같은 key의 버전마다 부여. 삭제는 delete marker로 처리([[S3-Features-Management]]) |
| **Metadata** | S3가 관리하는 system-defined와 사용자가 붙이는 user-defined(`x-amz-meta-`). 아래 절 참고 |

S3는 **계층형 파일시스템이 아님** — `folder/file.txt`는 단일 키. 리스트 시 prefix로 그룹화.

## 메타데이터와 무결성

- **system-defined**: `Content-Length`, `Last-Modified`, `ETag`, `x-amz-version-id`는 S3만 바꾼다. `Content-Type`, `Cache-Control`, storage class, 서버 측 암호화 같은 값은 사용자가 정한다.
- **user-defined**: `x-amz-meta-` 접두사를 쓰고 키는 소문자로 저장되며 합계 2 KB(PUT 요청 헤더 전체 8 KB)까지다. 업로드 뒤에는 제자리에서 수정할 수 없어 객체를 복사하며 새 메타데이터를 지정한다. 콘솔의 메타데이터 편집도 Copy라 `Last-Modified`가 바뀌고, 버전 관리 버킷에서는 새 버전이 생겨 이전 버전의 저장 비용이 남는다.
- **태그와 annotations**: 태그는 객체당 10개로 IAM과 버킷 정책, Lifecycle, 비용 할당에 쓴다. annotations는 업로드 뒤 객체를 바꾸지 않고 붙이는 이름 있는 데이터(각 최대 1 MB)다.
- **ETag**: multipart가 아니면서 비암호화이거나 SSE-S3인 객체에서만 데이터의 MD5다. multipart, SSE-KMS, SSE-C 객체의 ETag를 MD5와 비교하면 틀린다.
- **checksum**: CRC64NVME(기본), CRC32, CRC32C, SHA-1, SHA-256, SHA-512, MD5, XXHash64, XXHash3, XXHash128을 지원한다. AWS 클라이언트는 업로드 때 checksum을 계산해 보내고 S3가 서버에서 다시 계산해 일치할 때만 저장한다. `Content-MD5` 헤더는 SSE-S3 단일 파트 업로드용 레거시다. 이미 저장된 대량 객체는 S3 Batch Operations의 Compute checksum으로 내려받지 않고 검증한다.

## 내구성과 일관성

- **내구성**: **99.999999999%** (11 9s) — 객체 손실 확률 매우 낮음. One Zone-IA와 Express One Zone을 제외한 클래스는 3개 이상 AZ에 저장하며, 이 두 단일 AZ 클래스는 재해로 인한 AZ의 물리적 손실에 대비하도록 설계되지 않았다
- **가용성**: 99.99% (Standard)
- **Strong Consistency** (2020.12부터) — PUT, DELETE 후 즉시 GET이 최신 결과 보장. 이전엔 덮어쓰기, 삭제가 eventual이었음

## 스토리지 클래스 — 비용, 접근 패턴 트레이드오프

| 클래스 | 접근 빈도 | 최소 보관 | 검색 시간 | 비고 |
|--------|----------|----------|----------|------|
| **Standard** | 자주 | 없음 | 즉시 | 기본 |
| **Express One Zone** | 자주, 지연 민감 | 없음 | 즉시 (한 자릿수 ms 설계) | 선택한 단일 AZ의 directory bucket, 설계 가용성 99.95%. 아래 절 참고 |
| **Intelligent-Tiering** | 가변 | 없음 | 즉시 (선택형 archive 계층은 복원 필요) | 패턴 자동 이동 (모니터링 비용) |
| **Standard-IA** | 가끔 | 30일 | 즉시 | 검색 시 GB당 요금 |
| **One Zone-IA** | 가끔, 재생성 가능 | 30일 | 즉시 | 단일 AZ (가용성↓) |
| **Glacier Instant Retrieval** | 분기 1회 미만 | 90일 | 즉시 | IA보다 저렴 |
| **Glacier Flexible Retrieval** | 연 1-2회 | 90일 | 분~12시간. Expedited 1~5분, Standard 3~5시간, Bulk 5~12시간 | 옛 Glacier |
| **Glacier Deep Archive** | 연 1회 미만 | 180일 | Standard 12시간 이내, Bulk 48시간 이내 (Expedited 미지원) | 가장 저렴 |

**Lifecycle Rule**로 자동 전환 — 30일 후 IA, 90일 후 Glacier, 1년 후 Deep Archive 같은 식.

## Multipart Upload — 대용량 병렬

100 MB 이상 파일은 **Multipart Upload**를 고려하라는 것이 AWS의 일반 지침이다.

| 측면 | 동작 |
|------|------|
| 분할 | 5 MiB-5 GiB 단위 part로 분할. 마지막 part에는 5 MiB 최소값 미적용 |
| 최대 part 수 | **10,000개** (객체당) |
| 병렬 | part를 동시 업로드 → 처리량 ↑ |
| 재개 | 실패한 part만 재업로드 |
| 완료 | `CompleteMultipartUpload`로 합침 |
| 미완료 정리 | **Lifecycle Rule로 미완료 업로드 자동 abort** (안 두면 비용 누적) |

단일 PUT은 최대 5 GB이므로 그보다 큰 객체는 Multipart Upload가 필요하다. 객체 최대 크기는 모든 AWS 리전에서 50 TB, 멀티파트 상한 기준 실제 48.8 TiB다. 단일 GET도 최대 5 TB이므로 그보다 큰 객체는 byte-range 병렬 GET을 사용한다.

## 성능 최적화

### Request Rate

general purpose bucket 기준 prefix당 초당:
- **3,500 PUT/COPY/POST/DELETE**
- **5,500 GET/HEAD**

S3는 높은 요청률로 점진적으로 확장한다. 한 prefix의 요청률이 지속적으로 기준을 넘으면 확장 중 503 Slow Down이 나타날 수 있어, 매우 높은 병렬 처리량이 필요할 때 여러 prefix로 분산하고 지수 backoff를 적용한다.
```
images/2026/05/file.jpg          ← 한 prefix에 폭주
hash(id)/images/2026/05/file.jpg  ← 분산
```

### HTTP 500과 503의 진단과 재시도

이 절은 2026-10-08 AWS 공식 문서 기준이다. `500 InternalError`는 해당 요청을 처리하지 못한 상태이고, `503 SlowDown`은 급격한 요청 증가나 확장 중에 나타날 수 있다. HTTP 상태만 보고 원인을 하나로 확정하지 않고 오류 코드, 요청 대상과 부하 변화를 함께 확인한다.

1. AWS SDK의 재시도 설정을 먼저 확인한다. SDK를 쓰지 않는 경로에는 exponential backoff를 적용한다. 운영 설정에서는 총 시도 횟수와 요청 제한 시간을 정해 재시도가 부하를 증폭시키지 않도록 한다.
2. 대량 작업은 낮은 동시성에서 시작해 점진적으로 늘린다. Prefix 분산은 높은 요청률이 필요한 경우의 수단이며 prefix만 생성한다고 처리 자원이 미리 할당되지는 않는다.
3. CloudWatch의 S3 request metrics를 활성화하고 `5xxErrors`를 본다. `Sum`은 기간의 오류 건수, `Average`는 요청 대비 오류 비율이므로 두 통계의 알람 기준을 구분한다. Request metrics도 best-effort로 전달되므로 지연과 누락이 가능하다.
4. 개별 실패는 애플리케이션 로그와 S3 server access log로 좁힌다. S3 버킷으로 전달한 access log는 Athena로 조회할 수 있지만, 전달 지연과 누락 또는 중복이 가능해 전체 요청의 완전한 장부로 쓰지 않는다.

오류가 지속되면 실패 요청의 S3 request ID 쌍을 확보해 지원 요청에 포함한다. 재시도 성공 여부와 최종 실패율을 나눠 측정하는 것은 애플리케이션 운영 점검 항목이다.

### 전송 지연을 클라이언트와 S3 처리 시간으로 나눈다

이 절은 2026-10-09 AWS 공식 문서 기준이다. 파일 전송 전체가 느리다는 사실만으로 S3 내부 처리가 느리다고 판단하지 않는다. DNS 조회, 네트워크 지연과 전송 속도, 클라이언트 CPU와 메모리 사용을 함께 측정한다. 가능하면 EC2와 버킷을 같은 리전에 두어 네트워크 지연을 줄인다.

S3 server access log의 시간 필드는 클라이언트가 측정한 전체 시간과 범위가 다르다.

| 측정값 | 범위와 해석 |
|---|---|
| `Total Time` | 서버가 요청을 받은 시점부터 응답의 마지막 바이트를 보낸 시점까지의 밀리초. 클라이언트 측 측정에는 추가 네트워크 지연이 포함될 수 있음 |
| `Turn-Around Time` | 요청의 마지막 바이트를 받은 시점부터 응답의 첫 바이트를 보낸 시점까지의 밀리초. 클라이언트의 전체 업로드 시간과 같지 않음 |

예를 들어 전체 업로드는 오래 걸리지만 `Turn-Around Time`이 짧다면, 그 값만으로 전체 경로가 정상이라고 결론 내릴 수 없다. 위 측정 범위를 근거로 클라이언트 자원과 네트워크 구간을 추가 확인한다(진단 제안). 로그의 `-`는 해당 값이 없거나 적용되지 않는다는 뜻이며 0밀리초로 해석하지 않는다.

### Transfer Acceleration

AWS edge location을 통해 업로드한 뒤 AWS 네트워크로 S3에 전달한다. 추가 비용이 들며 개선 폭은 거리뿐 아니라 회선과 네트워크 상태에 따라 달라지므로 AWS Speed Comparison 도구나 실제 측정으로 결정한다.

### Byte-Range Fetch

큰 객체를 범위 단위 병렬 GET — 동영상 스트리밍, 로그 부분 조회.

### Mountpoint: 사전 다운로드와 파일시스템 호환성을 나눠 본다

2026-10-10 AWS 제품 문서와 Mountpoint의 공개 동작 명세 대조 기준이다. Mountpoint for Amazon S3는 `open`, `read` 같은 파일 연산을 S3 API로 바꾸는 Linux용 클라이언트다. 대용량 객체를 읽는 분석 작업에서 전체 입력을 먼저 로컬에 내려받는 방식과 비교할 수 있지만, 완전한 POSIX 파일시스템을 제공하지는 않는다.

| 작업 특성 | 확인할 제약 |
|---|---|
| 큰 참조 파일 읽기 | 순차 읽기와 seek를 포함한 임의 읽기를 지원한다. 필요한 데이터는 S3에서 전송되므로 다운로드 시간이 모두 없어지는 것은 아니다 |
| General purpose bucket의 결과 파일 쓰기 | 파일 시작부터 순차 쓰기한다. 기존 객체 교체는 `--allow-overwrite`와 `O_TRUNC` 조건을 확인한다 |
| 로컬 파일시스템 전제 | General purpose bucket의 파일 rename, symbolic link와 파일 잠금에 의존하는 코드는 그대로 호환된다고 가정하지 않는다 |
| 여러 작업의 동시 출력 | 여러 Mountpoint 인스턴스가 같은 객체에 쓰는 작업을 서로 조정해 주지 않는다 |

S3 Express One Zone의 append와 rename 지원은 별도 조건이다. 위 general purpose bucket의 쓰기 제약을 모든 버킷 유형에 확대하지 않는다.

분석 파이프라인에 적용할 때는 입력 준비 시간, 실제 계산 시간, S3 요청과 전송량을 나눠 측정한다. 서로 다른 실행의 출력 key를 분리하고, 파일 API 호환성 및 결과 동등성을 작은 기준 데이터로 확인하는 것은 설계 점검 제안이다. 한 사례의 처리 시간이나 비용 절감률을 다른 분석 엔진에도 보장되는 값으로 쓰지 않는다.

## S3 Express One Zone을 고르기 전에 확인할 계약

2026-10-13 Amazon S3 사용자 가이드 기준이며, AZ에 만든 directory bucket을 다룬다. S3 Express One Zone(`EXPRESS_ONEZONE`)은 지연 시간에 민감한 애플리케이션에 일관된 한 자릿수 밀리초 접근을 제공하도록 만든 단일 AZ 스토리지 클래스다. 객체는 사용자가 고른 AZ의 directory bucket에 저장되며, 그 AZ 안의 여러 장치에는 중복 저장하지만 AZ 사이에는 중복 저장하지 않는다. 설계 가용성은 99.95%다.

| 항목 | 계약 |
|---|---|
| 위치 | 버킷을 만들 때 Region과 AZ를 고르며 EC2, EKS, ECS 컴퓨트와 같은 AZ를 권장한다. AZ 이름과 물리 위치의 대응은 계정마다 다를 수 있어 계정 사이에서는 AZ ID로 맞춘다. 서울 리전의 지원 AZ ID는 `apne2-az3` 하나다 |
| 네트워크 | 버킷 관리 API는 Regional endpoint, 객체 API는 Zonal endpoint를 쓴다. VPC에서는 gateway endpoint로 추가 비용 없이 접근하며, S3용 AWS PrivateLink는 지원하지 않는다 |
| 인증 | Zonal API는 `CreateSession`이 발급한 버킷 범위 임시 자격 증명을 쓰고, 이 자격 증명은 5분 뒤 만료된다. 콘솔, CLI와 SDK는 세션을 대신 만든다. `CopyObject`와 `HeadBucket`은 IAM 자격 증명으로 서명하지만 권한은 다른 Zonal API처럼 `s3express:CreateSession`으로 판정한다. 접근 제어 경계는 버킷 단위뿐이다 |
| 미지원 기능 | Versioning, Object Lock, Replication, Event Notifications, 객체 태그, Lifecycle 전환, server access log, Transfer Acceleration, SSE-C, DSSE-KMS, MD5 checksum, AWS 관리형 정책 등. 객체 API 호출은 CloudTrail data event로 기록할 수 있다 |
| 동작 차이 | `ListObjectsV2`는 사전순으로 반환하지 않고 delimiter는 `/`만 허용한다. 객체를 지우면 비게 된 상위 디렉터리도 지워진다. ETag는 MD5가 아닌 무작위 문자열이고 multipart part 번호는 연속이어야 한다. CLI `s3 sync` 대신 `s3 cp --recursive`를 쓴다 |

Directory bucket의 Lifecycle은 객체 만료와 미완료 multipart upload 삭제 규칙을 지원하고 클래스 전환은 지원하지 않는다. S3 Lifecycle 서비스 주체(`lifecycle.s3.amazonaws.com`)에 `ReadWrite` 세션 모드의 `s3express:CreateSession`을 허용하지 않았거나 활성 정책이 그 주체의 삭제 권한을 명시적으로 거부하면 객체가 만료되지 않는다. CLI `s3 rm`, Mountpoint의 삭제와 콘솔의 Empty는 진행 중인 multipart upload를 지우지 못하므로 `ListMultipartUploads`로 찾아 `AbortMultipartUpload`로 정리한다.

같은 AZ의 컴퓨트가 작은 단위 접근이나 무작위 접근을 많이 해서 저장소 지연이 처리 시간을 좌우하고, AZ를 잃어도 원본에서 다시 만들 수 있는 학습 입력, 대화형 분석 입력과 중간 산출물에 맞다(설계 제안). 유일한 원본이나 버전 관리, 복제, 이벤트 알림이 필요한 데이터는 general purpose bucket의 다중 AZ 클래스(Standard, Standard-IA 등)에 둔다(설계 제안). 도입 전에는 컴퓨트 서브넷의 AZ ID, `s3express:CreateSession` 기반 정책, 정렬된 목록과 ETag 비교에 기대는 코드를 점검하고, 위 5xx 진단의 server access log 대신 CloudTrail data event를 조사 경로로 준비하며 request metrics 지원 여부도 확인한다. 비용은 저장 기간, 요청 수와 전송량을 실제 접근 패턴으로 넣어 S3 요금표에서 비교한다(설계 제안).

## 출처
- [Amazon S3 User Guide, Mount an Amazon S3 bucket as a local file system](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mountpoint.html)
- [Mountpoint for Amazon S3 file system behavior — AWS Labs](https://github.com/awslabs/mountpoint-s3/blob/main/doc/SEMANTICS.md)
- [Amazon S3 User Guide, Performance guidelines for Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-guidelines.html)
- [Amazon S3 User Guide, Amazon S3 server access log format](https://docs.aws.amazon.com/AmazonS3/latest/userguide/LogFormat.html)
- [Troubleshoot HTTP 5xx errors from Amazon S3 — AWS re:Post](https://repost.aws/knowledge-center/http-5xx-errors-s3)
- [Amazon S3 User Guide, Metrics and dimensions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html)
- [Amazon S3 User Guide, Monitoring metrics with Amazon CloudWatch](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudwatch-monitoring.html)
- [Amazon S3 User Guide, Logging requests with server access logging](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html)
- [AWS What's New — Amazon S3 increases maximum object size to 50 TB](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/)
- [Amazon S3 User Guide — What's new](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WhatsNew.html)
- [Amazon S3 multipart upload limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html)
- [Amazon S3 performance design patterns](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-design-patterns.html)
- [Amazon S3 User Guide, Amazon S3 objects overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html)
- [Amazon S3 User Guide, S3 Glacier storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html)
- [Amazon S3 User Guide, Archive retrieval options](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html)
- [Amazon S3 User Guide, Working with object metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html)
- [Amazon S3 User Guide, Editing object metadata in the Amazon S3 console](https://docs.aws.amazon.com/AmazonS3/latest/userguide/add-object-metadata.html)
- [Amazon S3 User Guide, Checking object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)
- [Amazon S3 User Guide, High performance workloads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-high-performance.html)
- [Amazon S3 User Guide, Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [Amazon S3 User Guide, Differences for directory buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-differences.html)
- [Amazon S3 User Guide, Authorizing Zonal endpoint API operations with CreateSession](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-create-session.html)
- [Amazon S3 User Guide, S3 Express One Zone Availability Zones and Regions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-Endpoints.html)
- [Amazon S3 User Guide, Working with S3 Lifecycle for directory buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-objects-lifecycle.html)
- [AWS Builder를 위한 2024년 AWS가 선보이는 혁신적인 클라우드 서비스 — Amazon Web Services Korea](https://www.youtube.com/watch?v=UlLKTq0fxI0) — re:Invent 2023에서 소개된 서비스를 다룬 2024-08 공개 발표. 본문의 계약은 위 공식 문서로 다시 대조했다
- [인프런, Sungmin Kim, S3란?](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43742)
- [인프런, Sungmin Kim, S3 실습 1부](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=45759)

## 관련 문서

- [[S3|S3 개요]]
- [[S3-Features-Management|S3 기능과 데이터 관리]]
