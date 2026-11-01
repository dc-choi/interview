---
tags: [infrastructure, aws, s3, object-storage]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 기능 (Event, Select, Replication)", "S3 데이터 관리"]
verified_at: 2026-11-02
---

# S3 기능과 데이터 관리

## S3 Event Notification

객체 생성, 삭제, 복제, Lifecycle 이벤트를 **SNS, SQS, Lambda, EventBridge**로 발행:

| 트리거 | 이벤트 종류 |
|--------|------------|
| `s3:ObjectCreated:*` | Put, Post, Copy, CompleteMultipartUpload |
| `s3:ObjectRemoved:*` | Delete |
| `s3:ObjectRestore:*` | Glacier 복원 |
| `s3:Replication:*` | 복제 실패, RTC 15분 임계값 초과와 그 뒤의 복제, 복제 지표 추적 중단(복제 지표나 RTC를 켠 규칙에서 발행) |
| `s3:LifecycleExpiration:*` | Lifecycle 만료 |
| `s3:LifecycleTransition` | Lifecycle 전환 |

**시험 포인트 — SNS/SQS/Lambda 직결 vs EventBridge**:
- 직결(SNS, SQS, Lambda): 단순, 저지연, 타겟 종류 3개로 제한
- **EventBridge**: 패턴 매칭, 다중 타겟, 아카이브, 리플레이 등 고급 라우팅. AWS 200+ 서비스로 분기

전형 패턴: **S3 업로드 → Lambda → 썸네일 생성 / 메타데이터 추출 → DynamoDB 인덱싱**.

### 파일 도착으로 배치를 시작할 때의 처리 계약

예정 시각보다 파일이 늦게 도착하는 연동에서는 고정 시각 배치 대신 `ObjectCreated` 알림을 SQS로 받아 처리를 시작할 수 있다. 다만 객체 생성은 파일 내용의 유효성이나 업무 처리 완료를 보장하지 않는다.

2026-10-10 공식 문서 기준, S3 Event Notifications는 최소 한 번 전달하도록 설계되어 중복될 수 있고 발생 순서대로 도착한다는 보장은 없다. `sequencer`는 같은 객체 key의 이벤트 순서를 비교하는 값이다. 서로 다른 key의 순서는 비교할 수 없으며, 길이가 다르면 짧은 값 왼쪽을 0으로 채워 16진수 순서를 비교한다.

다음은 이를 배치에 적용하는 설계 점검이다.

- 버킷, key와 객체 버전 또는 업무 파일 식별자로 처리 대상을 고정하고 중복 소비가 결과를 두 번 반영하지 않게 한다. Versioning이 켜져 있으면 이벤트의 `versionId`로 해당 버전을 읽고, 꺼져 있으면 재전송마다 고유 key를 쓰는 등 덮어쓰기를 피할 계약을 둔다.
- 같은 이벤트 재전달과 내용이 바뀐 정정 파일을 구분한다. 파일명만으로 중복 판정하면 정정본까지 버릴 수 있다. 정정본의 재계산이나 보상 정책은 업무 규칙으로 정한다.
- 최신 상태만 유지하는 projection은 같은 key의 `sequencer`를 저장해 오래된 결과의 덮어쓰기를 막는다. 모든 버전을 처리해야 하는 배치는 오래된 이벤트라는 이유만으로 건너뛰지 않는다.
- 이벤트 수신 뒤 스키마, 업무 기준일과 필수 레코드를 검증한다. 이벤트가 오지 않은 파일도 찾도록 도착 마감 감시와 기대 파일 목록 대조를 별도로 둔다.

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

