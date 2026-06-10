---
tags: [infrastructure, aws, s3, object-storage]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 스토리지 모델", "S3 성능 최적화"]
---

# S3 스토리지 모델과 성능

## 핵심 모델 — Bucket / Object / Key

| 개념 | 의미 |
|------|------|
| **Bucket** | 최상위 컨테이너, 리전 내 글로벌 유니크 이름 |
| **Object** | 저장 단위 (최대 5TB, 메타데이터 포함) |
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

100MB+ 파일은 **Multipart Upload** 권장:

| 측면 | 동작 |
|------|------|
| 분할 | 5MB-5GB 단위 part로 분할 |
| 최대 part 수 | **10,000개** (객체당) |
| 병렬 | part를 동시 업로드 → 처리량 ↑ |
| 재개 | 실패한 part만 재업로드 |
| 완료 | `CompleteMultipartUpload`로 합침 |
| 미완료 정리 | **Lifecycle Rule로 미완료 업로드 자동 abort** (안 두면 비용 누적) |

5GB 이상 단일 파일은 Multipart 강제. 객체 최대 크기는 5TB.

## 성능 최적화

### Request Rate

prefix당 초당:
- **3,500 PUT/COPY/POST/DELETE**
- **5,500 GET/HEAD**

key 분포가 한 prefix에 몰리면 throttle. **랜덤, 해시 prefix**로 분산:
```
images/2026/05/file.jpg          ← 한 prefix에 폭주
hash(id)/images/2026/05/file.jpg  ← 분산
```

### Transfer Acceleration

CloudFront 엣지 네트워크로 업로드 — 글로벌 사용자에게 가까운 PoP까지 짧은 hop, 그 후 AWS 백본으로 S3까지. 비용 추가, 효과는 거리 비례.

### Byte-Range Fetch

큰 객체를 범위 단위 병렬 GET — 동영상 스트리밍, 로그 부분 조회.
