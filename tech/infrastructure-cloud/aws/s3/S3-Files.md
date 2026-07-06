---
tags: [infrastructure, aws, s3, s3-files, nfs, storage, finops]
status: done
category: "Infrastructure - AWS"
aliases: ["S3 Files", "Amazon S3 Files", "S3 NFS 마운트"]
---

# Amazon S3 Files — 도입 전 비용, 성능, 운영 고려사항

S3 버킷을 **NFS 파일시스템으로 마운트**해 파일 인터페이스로 쓰는 서비스 (2026-04 출시). EC2, ECS(Fargate), EKS, Lambda에서 마운트할 수 있고, 내부적으로 고성능 스토리지(캐시)와 S3 간 동기화(Import/Export)로 동작한다. 객체 스토리지를 파일처럼 쓰는 편의 뒤에 **과금 단위, 캐시 경로, 동기화 충돌**이라는 세 가지 판단 축이 숨어 있다.

## 비용 — 32 KiB 최소 과금

- 데이터 쓰기는 **1바이트를 써도 32 KiB로 청구**된다. 32 KiB 초과분은 1 KiB 단위 올림, 메타데이터 읽기/쓰기는 4 KiB 최소 단위
- 실측: 1 KiB 파일 100개(실제 100 KiB) 기록 시 CloudWatch `DataWriteBytes` 기준 3.125 MiB 청구 — **약 32배**, 파일당 정확히 32 KiB
- **안티패턴**: 평균 파일 크기 32 KiB 미만 + 건수가 많은 워크로드 (IoT 로그, 트랜잭션 기록), DB WAL이나 append log처럼 바이트 범위 쓰기가 빈번한 경우
- 대안: Amazon Data Firehose로 소형 파일을 일괄 집계해 객체 크기를 키운 뒤 마운트

## 성능 — 캐시 경로와 설정의 실제 동작

### sizeLessThan은 단방향으로만 적용

- **가져오기(S3 → 캐시)에만 적용** (기본 128 KiB): 이 값보다 작은 파일만 고성능 스토리지에 캐시
- **쓰기는 크기와 무관하게 전부 고성능 스토리지에 저장** — 1 GB를 쓰면 `StorageBytes`가 정확히 1 GB 증가 (실측)

### 두 경계값은 독립적으로 작동

`sizeLessThan`(파일 크기 기준 캐시 여부)과 **1 MiB 단일 읽기 IO 경계**는 별개 축이다. 같은 10 MiB 캐시 파일이라도:

- 64 KiB씩 160회 읽기 → 캐시 히트 경로 → `DataReadBytes` 10 MiB 청구
- 1 MiB씩 10회 읽기 → S3 direct 경로 → 데이터 청구 $0, 메타데이터만 청구

읽기 IO 크기가 비용 경로를 바꾼다 — 애플리케이션의 읽기 패턴을 알아야 캐시 설정이 의미를 가진다.

### 워크로드별 권장 sizeLessThan

| 워크로드 | 읽기 패턴 | 권장값 |
|---|---|---|
| ML 학습 (epoch 반복, 소청크) | 반복적, 작은 IO | 10 MiB |
| 팀 공유 코드, 설정 | 작은 파일, 작은 IO | 128 KiB (기본) |
| 영상 스트리밍, 백업 복원 | 순차, 큰 IO | 0 |
| AI 에이전트 문서 탐색 | 한 번 스캔, 재방문 거의 없음 | 0 |

### 네트워크와 스토리지 수명

- **S3 게이트웨이 엔드포인트(무료)** 유무가 콜드 읽기 비용을 가른다: 엔드포인트 경유 $0, NAT 경유 $0.045/GB, 둘 다 없으면 고성능 스토리지 대체 $0.030/GB — 프라이빗 서브넷이면 반드시 추가 ([[VPC|VPC Gateway Endpoint]])
- 마운트 헬퍼가 `rsize`/`wsize`를 1 MiB로 자동 최적화하고 사용자 재설정은 거부한다
- 고성능 스토리지 해제: 파일 삭제 시 약 7분, 방치 시 30일 만료(미접근 + S3 동기화 완료 조건). **읽을 때마다 타이머가 리셋**되므로 계속 읽는 파일은 만료되지 않는다
- 처리량 한계: 파일시스템당 읽기 250,000 IOPS, 쓰기 50,000 IOPS, 클라이언트당 읽기 3 GiB/s
- `DataReadBytes`/`DataWriteBytes`는 NFS 클라이언트 작업만 포함하고 내부 동기화 트래픽은 빠진다 — 비용 예측은 Cost Explorer의 USAGE_TYPE 집계로 교차검증

