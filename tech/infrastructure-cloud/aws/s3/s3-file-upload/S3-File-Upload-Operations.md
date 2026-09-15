---
tags: [aws, s3, file-upload, multipart, presigned-url, spring]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 업로드 보안", "S3 업로드 선택 가이드"]
verified_at: 2026-07-21
---

# S3 파일 업로드 — 보안, 운영과 선택 가이드

## 보안, 운영 고려

### IAM, 버킷 정책
- 서버는 **최소 권한 IAM** (특정 prefix에만 PutObject)
- 버킷은 **Public Access Block 켜기**. 신뢰되지 않은 업로드는 `quarantine/` prefix 또는 별도 bucket에 저장하고 CloudFront OAC에는 검사 완료 영역만 읽도록 허용
- GuardDuty Malware Protection for S3 또는 승인된 scanner로 검사하고 `GuardDutyMalwareScanStatus=NO_THREATS_FOUND` 같은 검증 결과가 확인된 객체만 clean prefix로 복사하거나 후속 처리를 허용. `THREATS_FOUND`, `FAILED`, `UNSUPPORTED`, `ACCESS_DENIED`와 결과 미확인은 fail-closed로 격리

### CORS
- 브라우저에서 직접 PUT하려면 버킷에 **CORS 설정 필수**
- `AllowedMethods`: PUT, POST, `AllowedOrigins`: 프로덕션 도메인 명시
- `ExposedHeaders`: `ETag` 꼭 포함해야 Multipart Complete 가능

### 암호화
- **SSE-S3** (기본): AWS 관리 키
- **SSE-KMS**: AWS managed 또는 customer managed KMS key 사용. key 유형에 따른 제어, 감사와 요청 비용 확인
- 민감 파일은 KMS + IAM으로 감사 추적 가능

### 검증, 후처리
- quarantine 업로드 완료 **Event Notification** → SQS/Lambda 또는 GuardDuty scan → 성공 결과 확인 → clean 영역 승격 → 메타데이터 DB 기록, 섬네일 생성. 이벤트 중복과 순서 역전을 고려해 멱등 처리
- ETag는 Multipart의 경우 MD5가 아님 → 서버에서 별도 체크섬 로직 필요
- 크기, MIME signature, checksum과 업무 규칙도 clean 승격 전에 서버 측에서 재검증

## CDN 연동

업로드된 파일의 **서빙**은 CloudFront로.

- S3의 clean prefix 또는 배포 bucket은 CloudFront OAC로만 읽고 quarantine은 OAC와 일반 소비자에게 명시적으로 거부
- 업로드는 Presigned URL로 직접 S3, 조회는 CloudFront 경유
- 상세: [[CDN]], [[RDS-Security-Group|IAM, 보안]]

## 선택 가이드

| 파일 크기, 요구 | 권장 |
|---|---|
| < 10 MB, 서버 처리 필요 | MultipartFile |
| < 100 MB, 일반적인 첨부 | Presigned URL (단일 PUT) |
| > 100 MB ~ 수 GB, 모바일 네트워크 | **Presigned Multipart Upload** |
| > 5 GB 또는 수 TB | **Multipart Upload 필수** |
| 서버에서 변환, 압축, 검증이 필요 | Stream 또는 MultipartFile |

## 흔한 실수

- **서버 경유 업로드의 경로 비용과 대역폭 혼동** — 앱 서버는 수신과 S3 송신 바이트를 모두 처리해 bandwidth, connection과 scaling 부담이 커진다. 하지만 internet ingress는 일반적으로 별도 전송 요금이 없고 same-Region EC2와 S3도 경로에 따라 전송 요금이 없을 수 있다. NAT Gateway, cross-AZ/Region, Transfer Acceleration 등 실제 경로로 비용을 계산
- **Multipart 미완료 Part 방치** → 비용 누적. Lifecycle Rule로 자동 Abort 필수
- **Presigned URL 유효 기간을 길게** → URL 유출 시 장기간 악용 가능. 파일 크기와 재시도 시간을 반영한 최소 만료, 임시 credential과 bucket-policy guardrail을 사용
- **CORS 설정에서 `ETag` 노출 누락** → 브라우저 Multipart Complete 실패
- **버킷 Public 해제, OAC 미적용** → 저장된 파일이 외부에 노출
- **파일 크기 검증을 요청 발급 시점에만 수행** — Presigned Direct Upload는 서버를 거치지 않으므로 quarantine에서 크기, 형식, checksum과 malware 결과를 재검증하고 성공 전에는 읽기, 배포 금지

## 면접 체크포인트

- 4가지 업로드 방식의 **트레이드오프** (대역폭, 구현 복잡도, 보안)
- **Presigned URL**이 서버 부담을 어떻게 제거하는가
- **S3 Multipart Upload 3단계**와 Abort의 중요성
- 대용량 + 서버 리소스 제약 동시에 만족하려면 **Presigned Multipart** 조합
- 브라우저 Multipart 구현 시 **CORS ETag 노출** 이슈
- 미완료 Part의 **숨은 스토리지 비용**과 Lifecycle Rule 대응

## 출처

- [GuardDuty Malware Protection for S3 동작](https://docs.aws.amazon.com/guardduty/latest/ug/how-malware-protection-for-s3-gdu-works.html)
- [검사 결과 tag 기반 S3 접근 제어](https://docs.aws.amazon.com/guardduty/latest/ug/tag-based-access-s3-malware-protection.html)
- [AWS 데이터 전송 비용 분류](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)

## 관련 문서

- [[S3-File-Upload|S3 파일 업로드 (TOC)]]
- [[S3-File-Upload-Server-Path|서버 경유 업로드 — Stream, MultipartFile]]
- [[S3-File-Upload-Direct-Transfer|클라이언트 직접 전송 — Multipart Upload, Presigned URL]]
- [[CDN|CDN (CloudFront)]]
- [[RDS-Security-Group|IAM, 보안]]
- [[AWS-Lambda|Lambda (업로드 후 처리)]]