- **Versioning** — 동일 key에 여러 버전을 보존한다. Versioning이 활성화된 버킷에서 version ID 없는 일반 삭제는 **DeleteMarker**를 추가하며, 특정 version ID를 지정한 삭제는 해당 버전을 영구 삭제한다. 마커를 제거하면 이전 버전을 다시 조회할 수 있다
- **MFA Delete** — 객체 버전의 영구 삭제와 버킷 Versioning 상태 변경에 추가 MFA 인증을 요구한다. 모든 삭제 요청에 같은 방식으로 적용되는 기능은 아니다
- **Object Lock** — 보존 기간이나 legal hold 동안 지정한 객체 버전의 덮어쓰기와 삭제를 막는다(WORM, 컴플라이언스용). Compliance 모드는 root 사용자를 포함한 누구도 기간 안에 지우거나 모드를 바꾸거나 기간을 줄일 수 없다. Governance 모드는 `s3:BypassGovernanceRetention` 권한이 있는 사용자가 `x-amz-bypass-governance-retention:true` 헤더를 보내면 보존 설정을 바꾸거나 없애고 보호된 버전을 지울 수 있다. 콘솔은 이 헤더를 기본으로 넣으므로 권한이 있는 콘솔 사용자의 삭제는 그대로 성공한다. legal hold는 만료일 없이 해제할 때까지 유지된다. Versioning이 켜진 버킷에서만 동작하며 새 버전이나 삭제 마커의 추가는 막지 않는다
- Lifecycle Rule로 **noncurrent version expire**, **완료되지 않은 Multipart abort**, **DeleteMarker 정리**까지 설정 가능

### MFA Delete의 운영 제약

2026-10-07 공식 문서 기준이다. MFA Delete는 Versioning과 함께 설정하며, 활성화는 버킷 소유 계정의 root 사용자만 할 수 있다. 콘솔에서는 활성화할 수 없어 CLI나 API를 사용한다. MFA Delete가 켜진 버킷의 버전 영구 삭제와 Versioning 구성 변경도 root 사용자 작업이다.

- 영구 삭제는 대상 `version-id`와 MFA 장치 일련번호 또는 ARN, 현재 인증 코드를 함께 전달한다. 콘솔 로그인 때 MFA를 거쳤다는 사실만으로 삭제 요청의 MFA 요건이 충족되지는 않는다.
- **Lifecycle 구성과 함께 사용할 수 없다.** 이전 버전 자동 만료가 필요한 버킷에 일괄 적용하기 전에 삭제 보호와 보관 비용의 요구사항을 비교한다.
- Versioning, MFA Delete와 Object Lock은 각각 버전 보존, 추가 인증, 보존 정책에 따른 삭제 제한을 맡는다. 하나를 켰다고 나머지 요구사항까지 충족되는 것은 아니다.

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

### 교차 계정과 Object Lock 복제 설정

2026-11-02 S3 사용자 가이드 기준이다(아래 복제 상태 절도 같다). 다른 계정의 버킷에 사본을 둘 때 설정은 원본 계정과 대상 계정에 나뉜다.

| 위치 | 설정 | 확인할 점 |
|---|---|---|
| 대상 버킷 | Versioning과 Object Lock | 원본 버킷에 Object Lock이 켜져 있으면 대상 버킷도 켜야 한다. 한 번 켜면 Object Lock을 끄거나 Versioning을 중지할 수 없다. Requester Pays로 둘 수 없다 |
| 원본 계정의 IAM 역할 | S3가 맡는 복제 역할과 권한 정책 | 원본 버킷에 Object Lock이 켜져 있으면 원본 버킷에 대한 `s3:GetObjectRetention`과 `s3:GetObjectLegalHold`를 더한다(`s3:Get*`이 있으면 충족) |
| 대상 버킷 정책 | 원본 쪽의 복제 쓰기 허용 | 대상 버킷 소유자가 버킷 정책으로 원본 버킷 소유자에게 복제를 허용한다 |
| 원본 버킷 | Versioning과 복제 규칙 | 원본 버킷에 Object Lock이 켜져 있으면 복제 규칙은 CLI, REST API나 SDK로 설정한다. 콘솔로 규칙을 만드는 AWS 안내 영상도 있지만 원본 버킷의 Object Lock 상태가 나오지 않아 콘솔 지원 여부는 미확인이다 |

