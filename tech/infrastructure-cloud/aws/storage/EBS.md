---
tags: [aws, infrastructure, ebs, storage, block-storage]
status: done
category: "Infrastructure - AWS"
aliases: ["EBS", "Elastic Block Store", "AWS EBS", "EBS Snapshot"]
verified_at: 2026-09-03
---

# AWS EBS (Elastic Block Store)

EC2 인스턴스에 부착되는 **블록 수준 네트워크 스토리지**. 인스턴스의 수명과 **독립**되어 영속적이며, 데이터베이스의 데이터 디렉터리, 시스템 부트 디스크의 표준 선택지.

## 핵심 특성

- **블록 디바이스**로 동작 — OS에서 일반 디스크(`/dev/xvda`, `/dev/nvme0n1`)처럼 마운트
- 인스턴스 수명과 무관하게 **영속** — Stop/Start해도 데이터 유지
- 특정 AZ에서 생성되며 **동일 AZ EC2에만** 부착 가능 (Cross-AZ는 스냅샷 경유)
- 단일 인스턴스에 **여러 EBS 볼륨** 부착 가능, 추가 볼륨은 사용 중에도 마운트/언마운트 가능
- **루트 디바이스 볼륨**은 사용 중 언마운트 불가
- 사용 중에도 **볼륨 유형, 사이즈 변경 가능** (단, **사이즈 축소는 불가**)
- AZ 내 **자동 복제**로 단일 하드웨어 장애 보호 — 단, AZ 전체 장애에는 스냅샷 필요
- 인스턴스 종료 시 삭제 여부는 각 block device mapping의 `DeleteOnTermination` 값으로 결정된다. 루트 볼륨은 일반적으로 삭제가 기본이지만 AMI와 실행 방식에 따라 바꿀 수 있고, 데이터 볼륨도 생성, 연결 방식에 따라 기본값이 다르므로 속성을 직접 확인한다.

## EBS 볼륨 유형

현재 세대는 `gp3`, `gp2`, `io2 Block Express`, `io1`, `st1`, `sc1`의 6종이다. 부트 볼륨은 SSD 계열에서 지원하며, 이전 세대인 Magnetic(`standard`)도 부팅을 지원한다. 현재 세대 HDD인 `st1`, `sc1`은 부트 볼륨으로 사용할 수 없다.

| 유형 | 분류 | 부트 가능 | 특징 | 적합 워크로드 |
|------|------|----------|------|---------------|
| **gp3** | 범용 SSD | 가능 | IOPS, Throughput 분리 프로비저닝, 최신 세대 | 대부분의 워크로드 표준 |
| **gp2** | 범용 SSD | 가능 | 사이즈에 IOPS 비례, gp3 대비 비효율 | 레거시 |
| **io2 Block Express** | 프로비저닝 IOPS SSD | 가능 | Nitro에서 최대 64 TiB, 256,000 IOPS, **EBS Multi-Attach** 지원 | 미션 크리티컬 DB |
| **io1** | 프로비저닝 IOPS SSD | 가능 | io2 이전 세대 | 레거시 DB |
| **st1** | 처리량 최적화 HDD | **불가** | 처리량 기준, 자주 액세스되는 대용량 | EMR, ETL, 로그, DW |
| **sc1** | Cold HDD | **불가** | 가장 저렴, 자주 액세스되지 않는 대용량 | 콜드 데이터 아카이브 |

2025년 4월 30일 이후 모든 io2 볼륨은 io2 Block Express다. Nitro 기반 인스턴스에서는 볼륨당 최대 64 TiB, 256,000 IOPS를 지원하며 실제 성능은 인스턴스의 EBS 한도에도 제한된다. **EBS Multi-Attach**는 같은 AZ의 지원되는 Nitro 인스턴스 최대 16대에 io1 또는 io2 볼륨을 연결할 수 있다. 동시 쓰기에는 클러스터 인식 파일시스템이나 애플리케이션 수준 조정이 필요하다.

