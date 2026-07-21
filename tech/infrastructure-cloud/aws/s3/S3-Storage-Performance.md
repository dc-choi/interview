---
tags: [infrastructure, aws, s3, object-storage]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 스토리지 모델", "S3 성능 최적화"]
verified_at: 2026-07-21
---

# S3 스토리지 모델과 성능

## 핵심 모델 — Bucket / Object / Key

| 개념 | 의미 |
|------|------|
| **Bucket** | 최상위 컨테이너. general purpose bucket 이름은 AWS partition 전체에서 고유하고, bucket 자체는 선택한 한 Region에 생성 |
| **Object** | 저장 단위. 최대 50 TB, 단 AWS GovCloud (US) Regions는 5 TB |
| **Key** | 객체 식별자 (파일 경로처럼 보이지만 실제론 단일 문자열) |
| **Prefix** | Key의 앞부분, 가상 디렉토리, 성능 파티션 단위 |

S3는 **계층형 파일시스템이 아님** — `folder/file.txt`는 단일 키. 리스트 시 prefix로 그룹화.

## 내구성과 일관성

- **내구성**: **99.999999999%** (11 9s) — 객체 손실 확률 매우 낮음. 다중 AZ 자동 복제
- **가용성**: 99.99% (Standard)
- **Strong Consistency** (2020.12부터) — PUT, DELETE 후 즉시 GET이 최신 결과 보장. 이전엔 덮어쓰기, 삭제가 eventual이었음

## 스토리지 클래스 — 비용, 접근 패턴 트레이드오프

| 클래스 | 접근 빈도 | 최소 보관 | 검색 시간 | 비고 |
|--------|----------|----------|----------|------|
| **Standard** | 자주 | 없음 | 즉시 | 기본 |
| **Intelligent-Tiering** | 가변 | 없음 | 즉시 | 패턴 자동 이동 (모니터링 비용) |
| **Standard-IA** | 가끔 | 30일 | 즉시 | 검색 시 GB당 요금 |
| **One Zone-IA** | 가끔, 재생성 가능 | 30일 | 즉시 | 단일 AZ (가용성↓) |
| **Glacier Instant Retrieval** | 분기 1회 미만 | 90일 | 즉시 | IA보다 저렴 |
| **Glacier Flexible Retrieval** | 연 1-2회 | 90일 | 분~5시간 | 옛 Glacier |
| **Glacier Deep Archive** | 연 1회 미만 | 180일 | 12시간 | 가장 저렴 |

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

단일 PUT은 최대 5 GB이므로 그보다 큰 객체는 Multipart Upload가 필요하다. 일반 AWS Regions의 객체 최대 크기는 50 TB이고 GovCloud (US)는 5 TB다.

## 성능 최적화

### Request Rate

prefix당 초당:
- **3,500 PUT/COPY/POST/DELETE**
- **5,500 GET/HEAD**

S3는 높은 요청률로 점진적으로 확장한다. 한 prefix의 요청률이 지속적으로 기준을 넘으면 확장 중 503 Slow Down이 나타날 수 있어, 매우 높은 병렬 처리량이 필요할 때 여러 prefix로 분산하고 지수 backoff를 적용한다.
```
images/2026/05/file.jpg          ← 한 prefix에 폭주
hash(id)/images/2026/05/file.jpg  ← 분산
```

### Transfer Acceleration

AWS edge location을 통해 업로드한 뒤 AWS 네트워크로 S3에 전달한다. 추가 비용이 들며 개선 폭은 거리뿐 아니라 회선과 네트워크 상태에 따라 달라지므로 AWS Speed Comparison 도구나 실제 측정으로 결정한다.

### Byte-Range Fetch

큰 객체를 범위 단위 병렬 GET — 동영상 스트리밍, 로그 부분 조회.

## 출처
- [AWS What's New — Amazon S3 increases maximum object size to 50 TB](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/)
- [Amazon S3 User Guide — What's new](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WhatsNew.html)
- [Amazon S3 multipart upload limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html)
- [Amazon S3 performance design patterns](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-design-patterns.html)