## 운영 — 동일 버킷에서 Mountpoint와의 충돌

같은 버킷의 같은 객체 키에 S3 Files와 Mountpoint for Amazon S3가 동시에 쓰면, S3 Files가 내보내기 시점에 객체 변경을 감지해 **충돌로 판정하고 파일시스템 버전을 `.s3files-lost+found-{fs-id}/`로 이동**시킨다 (S3 버킷에는 Mountpoint 버전이 남음).

- 감지: CloudWatch `LostAndFoundFiles` 지표 — 0 초과 시 알람 설정
- **근본 해결은 경로 분리**: S3 Files는 버킷 루트, Mountpoint는 별도 prefix처럼 쓰기 영역을 완전히 나눔
- 복구: lost+found 파일의 xattr(`user.s3files.status`)로 원래 경로를 확인해 복사. **lost+found는 자동 청소되지 않으므로 수동 삭제 필요**

## 접두사 우선 설계

파일시스템 범위를 버킷 전체가 아니라 좁은 prefix로 잡는 것이 기본기:

1. **이름 변경 4시간 임계** — 접두사 내 객체 1,200만 개 초과 시 디렉토리 이름 변경 금지 수준의 비용
2. 첫 목록 조회의 4 KiB 메타데이터 청구가 범위에 비례
3. 다른 마운트 도구와의 충돌 표면 축소
4. 용도별 prefix(ml-training, build-cache 등)로 IAM 권한과 비용 분리

## 도입 전 체크리스트

1. **평균 파일 크기** — 32 KiB 미만 대량 적재면 안티패턴 (결정 트리의 첫 관문)
2. **읽기 패턴** (순차 vs 랜덤, IO 크기) — sizeLessThan 결정
3. **반복 읽기 여부** — 캐시 비용 vs S3 GET 트레이드오프
4. **Mountpoint 동시 사용 여부** — 충돌 위험, 경로 분리 설계
5. **ECS 컴퓨팅 유형** — EC2 시작 유형 미지원, Fargate와 관리형 인스턴스만 가능
6. **버전 관리 정책** — S3 Files는 버저닝 필수 활성화이고 모든 쓰기가 새 버전을 만들므로 **수명 주기 정책이 없으면 비용이 누적**된다 ([[S3-Features-Management|Versioning, Lifecycle]])

## 면접, 시험 체크포인트

- 32 KiB 최소 과금이 소형 파일 대량 워크로드를 안티패턴으로 만드는 구조
- sizeLessThan의 단방향(가져오기만) 적용과 쓰기의 무조건 캐시 저장
- 파일 크기 경계와 읽기 IO 크기 경계가 **독립적**이라는 점 (같은 파일, 다른 비용 경로)
- 게이트웨이 엔드포인트가 프라이빗 서브넷 비용을 제거하는 이유
- 동일 버킷 이중 마운트 충돌의 판정 규칙 (S3 버킷 값 승리, FS 버전은 lost+found)
- 접두사 우선 설계의 4가지 근거

## 출처

- [Amazon S3 Files 도입 전 확인해야 할 3가지 고려사항 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/amazon-s3-files-3-considerations-before-adoption/)

## 관련 문서

- [[S3-Storage-Performance|S3 스토리지 모델과 성능 (prefix 성능)]]
- [[S3-Features-Management|S3 기능과 데이터 관리 (Versioning, Lifecycle)]]
- [[S3-Security-Cost|S3 보안과 비용, 운영 함정]]
- [[S3-File-Upload|S3 파일 업로드]]
- [[VPC|VPC (Gateway Endpoint)]]
- [[CDN|CDN (캐시 계층 설계)]]