일반 워크로드는 **gp3**를 우선 검토한다. IOPS와 처리량을 크기와 독립적으로 설정할 수 있으며, gp2 대비 절감률은 리전, 용량, 필요한 성능에 따라 계산한다.

### Torn Write Prevention과 DB 쓰기 정렬

2026-10-14 AWS EC2 공식 문서 부분 대조 기준이다. Torn Write Prevention(TWP)은 지원되는 Linux 인스턴스와 스토리지에서 정해진 크기의 쓰기가 일부만 기록되는 것을 방지한다. DB 페이지가 장치의 원자적 쓰기 단위보다 클 때 사용하는 doublewrite buffer의 추가 I/O를 줄이는 데 활용할 수 있다. DB 트랜잭션 전체의 원자성이나 백업을 대신하는 기능은 아니다.

- **장치 조건:** 지원 쓰기 크기는 4 KiB, 8 KiB, 16 KiB이며 시작 LBA가 해당 경계에 정렬돼야 한다. 인스턴스와 볼륨 조합의 지원 여부 및 경계 크기를 NVMe namespace 정보로 확인한다.
- **소프트웨어 조건:** AWS가 시험한 구성에는 Amazon Linux 2의 커널 5.10 이상, ext4 `bigalloc`과 16 KiB cluster, e2fsprogs 1.46.5 이상 및 `O_DIRECT`가 포함된다. 다른 구성이 같은 결과를 낸다고 추정하지 않는다.
- **적용 순서:** MySQL과 MariaDB는 파일시스템의 16 KiB 정렬과 direct I/O 조건을 먼저 갖춘 뒤 doublewrite 비활성화를 검토한다. LVM이나 다른 저장소 가상화 계층이 시작 offset을 어긋나게 하면 보호가 무효가 될 수 있다. 지원 인스턴스로 옮긴 사실만으로 doublewrite를 끄지 않는다.

운영 적용 전에는 별도 테스트 볼륨에서 전체 저장 경로의 정렬과 장애 복구를 검증한다(적용 제안). 파일시스템 재생성은 기존 데이터를 지울 수 있으므로 운영 볼륨에 포맷 명령을 그대로 적용하지 않는다. 성능 개선 폭은 실제 DB 부하로 측정하며 이 절은 재현 시험 결과가 아니다.

## CloudWatch에서 평균 IOPS와 처리량 계산

부분 검증(2026-10-14): EBS CloudWatch 지표 정의를 대조했다. 같은 `VolumeId`, 시간 구간과 period를 선택하고 읽기, 쓰기 지표의 통계는 `Sum`으로 맞춘다. `VolumeReadOps`, `VolumeWriteOps`는 해당 구간에 완료된 작업 수이며 그 자체가 초당 값은 아니다.

| 계산 대상 | 구간 합계로 계산하는 식 |
|---|---|
| 전체 구간 평균 IOPS | `(Sum(VolumeReadOps) + Sum(VolumeWriteOps)) / 구간 초` |
| 전체 구간 평균 처리량, bytes/s | `(Sum(VolumeReadBytes) + Sum(VolumeWriteBytes)) / 구간 초` |
| MiB/s로 변환 | 위 bytes/s 값을 `1024 × 1024`로 나눔 |

`VolumeIdleTime`은 읽기나 쓰기 요청이 제출되지 않은 시간의 합이다. 활동 시간만 기준으로 비교하려면 분모를 `구간 초 - Sum(VolumeIdleTime)`으로 바꾸되 **활동 시간 기준 평균**으로 표시한다. 전체 구간 평균과 섞어 비교하지 않는다. 분모가 0인 구간은 이 계산에서 제외하며, Multi-Attach 볼륨은 이 idle 지표를 지원하지 않는다.

예를 들어 60초 동안 6,000건을 처리하고 idle이 30초라면 전체 평균은 100 IOPS, 활동 시간 기준은 200 IOPS다. 이 평균만으로 짧은 피크나 프로비저닝 한도 초과 여부를 확정하지 않는다. 실제 볼륨 측정은 수행하지 않았으며 기존 절의 검증일은 유지한다.