- **KMS 암호화 객체 선택**: SSE-KMS와 DSSE-KMS 객체는 기본으로 복제되지 않으므로 규칙에서 KMS로 암호화한 객체의 복제를 명시적으로 켠다(`SourceSelectionCriteria`).
- **복제본 키**: `ReplicaKmsKeyID`에는 대상 버킷과 같은 리전에 있는 대상 계정의 고객 관리형 키를 지정한다. AWS 관리형 키는 교차 계정 사용을 허용하지 않아 복제본 키로 쓸 수 없다. 키 소유자는 키 정책으로 원본 버킷 소유자에게 사용 권한을 주고, 복제 역할에는 원본 키의 `kms:Decrypt`와 복제본 키의 `kms:Encrypt`를 준다.
- **KMS 조건**: 리전 간 예시 정책에서 `kms:Decrypt` 문은 원본 키 ARN을 Resource로, 원본 리전의 S3(`s3.<원본 리전>.amazonaws.com`)를 `kms:ViaService` 값으로 두고, `kms:Encrypt` 문은 복제본 키와 대상 리전의 S3를 같은 방식으로 둔다. 예시의 `kms:EncryptionContext:aws:s3:arn` 조건은 객체 ARN(`<버킷>/*`)이다. S3 Bucket Key가 켜진 버킷은 암호화 컨텍스트가 버킷 ARN이므로 해당 문의 조건도 버킷 ARN으로 바꾼다.
- **설정 성공과 동작**: `PutBucketReplication`은 KMS 키의 유효성을 검사하지 않아 잘못된 키를 넣어도 200 OK를 돌려주지만 복제는 실패한다. 설정 API의 성공 응답을 동작 확인으로 보지 않는다.
- **복제본의 보존 정보**: 복제는 잠긴 객체와 그 보존 메타데이터(event hold 설정 포함)를 함께 비동기로 복사한다. 복제본은 원본 버킷의 Object Lock 구성을 따르고, 복제를 거치지 않고 대상 버킷에 직접 올린 객체는 대상 버킷의 설정을 따른다. 대상 버킷 정책으로 복제본의 최소, 최대 보존 기간을 제한할 수 있으며 이때 `s3:ReplicateObject`를 허용해야 한다.
- **확인하지 못한 경우**: 원본에 Object Lock이 없을 때 대상 버킷의 기본 보존이 복제본에 적용되는지는 미확인이다(2026-11-02 Object Lock considerations 기준). 다른 계정에 변경할 수 없는 사본을 두려는 목적이면 복제본의 보존 모드와 보존 기한을 직접 조회해 확인한다(적용 제안).

### 복제 상태와 실패 처리

