---
tags: [aws, s3, file-upload, multipart, presigned-url, spring]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 서버 경유 업로드", "S3 Stream Upload"]
verified_at: 2026-07-21
---

# S3 파일 업로드 — 서버 경유 (Stream, MultipartFile)

파일을 S3에 올리는 방식은 **클라이언트→서버→S3** 경로와 **클라이언트→S3 직접** 경로 두 계열로 나뉜다. 파일 크기, 보안 요구, 프론트 UX에 따라 4가지 방식을 선택적으로 조합해 쓴다.

## 방식 개관

| 방식 | 경로 | 최대 크기 | 장점 | 단점 |
|---|---|---|---|---|
| **Stream Upload** | 클라 → 서버 → S3 (stream) | 실무상 수백 MB | 디스크 I/O 없음 | 속도 느림 (서버 bandwidth 병목) |
| **MultipartFile** | 클라 → 서버 → S3 | 수 MB ~ 수백 MB | Spring 기본 지원, 구현 단순 | 서버 메모리, 디스크 부담 |
| **S3 Multipart Upload** | 클라 → S3 (part 단위 병렬) | **최대 50 TB** | 병렬 전송, 재시도 가능 | 구현 복잡 |
| **Presigned URL** | 클라 → S3 직접 (한 번에) | 한 PUT당 **5 GB** | 서버 부담 없음 | 단일 요청 크기 한계 |

**Presigned URL + Multipart Upload** 조합이 대용량, 고성능 업로드의 표준.

## 1. Stream Upload

서버가 `HttpServletRequest.InputStream`을 읽어 바로 S3 SDK로 흘려보냄. 디스크에 임시 파일을 만들지 않음.

```java
try (InputStream in = request.getInputStream()) {
    ObjectMetadata meta = new ObjectMetadata();
    meta.setContentLength(size);
    s3.putObject(bucket, key, in, meta);
}
```

- **메모리, 디스크 소비 최소**지만 서버가 파일 크기만큼 네트워크 대역폭 사용
- 동일 파일(1 GB 전후)에서 수 분~수십 분 소요 (서버 업로드 대역에 따라)
- 적합: 서버에서 파일 처리(압축, 변환)가 필요하고 크기가 제한적일 때

## 2. Spring MultipartFile

`@RequestPart`, `@RequestParam` 으로 받은 `MultipartFile`을 S3로 전송.

- Tomcat이 업로드 파일을 **임시 디스크, 메모리**에 저장 (`file-size-threshold`로 분기)
- 여러 파일 병렬 업로드 가능 (`CompletableFuture`, 코루틴)
- [[Spring-Multipart-JSON]] 참고

### 한계

- `max-file-size`, `max-request-size` 설정 관리 필요
- 서버가 **요청 수락→임시 저장→S3 전송**을 모두 처리 → 서버 자원 소비
- 대용량에서는 메모리, 디스크 한도 초과 시 실패

## 출처

- [우아한형제들 — Spring Boot와 S3 업로드](https://techblog.woowahan.com/11392/)

## 관련 문서

- [[S3-File-Upload|S3 파일 업로드 (TOC)]]
- [[S3-File-Upload-Direct-Transfer|클라이언트 직접 전송 — Multipart Upload, Presigned URL]]
- [[S3-File-Upload-Operations|보안과 운영, 선택 가이드]]
- [[Spring-Multipart-JSON|Spring Multipart + JSON REST]]