## LVM 볼륨을 확장할 때 확인할 계층

부분 검증(2026-10-16): AWS의 EBS 확장 가이드와 LVM 운영 절차를 대조했다. EBS 크기 변경만으로 논리 볼륨과 파일시스템까지 커지지는 않는다. 변경 전 스냅샷을 만들고, 수정 상태가 `optimizing` 또는 `completed`인지 확인한다.

1. `lsblk`, `df -hT`로 디스크, 파티션, 파일시스템과 마운트 지점을 식별한다. 콘솔의 장치명을 OS 장치명으로 그대로 가정하지 않는다.
2. 기존 EBS를 늘렸다면 파티션이 있는 경우 먼저 `growpart`로 확장하고, 해당 PV에 `pvresize`를 적용한다. `pvs`, `vgs`로 PV 크기와 VG 여유 공간을 확인한다.
3. 대상 LV를 `lvextend`로 늘리고 `lvs`로 확인한다. `-L 19G`는 증가분이 아니라 변경 후 총크기다. 다른 LV가 사용할 여유 공간도 남겨야 하는지 판단한다.
4. ext4는 대상 LV 장치에 `resize2fs`, XFS는 해당 파일시스템의 마운트 지점에 `xfs_growfs`를 적용한다. 마지막으로 `df -hT`에서 파일시스템 크기를 확인한다.

새 EBS를 추가하는 방식은 빈 대상 장치에 PV를 만들고 `vgextend`로 기존 VG에 넣은 뒤 LV와 파일시스템을 확장한다. 기존 데이터가 있는 장치를 새 PV로 초기화하지 않는다. Striped LV는 VG의 총 여유 공간만으로 확장 가능 여부를 판단하지 않고 stripe 수와 장치별 할당 조건을 확인한다.

이 절은 절차 대조이며 실제 볼륨 변경이나 복원 시험 결과가 아니다. 기존 절의 검증일은 유지한다.

## EBS 스냅샷

스냅샷은 EBS 볼륨 데이터를 **S3에 백업**하는 메커니즘 (S3 버킷에는 직접 노출되지 않음).

- **일반 생성 스냅샷은 증분식(Incremental)** — 첫 스냅샷은 기록된 블록 전체를, 후속 스냅샷은 변경된 블록을 저장한다. Archive에서 Standard로 복원한 스냅샷은 예외로 전체 스냅샷이다.
- 복원 시점 데이터로 **새 EBS 볼륨 생성** 가능
- 스냅샷은 리전 리소스이며 같은 리전의 다른 AZ에서 볼륨을 만들 수 있다. 다른 리전에는 스냅샷 복사 기능을 사용한다.
- **다른 AWS 계정과 공유** 가능 (권한 부여)
- **암호화된 볼륨의 스냅샷은 자동 암호화**
- **암호화된 스냅샷에서 생성된 볼륨도 자동 암호화**
- 암호화되지 않은 EBS를 직접 암호화하는 것은 불가 → **스냅샷 생성 → 암호화하여 복사 → 새 볼륨 생성** 우회 경로
- AMI와 연결된 스냅샷은 **삭제 불가** (AMI 등록 해제 선행 필요)

스냅샷 자동화: **Data Lifecycle Manager (DLM)** 또는 **AWS Backup**으로 주기 백업, 보존 정책 적용.

### 생성이 오래 걸리거나 pending에 머물 때

2026-10-14 AWS 생성, 삭제 문서와 Knowledge Center를 대조한 진단 기준이다. 이 절의 검증일이며 기존 볼륨 유형과 성능 수치 전체를 다시 검증한 날짜는 아니다.