- **복제 상태**: `HeadObject`나 `GetObject` 응답의 `x-amz-replication-status`(CLI `head-object`의 `ReplicationStatus`)는 원본에서 `PENDING`, `COMPLETED`, `FAILED`이고 복제본에서 `REPLICA`다. 대상이 여러 개면 모두 성공해야 `COMPLETED`다.
- **일시 장애와 실패**: 버킷이나 리전의 일시 장애에서는 `PENDING`에 머물다가 복구 뒤 이어서 복제한다. `FAILED`는 복제 역할, KMS나 버킷 권한 누락 같은 문제로 생기며 다시 시도되지 않으므로, 원인을 해결한 뒤 객체를 다시 올리거나 S3 Batch Replication으로 복제한다. `FAILED` 객체는 Lifecycle의 만료와 전환도 막힌다.
- **Versioning 변경**: Object Lock이 없는 대상 버킷에서 Versioning을 중지하면 복제가 실패해 원본이 `FAILED`가 된다. 원본 버킷은 복제 구성을 지우기 전에는 Versioning을 중지할 수 없다.
- **복제 시간**: 객체 크기에 따라 다르며 큰 객체는 몇 시간이 걸릴 수 있다. 시간 목표가 필요하면 S3 Replication Time Control을 검토한다. RTC는 대부분의 객체를 몇 초 안에, 99.9%를 15분 안에 복제하며, SLA 조건과 요금은 [[Ad-Bid-Log-Pipeline#리전 사이로 옮길 때|광고 로그 파이프라인의 복제 시간]]에 있다.

## AWS CLI로 버킷 사이의 현재 객체 복사

이 절은 2026-10-08 AWS 공식 문서와 AWS CLI v2 기준이며 일반 목적 버킷을 대상으로 한다. `aws s3 sync`는 복사할 차이를 찾아 반영하는 명령이다. 버킷 설정과 과거 버전까지 보존하는 백업으로 취급하지 않는다.

먼저 대상과 옵션을 확인한다. 아래 버킷 이름은 예시이며 첫 명령은 실행 예정 작업만 출력한다.

```bash
aws s3 sync s3://amzn-s3-demo-source-bucket s3://amzn-s3-demo-target-bucket --dryrun
aws s3 sync s3://amzn-s3-demo-source-bucket s3://amzn-s3-demo-target-bucket
```

| 확인할 항목 | 복사 범위와 주의점 |
|---|---|
| 복사 대상 판정 | S3 간 기본 sync는 대상에 키가 없거나 크기가 다르거나 원본의 최종 수정 시각이 더 최신이면 복사한다. 이 판정을 객체 내용 전체의 비교로 해석하지 않음 |
| 버전 | 현재 객체 버전만 복사한다. 과거 버전 이력은 이 명령의 이전 범위에 포함되지 않음 |
| 덮어쓰기와 삭제 | 대상의 같은 키가 복사 대상이 되면 덮어쓸 수 있다. `--delete`를 추가하면 원본에 없는 대상 객체를 삭제하므로 단순 복사 예제에는 넣지 않음 |
| 속성 | `--copy-props default`는 태그와 지정된 메타데이터 속성을 보존한다. Annotations까지 복사하려면 이를 지원하는 CLI 버전에서 `--copy-props all`을 사용한다. 멀티파트에서는 속성 보존을 위한 추가 API 호출과 권한이 필요할 수 있음 |
| ACL | 원본 ACL은 자동 복사되지 않는다. 객체 데이터 복사와 대상의 접근 권한 설정을 별도로 확인 |
| 메타데이터만 변경 | `--metadata`를 지정해도 sync에서 변경 대상으로 선택되지 않은 객체에는 적용되지 않음 |
| 큰 객체 | 단일 `CopyObject`의 상한은 5 GB다. 그보다 큰 객체는 CLI나 SDK의 multipart copy를 사용하며 CLI 전체의 복사 한도로 오해하지 않음 |
| 아카이브 | Glacier Flexible Retrieval과 Deep Archive의 객체는 복원한 뒤 복사 |

작업 전 읽기와 쓰기 권한, 암호화 키 접근 권한과 대상 버킷 설정을 확인한다. 운영 검증에서는 종료 코드와 실패 목록, 대상 key와 크기, 필요한 메타데이터와 무결성을 대조한다. 객체 수와 총 크기의 일치만으로 내용까지 같다고 확정하지 않는다. 큰 버킷은 객체 수와 실행 시간을 보고 S3 Batch Operations도 비교한다.

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

- [AWS 공식 문서, Event message structure](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html) — 2026-10-10 객체 버전과 sequencer의 비교 범위를 대조했다. 배치의 정정본 처리와 도착 마감 감시는 설계 제안이다.
- [Copy objects between S3 buckets — AWS re:Post](https://repost.aws/knowledge-center/move-objects-s3-bucket)
- [AWS 공식 문서, AWS CLI s3 sync](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [AWS 공식 문서, Copying, moving, and renaming objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html)
- [AWS 공식 문서, Configuring MFA delete](https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html)
- [AWS 공식 문서, Deleting an object from an MFA delete-enabled bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMFADelete.html)
- [AWS 공식 문서, Deleting object versions from a versioning-enabled bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html)
- [AWS 공식 문서, Querying data in place with Amazon S3 Select](https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html)
- [AWS 공식 문서, Amazon S3 Object Lambda availability change](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html)
- [AWS 공식 문서, S3 Event Notification 대상](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html)
- [AWS 공식 문서, Locking objects with Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [AWS 공식 문서, Object Lock considerations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html)
- [AWS 공식 문서, Requirements and considerations for replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html)
- [AWS 공식 문서, Replicating encrypted objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html)
- [AWS 공식 문서, Getting replication status information](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-status.html)
- [AWS 공식 문서, Meeting compliance requirements with S3 Replication Time Control](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html)
- [How can I set up cross-account replication across my Amazon S3 buckets with Object Lock? — Amazon Web Services](https://www.youtube.com/watch?v=o0rASDZgwXk)

## 관련 문서

- [[S3|S3 개요]]
- [[S3-Storage-Performance|S3 성능과 무결성]]
- [[S3-Security-Cost|S3 보안과 비용]]
- [[KMS|KMS 키 유형과 교차 계정 권한]]
