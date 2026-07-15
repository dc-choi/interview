---
tags: [infrastructure, aws, s3, object-storage]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 기능 (Event, Select, Replication)", "S3 데이터 관리"]
verified_at: 2026-07-15
---

# S3 기능과 데이터 관리

## S3 Event Notification

객체 생성, 삭제, 복제, Lifecycle 이벤트를 **SNS, SQS, Lambda, EventBridge**로 발행:

| 트리거 | 이벤트 종류 |
|--------|------------|
| `s3:ObjectCreated:*` | Put, Post, Copy, CompleteMultipartUpload |
| `s3:ObjectRemoved:*` | Delete |
| `s3:ObjectRestore:*` | Glacier 복원 |
| `s3:Replication:*` | 리전 간 복제 결과 |
| `s3:LifecycleExpiration:*` | Lifecycle 만료 |
| `s3:LifecycleTransition` | Lifecycle 전환 |

**시험 포인트 — SNS/SQS/Lambda 직결 vs EventBridge**:
- 직결: 단순, 저지연, 타겟 종류 4개로 제한
- **EventBridge**: 패턴 매칭, 다중 타겟, 아카이브, 리플레이 등 고급 라우팅. AWS 200+ 서비스로 분기

전형 패턴: **S3 업로드 → Lambda → 썸네일 생성 / 메타데이터 추출 → DynamoDB 인덱싱**.

## S3 Select

객체를 다 다운로드하지 않고 **SQL로 부분 조회**하는 기능.
신규 고객에게는 더 이상 제공되지 않는 레거시 기능이다. 새 설계에서는 Athena나 애플리케이션 레벨 필터링을 우선 검토한다. S3 Object Lambda도 2025년 11월 7일부터 기존 고객과 일부 APN 파트너만 사용할 수 있으므로 신규 고객의 일반 대안으로 두면 안 된다.

- 지원 포맷: **CSV, JSON, Apache Parquet**
- `SELECT s.field FROM S3Object s WHERE s.x = 'y'` 형태
- 네트워크 전송량, 메모리 절감 → 대용량 로그, 데이터레이크 조회 비용 ↓
- 더 복잡한 쿼리는 **Athena**(완전관리 SQL 엔진, S3 위에서 직접 쿼리) 사용

## Requester Pays

다운로드 요청자가 데이터 전송 비용을 부담하는 모드.

- 기본은 **버킷 소유자**가 저장, 전송 비용 전부 부담
- Requester Pays 활성화 시 다운로더가 요청, 전송 비용 부담 (저장 비용은 여전히 소유자)
- 모든 요청에 **인증 필수** — 익명 요청자 액세스 거부
- 공공 데이터셋 공유, B2B 데이터 마켓 패턴에서 사용

## Versioning과 삭제 보호

- **Versioning** — 동일 key에 여러 버전 보존, 실수 삭제 복구 가능. 삭제 요청은 객체를 지우지 않고 **DeleteMarker**를 최신 버전으로 붙여 숨김 → 마커를 제거하면 이전 버전으로 복구
- **MFA Delete** — 객체 삭제 시 MFA 토큰 요구
- **Object Lock** — Compliance/Governance 모드로 일정 기간, 영구 삭제 금지 (WORM, 컴플라이언스용)
- Lifecycle Rule로 **noncurrent version expire**, **완료되지 않은 Multipart abort**, **DeleteMarker 정리**까지 설정 가능

## Replication — CRR / SRR

리전 간, 동일 리전 간 버킷 복제. 재해 복구, 지연 감소, 규제 준수에 사용.

| 항목 | CRR (Cross Region) | SRR (Same Region) |
|------|---------------------|--------------------|
| 대상 | 다른 리전 버킷 | 같은 리전 버킷 |
| 용도 | DR, 지리적 근접, 규제 | 로그 통합, 계정 분리 |

- **양쪽 모두 Versioning 필수**
- 다른 계정의 버킷으로도 복제 가능 (소유권 옵션으로 ownership 이관)
- **비동기, 백그라운드** 실행, IAM 역할 필요
- 신규 객체만 복제 — **기존 객체는 S3 Batch Replication** 사용
- 복제 **사슬 불가**: A → B → C로 연쇄 복제해도 A의 객체가 C까지 가지 않음

## Lifecycle Management

객체를 시간 기준으로 다른 클래스로 전환, 만료. 비용 최적화의 핵심 도구.

- 현재 버전 / 이전(noncurrent) 버전 별도 설정 가능
- **Standard-IA / One Zone-IA로 전환**: 최초 저장 후 **30일 이상** 경과해야 함
- 일단 IA, Glacier로 내려간 객체를 **Standard로 자동 승격은 불가** (수동 copy만)
- 만료 기간 설정으로 자동 삭제
- 미완료 Multipart abort, DeleteMarker 정리, noncurrent expire 등 정리 작업 통합

## 정적 웹사이트 호스팅

S3 자체가 정적 페이지 서버 역할. `index.html`, `error.html` 지정하면 HTTP로 직접 응답.

- 별도 서버, EC2 없이 SPA, 정적 블로그 호스팅
- 다른 버킷, 외부 도메인으로 **리디렉션 규칙** 지정 가능
- HTTPS, 커스텀 도메인은 **CloudFront + ACM** 조합 권장 (S3 단독은 HTTP)
- 정적 웹사이트 호스팅 활성화 버킷은 **Custom Origin**으로 CloudFront에 붙이는 패턴이 일반적

## CORS

브라우저의 SOP(Same-Origin Policy)로 다른 도메인 리소스 요청이 차단되는 것을 풀어주는 메커니즘. 응답 헤더에 `Access-Control-Allow-Origin` 등을 명시.

- 버킷에 **CORS Configuration(JSON/XML)** 부착
- 허용할 Origin, Method, Header, Max-Age 지정
- SPA에서 S3 객체를 직접 fetch, XHR로 가져올 때 필수
- Pre-signed URL로 브라우저에서 직접 업로드(PUT)할 때도 CORS 필요

## 출처

- [Querying data in place with Amazon S3 Select — AWS 공식 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html)
- [Amazon S3 Object Lambda availability change — AWS 공식 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html)