- **전송량:** 첫 스냅샷은 볼륨에 기록된 데이터 블록 전체를, 후속 스냅샷은 변경 블록을 저장한다. 변경량이 많으면 오래 걸리므로 경과 시간만으로 실패를 판정하지 않는다. 요청 시점에 볼륨에 기록된 데이터가 대상이며 애플리케이션과 OS 캐시에만 남은 데이터는 포함하지 않는다.
- **다중 볼륨:** 인스턴스의 여러 볼륨을 하나의 세트로 백업하면 각 스냅샷의 전송은 독립적으로 진행해도 완료는 함께 이뤄진다. 일부가 99%에서 기다릴 때는 같은 세트의 다른 스냅샷도 확인한다. EBS 기반 AMI의 진행이 느리면 연결된 스냅샷부터 살핀다.
- **중첩 요청:** 같은 볼륨에 진행 중인 스냅샷이 있는데 다시 요청하면 후속 작업이 0%에서 대기할 수 있다. 추가 요청으로 해결하려 하지 말고 기존 작업과 동시 생성 한도를 확인한다. 여러 `pending` 작업은 볼륨 성능에도 영향을 줄 수 있다.
- **삭제와 취소:** 진행 중 스냅샷에 삭제를 요청해도 생성이 끝난 뒤 삭제가 적용된다. 즉시 작업을 취소하거나 동시 생성 한도를 확보하는 방법으로 쓰지 않는다.

정기 생성 간격은 RPO에 맞추되 이전 작업의 완료 여부도 확인한다. 간격을 줄이면 회차당 변경 블록을 줄일 수 있지만, 보존 기간과 변경량에 따른 저장 비용까지 함께 검토한다.

### 아카이브와 삭제 복구의 경계

2026-10-14 AWS 공식 가이드 부분 대조 기준이다. Archive는 장기 보관 계층이고 Recycle Bin은 삭제한 리소스를 보존 규칙에 따라 복구하는 기능이다. 둘을 같은 복원 단계로 취급하지 않는다.

