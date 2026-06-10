---
tags: [aws, s3, file-upload, multipart, presigned-url, spring]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 File Upload", "S3 MultiPart Upload", "S3 Presigned URL", "대용량 파일 업로드"]
---

# S3 파일 업로드 — Stream·MultipartFile·Multipart Upload·Presigned URL

파일을 S3에 올리는 방식은 **클라이언트→서버→S3** 경로와 **클라이언트→S3 직접** 경로 두 계열로 나뉜다. 파일 크기·보안 요구·프론트 UX에 따라 4가지 방식을 선택적으로 조합해 쓴다.

## 방식 개관

| 방식 | 경로 | 최대 크기 | 장점 | 단점 |
|---|---|---|---|---|
| **Stream Upload** | 클라 → 서버 → S3 (stream) | 실무상 수백 MB | 디스크 I/O 없음 | 속도 느림 (서버 bandwidth 병목) |
| **MultipartFile** | 클라 → 서버 → S3 | 수 MB ~ 수백 MB | Spring 기본 지원, 구현 단순 | 서버 메모리·디스크 부담 |
| **S3 Multipart Upload** | 클라 → S3 (part 단위 병렬) | **최대 5 TB** | 병렬 전송, 재시도 가능 | 구현 복잡 |
| **Presigned URL** | 클라 → S3 직접 (한 번에) | 한 PUT당 **5 GB** | 서버 부담 없음 | 단일 요청 크기 한계 |

**Presigned URL + Multipart Upload** 조합이 대용량·고성능 업로드의 표준.

## 1. Stream Upload

서버가 `HttpServletRequest.InputStream`을 읽어 바로 S3 SDK로 흘려보냄. 디스크에 임시 파일을 만들지 않음.

```java
try (InputStream in = request.getInputStream()) {
    ObjectMetadata meta = new ObjectMetadata();
    meta.setContentLength(size);
    s3.putObject(bucket, key, in, meta);
}
```

- **메모리·디스크 소비 최소**지만 서버가 파일 크기만큼 네트워크 대역폭 사용
- 동일 파일(1 GB 전후)에서 수 분~수십 분 소요 (서버 업로드 대역에 따라)
- 적합: 서버에서 파일 처리(압축·변환)가 필요하고 크기가 제한적일 때

## 2. Spring MultipartFile

`@RequestPart`·`@RequestParam` 으로 받은 `MultipartFile`을 S3로 전송.

- Tomcat이 업로드 파일을 **임시 디스크·메모리**에 저장 (`file-size-threshold`로 분기)
- 여러 파일 병렬 업로드 가능 (`CompletableFuture`·코루틴)
- [[Spring-Multipart-JSON]] 참고

### 한계

- `max-file-size`·`max-request-size` 설정 관리 필요
- 서버가 **요청 수락→임시 저장→S3 전송**을 모두 처리 → 서버 자원 소비
- 대용량에서는 메모리·디스크 한도 초과 시 실패

## 3. S3 Multipart Upload — 대용량의 정석

S3가 제공하는 **파일 분할 업로드 API**. 파일을 여러 Part로 쪼개 병렬 전송한 뒤 S3가 내부적으로 합친다.

### 3단계 흐름

```
1. InitiateMultipartUpload  → uploadId 획득
2. UploadPart × N           → 각 part 번호·ETag 반환
3. CompleteMultipartUpload  → uploadId + (partNumber, ETag) 리스트 전달
   (실패 시) AbortMultipartUpload → 미완료 part 정리
```

### Part 제약

- Part 번호: **1~10,000**
- Part 크기: **5 MB ~ 5 GB** (마지막 part만 5 MB 미만 허용)
- 전체 파일: **최대 5 TB**
- 권장 Part 크기: 10 MB~100 MB (네트워크·재시도 비용 균형)

### 성능 이점

- **병렬 업로드**: 여러 part를 동시에 PUT → 대역폭 최대 활용
- **재시도**: 실패한 part만 재전송 (전체 다시 안 올림)
- **성능 사례**: 1.3 GB 비디오가 단일 90s → Multipart 50s (약 45% 단축)

### 미완료 Abort의 중요성

InitiateMultipartUpload 후 Complete도 Abort도 하지 않으면 **part들이 스토리지 비용으로 쌓인다** (보이지 않음).

- **Lifecycle Rule**로 미완료 업로드 7일 후 자동 Abort 설정 권장
- 업로드 실패 시 앱이 명시적으로 `AbortMultipartUpload` 호출

## 4. Presigned URL — 서버 부담 제거

서버가 **일정 시간 유효한 업로드 URL**을 생성해 클라이언트에 전달. 클라이언트가 이 URL로 **S3에 직접 PUT**.

