---
tags: [aws, s3, file-upload, multipart, presigned-url, spring]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 MultiPart Upload", "S3 Presigned URL"]
verified_at: 2026-07-21
---

# S3 파일 업로드 — 클라이언트 직접 전송 (Multipart Upload, Presigned URL)

## 3. S3 Multipart Upload — 대용량의 정석

S3가 제공하는 **파일 분할 업로드 API**. 파일을 여러 Part로 쪼개 병렬 전송한 뒤 S3가 내부적으로 합친다.

### 3단계 흐름

```
1. InitiateMultipartUpload  → uploadId 획득
2. UploadPart × N           → 각 part 번호, ETag 반환
3. CompleteMultipartUpload  → uploadId + (partNumber, ETag) 리스트 전달
   (실패 시) AbortMultipartUpload → 미완료 part 정리
```

### Part 제약

- Part 번호: **1~10,000**
- Part 크기: **5 MB ~ 5 GB** (마지막 part만 5 MB 미만 허용)
- 전체 객체: 2026-09-03 AWS 문서 기준 모든 AWS 리전에서 **최대 50 TB**. User Guide의 이진 단위 표기로는 48.8 TiB
- 권장 Part 크기: 10 MB~100 MB (네트워크, 재시도 비용 균형)

### 성능 이점

- **병렬 업로드**: 여러 part를 동시에 PUT → 대역폭 최대 활용
- **재시도**: 실패한 part만 재전송 (전체 다시 안 올림)
- **성능 사례**: 1.3 GB 비디오가 단일 90s → Multipart 50s (약 45% 단축)

### 미완료 Abort의 중요성

InitiateMultipartUpload 후 Complete도 Abort도 하지 않으면 **part들이 스토리지 비용으로 쌓인다** (보이지 않음).

- **Lifecycle Rule**로 미완료 업로드 7일 후 자동 Abort 설정을 권장하고, 업로드 실패 시에는 앱이 명시적으로 `AbortMultipartUpload` 호출

## 4. Presigned URL — 서버 부담 제거

서버가 **일정 시간 유효한 업로드 URL**을 생성해 클라이언트에 전달. 클라이언트가 이 URL로 **S3에 직접 PUT**.

```java
PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(r -> r
    .signatureDuration(Duration.ofMinutes(15))
    .putObjectRequest(b -> b.bucket(bucket).key(key)));
String uploadUrl = presigned.url().toString();
```

### 장점

- **서버 리소스, 대역폭 소비 0**: 파일 바이트가 서버를 거치지 않음
- **스케일링 용이**: 업로드 트래픽이 늘어도 앱 서버에 영향 없음
- **보안 유지**: 버킷을 Public으로 열지 않고, 시간 한정, 권한 제한된 URL만 발급

### 한계

- **단일 PUT의 최대 5 GB** 제한 (Multipart Presigned는 뒤에서)
- 클라이언트가 올바른 Content-Type, 메타데이터를 보낼 책임
- 발급된 URL은 유효 기간 내 **누구나 사용 가능** → 짧게 설정(5~15분)

### Presigned Multipart Upload

대용량 + Presigned 조합. 서버가 각 part의 Presigned URL을 발급하고 클라이언트가 직접 전송.

```
클라이언트                    서버                  S3
  │  ─ Initiate 요청 →        │                     │
  │                          │  ─ InitiateMultipart → │
  │                          │  ← uploadId ────────  │
  │  ← uploadId + Part URLs ─│                     │
  │  ─ PUT part 1 ────────────────────────────────→ │
  │  ─ PUT part 2 (병렬) ─────────────────────────→ │
  │                                                 │
  │  ─ Complete 요청 (ETag 리스트) → 서버 → S3 Complete  │
```

- 클라이언트는 JavaScript로 파일을 10 MB 단위 분할 → 각 part를 Presigned PUT
- 서버는 **Initiate, Presigned URL 발급, Complete**만 담당 (파일 바이트를 보지 않음)

## 출처

- [AWS What's New — Amazon S3 increases maximum object size to 50 TB](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-maximum-object-size-50-tb/)
- [Amazon S3 User Guide — What's new](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WhatsNew.html)
- [develop-writing — S3 Multipart Upload](https://develop-writing.tistory.com/129)

## 관련 문서

- [[S3-File-Upload|S3 파일 업로드 (TOC)]]
- [[S3-File-Upload-Server-Path|서버 경유 업로드 — Stream, MultipartFile]]
- [[S3-File-Upload-Operations|보안과 운영, 선택 가이드]]
- [[ECR-Cost-Reduction|Lifecycle Rule (스토리지 비용)]]