- **Archive 전환:** 증분 스냅샷을 해당 시점에 기록된 블록 전체를 포함하는 스냅샷으로 바꾼다. 볼륨 생성, 공유와 복사 전에 Standard로 복원해야 하며, 복원에는 최대 72시간이 걸릴 수 있다.
- **보관 기간:** 최소 아카이브 기간은 90일이다. 그 전에 삭제하거나 영구 복원하면 남은 기간에 대한 요금이 발생한다. 비용 비교는 [[Storage-Tiering#EBS 아카이브는 증분 크기 그대로 과금하지 않는다|EBS 아카이브 비용 조건]]을 함께 본다.
- **임시와 영구 복원:** 임시 복원은 Archive 사본을 남기고 지정 기간 동안 Standard 사본을 사용한다. 기간이 끝나면 Standard 사본이 제거된다. 영구 복원은 Archive 사본을 제거하고 Standard에 유지한다.
- **복원 후 과금:** 두 복원 방식 모두 Standard의 복원본은 전체 스냅샷이다. 복원본의 저장 비용을 기존 증분 크기로 계산하지 않는다. 임시 복원 중에는 Archive 사본과 Standard 복원본의 저장 요금이 함께 발생하며, 일회성 검색(retrieval) 요금도 별도다. AWS 요금 예시 10은 기록된 데이터가 200 GB인 스냅샷을 임시 복원할 때 Standard 저장 요금도 200 GB로 계산한다.
- **삭제 보호의 전제:** 보호할 리전에 스냅샷용 Recycle Bin 보존 규칙을 먼저 만든다. 태그 수준 규칙은 지정 태그와 일치하는 대상을, 리전 수준 규칙은 제외 태그에 해당하지 않는 해당 유형의 리소스를 보호한다. 스냅샷 보존 기간은 1~365일이며 만료 후에는 복구할 수 없다.
- **두 단계 복구:** 보존 규칙과 일치해 Recycle Bin에 들어간 Archive 스냅샷은 먼저 Recycle Bin에서 복구하고, 이어 Standard로 복원해야 사용할 수 있다. Recycle Bin에서 꺼냈다고 Archive 복원이 끝난 것은 아니다.

운영 적용 제안: 즉시 복구용 백업과 장기 보관용 스냅샷을 나누고, 보존 규칙의 태그와 리전 및 실제 복원 시간을 시험한다. 여기서는 계정 설정과 복원을 실행하지 않았으며 기존 절의 검증일은 유지한다.

## EBS 암호화

- **AWS KMS Key**를 사용한 AES-256 암호화
- 부팅 볼륨과 데이터 볼륨 **모두 암호화 가능**
- 보호 범위:
  - 볼륨 내부 저장 데이터 (at-rest)
  - 볼륨 ↔ 인스턴스 간 **이동 중 데이터** (in-transit)
  - 볼륨에서 생성된 **모든 스냅샷**
  - 암호화 스냅샷에서 생성된 **모든 볼륨** (전파)
- 계정 수준에서 **EBS 암호화 기본값 활성화** 가능 — 신규 볼륨 모두 자동 암호화
- 성능 오버헤드는 거의 없음 (Nitro 기반에서 하드웨어 가속)

## RAID 구성

EBS 위에서 OS 레벨 RAID를 구성할 수 있으나, 패턴별 권장이 다르다.

| RAID 레벨 | EBS 적합도 | 비고 |
|----------|-----------|------|
| **RAID 0** | 권장 (성능) | 스트라이핑, I/O 성능 ≫ 내결함성. 단일 볼륨 장애 시 전체 손실 |
| **RAID 1** | 일반적인 EBS 내구성 보완 용도로는 비효율적 | 미러링 비용과 쓰기 I/O가 늘어난다. 애플리케이션이나 파일시스템의 특별한 요구가 있을 때만 검토 |
| **RAID 5 / 6** | **비권장** | Parity Write 작업이 IOPS의 일부만 활용 → EBS 비용 대비 비효율 |

EBS는 AZ 안에서 중복 저장되므로 단일 볼륨의 일반적인 내구성 보완만을 위해 RAID 1을 추가하는 것은 비용 효율이 낮다. RAID 0은 성능을 높일 수 있지만 한 볼륨의 장애가 배열 전체 손실로 이어지므로 백업과 복구 설계를 함께 둔다.

## EBS vs Instance Store (요약)

| 측면 | EBS | Instance Store |
|------|-----|----------------|
| 위치 | 네트워크 스토리지 | 호스트 직결 (NVMe) |
| 영속성 | **영속** | **휘발성** (Stop, Terminate 시 손실) |
| 스냅샷 | 가능 | 불가 |
| 사이즈 변경 | 가능 (축소 X) | 불가 |
| 분리, 재부착 | 가능 | 불가 |
| 적합 | 부트, DB, 앱 데이터 | 캐시, 임시 shuffle |

상세는 [[EC2|EC2 문서의 스토리지 섹션]] 참조.

## 비용 모델

- **프로비저닝 사이즈** 기준 GB, 월 과금 (실사용량 아님)
- io1, io2는 IOPS 프로비저닝 추가 비용, gp3는 IOPS, Throughput을 기본 한도 초과 시 추가
- **일반 생성 스냅샷은 첫 전체 데이터와 이후 변경 블록의 저장량**을 기준으로 과금된다. Archive 스냅샷과 Archive에서 Standard로 복원한 스냅샷은 전체 스냅샷 크기로 저장 비용을 계산한다. 복원 방식별 추가 요금은 위의 아카이브 절을 따른다(2026-10-14 부분 대조).
- 미사용 볼륨도 과금 — 인스턴스 종료 후 **고아 볼륨 정리** 필수

## 흔한 실수

- **gp2 그대로 운영** — gp3로 마이그레이션 시 동성능 ~20% 저렴
- **암호화 미적용 신규 볼륨** — 계정 기본값 활성화로 강제
- **사이즈 축소 시도** — 불가. 새 볼륨 생성 후 데이터 이전
- **다른 AZ EC2에 부착 시도** — 스냅샷 → 다른 AZ에서 새 볼륨 생성
- **고아 볼륨 방치** — 인스턴스 종료 후 추가 볼륨 잔존, 비용 누수
- **AMI 등록 해제 없이 스냅샷 삭제 시도** — 실패

## 시험 체크포인트 (SAA-C03)

- EBS는 **AZ 종속** — 다른 AZ EC2 부착 불가, 스냅샷 경유
- 현재 세대 EBS 볼륨 유형 6종 (`gp3`, `gp2`, `io2 Block Express`, `io1`, `st1`, `sc1`)과 **부트 가능 여부**. SSD는 지원하고 현재 세대 HDD인 `st1`, `sc1`은 지원하지 않으며, 이전 세대 Magnetic은 지원
- io2 Block Express의 **Multi-Attach** — 동일 AZ 내 다수 인스턴스 부착
- 일반 생성 스냅샷은 **증분식**, S3에 저장 (사용자 버킷 X). Archive 전환 시 전체 스냅샷으로 저장하며 Standard로 복원해도 전체 스냅샷이다.
- 스냅샷의 **Cross-Region, Cross-Account 공유** 가능
- 암호화는 **KMS 기반 AES-256**, 스냅샷/볼륨 간 **자동 전파**
- 암호화되지 않은 EBS 직접 암호화 불가 → 스냅샷 복사 우회
- 인스턴스 종료 시 볼륨별 `DeleteOnTermination` 확인. 루트와 데이터 볼륨의 기본값은 AMI와 생성, 연결 방식에 따라 달라질 수 있음
- 사용 중에도 **유형, 사이즈 변경 가능, 축소 불가**
- EBS는 AZ 내 자동 복제 → **RAID 1은 비권장**, 성능 목적 RAID 0만 고려

## 출처

- [How do I extend an EBS volume with LVM partitions? — AWS re:Post](https://repost.aws/knowledge-center/ebs-extend-volume-lvm-partitions)
- [Extend the file system after resizing an Amazon EBS volume](https://docs.aws.amazon.com/ebs/latest/userguide/recognize-expanded-volume-linux.html)
- [Considerations and limitations for archiving Amazon EBS snapshots](https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive-considerations.html)
- [Restore an archived Amazon EBS snapshot](https://docs.aws.amazon.com/ebs/latest/userguide/restore-archived-snapshot.html)
- [How does Recycle Bin work?](https://docs.aws.amazon.com/ebs/latest/userguide/recycle-bin-concepts.html)
- [Amazon EBS pricing](https://aws.amazon.com/ebs/pricing/)
- [Amazon CloudWatch metrics for Amazon EBS](https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html)
- [Torn write prevention on Amazon EC2 Linux instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/storage-twp.html)
- [Block sizes for torn write prevention on Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-block-sizes.html)
- [Requirements for using torn write prevention on Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/twp-reqs.html)
- [Check Amazon EC2 instance support for torn write prevention](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/twp-namespace.html)
- [Configure your workload on Amazon EC2 for torn write prevention](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-twp.html)
- [Why is my AMI or Amazon EBS snapshot creation slow or stuck in the pending state? — AWS re:Post](https://www.repost.aws/knowledge-center/ebs-snapshot-ec2-ami-creation-slow)
- [Create Amazon EBS snapshots](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-creating-snapshot.html)
- [Delete an Amazon EBS snapshot](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-deleting-snapshot.html)
- [Amazon EBS 사용 설명서](https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html)
- [Amazon EBS 볼륨 유형](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html)
- [io2 Block Express 볼륨](https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html)
- [EBS Multi-Attach](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html)

## 관련 문서

- [[EC2|EC2, Elastic Compute Cloud]]
- [[AWS-Fundamentals|AWS 기본 용어 (Region, AZ)]]
- [[S3|S3, Object Storage]]
- [[VPC|VPC, Subnet, CIDR]]
- [[IAM|IAM, 권한 관리 (KMS 관련)]]
- [[RDS-Aurora|RDS, Aurora (EBS 스토리지 기반)]]