```java
PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(r -> r
    .signatureDuration(Duration.ofMinutes(15))
    .putObjectRequest(b -> b.bucket(bucket).key(key)));
String uploadUrl = presigned.url().toString();
```

### 장점

- **서버 리소스·대역폭 소비 0**: 파일 바이트가 서버를 거치지 않음
- **스케일링 용이**: 업로드 트래픽이 늘어도 앱 서버에 영향 없음
- **보안 유지**: 버킷을 Public으로 열지 않고, 시간 한정·권한 제한된 URL만 발급

### 한계

- **단일 PUT의 최대 5 GB** 제한 (Multipart Presigned는 뒤에서)
- 클라이언트가 올바른 Content-Type·메타데이터를 보낼 책임
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
- 서버는 **Initiate·Presigned URL 발급·Complete**만 담당 (파일 바이트를 보지 않음)

## 보안·운영 고려

### IAM·버킷 정책
- 서버는 **최소 권한 IAM** (특정 prefix에만 PutObject)
- 버킷은 **Public Access Block 켜기**, CloudFront OAC로만 읽기
- 업로드 후 **별도 Lambda**로 바이러스 스캔·메타데이터 추출

### CORS
- 브라우저에서 직접 PUT하려면 버킷에 **CORS 설정 필수**
- `AllowedMethods`: PUT·POST, `AllowedOrigins`: 프로덕션 도메인 명시
- `ExposedHeaders`: `ETag` 꼭 포함해야 Multipart Complete 가능

### 암호화
- **SSE-S3** (기본): AWS 관리 키
- **SSE-KMS**: 자체 CMK 관리, 감사 로그
- 민감 파일은 KMS + IAM으로 감사 추적 가능

### 검증·후처리
- 업로드 완료 **Event Notification** → SQS/Lambda로 메타데이터 DB 기록·섬네일 생성
- ETag는 Multipart의 경우 MD5가 아님 → 서버에서 별도 체크섬 로직 필요

## CDN 연동

업로드된 파일의 **서빙**은 CloudFront로.

- S3 버킷은 CloudFront OAC로만 접근
- 업로드는 Presigned URL로 직접 S3, 조회는 CloudFront 경유
- 상세: [[CDN]]·[[RDS-Security-Group|IAM·보안]]

## 선택 가이드

| 파일 크기·요구 | 권장 |
|---|---|
| < 10 MB, 서버 처리 필요 | MultipartFile |
| < 100 MB, 일반적인 첨부 | Presigned URL (단일 PUT) |
| > 100 MB ~ 수 GB, 모바일 네트워크 | **Presigned Multipart Upload** |
| > 5 GB 또는 수 TB | **Multipart Upload 필수** |
| 서버에서 변환·압축·검증이 필요 | Stream 또는 MultipartFile |

## 흔한 실수

- **서버 경유 업로드로 네트워크 이중 비용** — 클라→서버→S3 트래픽 비용과 대역폭 부담
- **Multipart 미완료 Part 방치** → 비용 누적. Lifecycle Rule로 자동 Abort 필수
- **Presigned URL 유효 기간을 길게** → URL 유출 시 장기간 악용 가능. 5~15분 권장
- **CORS 설정에서 `ETag` 노출 누락** → 브라우저 Multipart Complete 실패
- **버킷 Public 해제·OAC 미적용** → 저장된 파일이 외부에 노출
- **파일 크기 검증을 서버에서만** — Presigned Direct Upload는 서버를 거치지 않으므로 **업로드 후 Lambda에서 재검증**

## 면접 체크포인트

- 4가지 업로드 방식의 **트레이드오프** (대역폭·구현 복잡도·보안)
- **Presigned URL**이 서버 부담을 어떻게 제거하는가
- **S3 Multipart Upload 3단계**와 Abort의 중요성
- 대용량 + 서버 리소스 제약 동시에 만족하려면 **Presigned Multipart** 조합
- 브라우저 Multipart 구현 시 **CORS ETag 노출** 이슈
- 미완료 Part의 **숨은 스토리지 비용**과 Lifecycle Rule 대응

## 출처
- [우아한형제들 — Spring Boot와 S3 업로드](https://techblog.woowahan.com/11392/)
- [develop-writing — S3 Multipart Upload](https://develop-writing.tistory.com/129)

## 관련 문서
- [[Spring-Multipart-JSON|Spring Multipart + JSON REST]]
- [[CDN|CDN (CloudFront)]]
- [[RDS-Security-Group|IAM·보안]]
- [[ECR-Cost-Reduction|Lifecycle Rule (스토리지 비용)]]
- [[AWS-Lambda|Lambda (업로드 후 처리)]]
