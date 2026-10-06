---
tags: [os, storage, disk, raid, performance]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["디스크 접근 시간과 RAID", "Disk Access Time"]
---

# 디스크 접근 시간과 RAID

## 디스크 접근 시간 (Disk Access Time)

디스크 I/O 성능의 기본 단위. 세 구성 요소의 합.

```
Disk Access Time = Seek Time + Rotational Latency + Transfer Time
```

### 1. Seek Time (탐색 시간)
헤드를 **목표 트랙까지 이동**시키는 시간. **기계적 움직임** → HDD에서 가장 느린 구간 (~3~15ms).

### 2. Rotational Latency (회전 지연)
목표 섹터가 헤드 아래로 올 때까지 **디스크 회전 대기**.
- 7200 RPM HDD: 평균 ~4.2ms (1회전 ~8.3ms의 절반)
- 15000 RPM 엔터프라이즈 HDD: ~2ms

### 3. Transfer Time (전송 시간)
실제 데이터 **읽기, 쓰기**. 전송 시간은 대략 블록 크기를 실제 전송률로 나눈 값이다. 블록 크기가 클수록 늘지만 RPM, 기록 밀도, zone과 channel 조건은 실제 전송률에 함께 반영되므로 단순 비례로 일반화하지 않는다.

### 총 시간 감각
- HDD 랜덤 액세스: **~10ms/요청**
- HDD 순차 읽기: ~100MB/s
- SSD 랜덤 액세스: **~0.1ms** (100배 빠름, 기계 부품 없음)
- SSD 순차 읽기: ~500MB/s ~ 수 GB/s (NVMe)

### 왜 순차가 빠른가
- **Seek Time 최소화**: 헤드가 움직일 필요 없음
- **다중 페이지 읽기**: 연속 페이지를 한 번에

DB 풀 스캔이 인덱스 레인지 스캔보다 빠를 수 있는 이유도 여기서 나옴 — 25% 이상 읽어야 하면 순차 풀스캔이 랜덤 액세스 반복보다 빠름 ([[Index]]).

### SSD에서 달라진 점
- **Seek, Rotational 거의 0** (전자적 접근)
- 여전히 **쓰기 증폭(Write Amplification)**, GC(Garbage Collection), 수명 제한 있음
- 순차 > 랜덤 차이가 HDD보다 작지만 여전히 존재

### 메모리와 스토리지 지연 계층
속도 순서 (대략):
```
CPU 캐시 < 메모리(RAM) < 로컬 SSD/HDD
 휘발성      휘발성          비휘발성
```

DB 튜닝, OS 캐시, CDN 설계는 이 속도 계층을 인지하고 **자주 쓰는 데이터를 위로** 끌어올리는 작업.

## RAID (Redundant Array of Independent Disks)

여러 디스크를 **하나의 논리 장치처럼** 묶어 **성능** 또는 **안정성**을 높이는 기술. 구성 방식에 따라 레벨이 나뉜다.

### 주요 레벨

| 레벨 | 구성 | 장점 | 단점 |
|---|---|---|---|
| **RAID 0** | 스트라이핑 — 데이터를 여러 디스크에 분산 저장 | 병렬 I/O, 중복 저장 공간 없음 | 1개 장애로 배열의 데이터 복원이 불가능해질 수 있음 |
| **RAID 1** | 미러링 — 동일 데이터를 디스크에 복제 | 2개 미러에서는 1개 장애 감내 | 2개 미러 기준 공간 효율 50% |
| **RAID 4** | 전용 패리티 디스크 + 스트라이핑 | RAID 1보다 적은 디스크로 보호 | 패리티 디스크가 쓰기 병목 |
| **RAID 5** | 패리티를 모든 디스크에 분산 | 전용 패리티 디스크 병목 분산 | 1개 장애까지 감내, 패리티 갱신과 복구 비용 |
| **RAID 6** | 이중 패리티 분산 | 2개 장애까지 감내 | 추가 패리티의 용량과 쓰기 비용 |
| **RAID 10** | RAID 1+0 (미러링 후 스트라이핑) | 성능, 안정성 모두 확보 | 공간 효율 50% |
| **RAID 50** | 여러 RAID 5 그룹을 스트라이핑 | 각 그룹에서 1개 장애 감내 | 같은 그룹에서 2개 장애면 보호 범위 초과 |
| **RAID 60** | 여러 RAID 6 그룹을 스트라이핑 | 각 그룹에서 2개 장애 감내 | 같은 그룹에서 3개 장애면 보호 범위 초과 |

### 용량과 장애 위치

같은 용량 `S`의 디스크 `N`개를 쓴다고 가정한다. 예비 디스크와 메타데이터 공간은 계산에서 제외한다. RAID 5는 `(N-1)S`, RAID 6은 `(N-2)S`, 2개씩 미러링하는 RAID 10은 `NS/2`다. 같은 크기의 그룹 `g`개로 나눈 RAID 50은 `(N-g)S`, RAID 60은 `(N-2g)S`로 계산한다.

중첩 RAID는 고장 난 디스크의 총수보다 위치가 중요하다. 2개씩 미러링한 RAID 10에서 서로 다른 미러 쌍의 디스크가 하나씩 고장 나면 버틸 수 있지만, 같은 쌍의 두 디스크가 고장 나면 해당 데이터를 잃는다. RAID 50과 60도 각 그룹의 허용 범위를 따로 확인한다.

디스크를 두 배로 늘려도 성능 두 배를 보장하지 않는다. I/O 크기, 읽기와 쓰기 비율, 컨트롤러 캐시와 재구축 부하를 포함해 측정한다. RAID 구성만으로 서비스 가용성 99.999%를 보장할 수도 없다.

### 사용 시나리오

- **속도 우선 (임시 데이터, 캐시 서버)**: RAID 0
- **중요 데이터, DB 서버**: RAID 1 / 5 / 6 / 10
- **클라우드 스토리지**: 관리형 서비스의 복제, 장애 복구와 백업 보장 범위를 확인하며 내부 구현을 특정 RAID 레벨로 추정하지 않는다.

### 한계

- 중복성이 있는 RAID는 허용 범위의 **디스크 장애**를 방어하지만 **파일 손상, 랜섬웨어, 사람 실수**는 막지 못함 → 별도 **백업 필수**
- SSD 기반 RAID 5/6은 쓰기 증폭이 쌓여 수명이 빨리 소진될 수 있음
- 복구 중(Rebuild) 추가 장애가 해당 그룹의 허용 범위를 넘으면 데이터를 잃을 수 있다. 복구 시간과 그동안의 성능 저하도 운영 계획에 포함한다.

CPU 캐시와 RAM은 휘발성이며 저장소와 구분한다. 네트워크 스토리지 지연에는 네트워크, 서버 캐시와 매체가 함께 작용하므로 HDD 뒤에 고정 배치하지 않는다. 위의 수치는 제품 보장값이 아니라 대략적인 감각이며 실제 부하로 측정한다.

## 출처
- [Dell PERC 9 User's Guide, Summary of RAID levels](https://www.dell.com/support/manuals/en-us/poweredge-rc-h730/perc9ugpublication/summary-of-raid-levels?guid=guid-6ae6da6f-688a-482e-af0e-f605d7299aca)
- [Dell Lifecycle Controller User's Guide, Selecting RAID levels](https://www.dell.com/support/manuals/en-us/oth-xlr7920/idrac9_6.xx_lc_ug/selecting-raid-levels?guid=guid-5d365c37-4f63-4f4f-a48d-658498a39b2c&lang=en-us)
- [Dell iDRAC9 User's Guide, RAID level 60](https://www.dell.com/support/manuals/en-us/idrac9-lifecycle-controller-v4.x-series/idrac9_4.00.00.00_ug_new/raid-level-60-striping-over-raid-6-sets?guid=guid-788d764f-a84d-40ab-b2b7-d63ecabc403a&lang=en-us)
- [매일메일 — 디스크 접근 시간](https://www.maeil-mail.kr/question/148)
- [매일메일 — RAID](https://www.maeil-mail.kr/question/6)
- [Overview of 9.1GB Ultra160 SCSI Hard Disk Drive — IBM](https://www.ibm.com/support/pages/overview-91gb-ultra160-scsi-hard-disk-drive)
- [인프런, 널널한 개발자, 컴퓨터가 기억공간을 관리하는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128249)

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템 (목차)]]
- [[Storage-and-FileSystem-Devices|저장 장치와 주변장치]]
- [[Storage-and-FileSystem-Files|파일시스템 구조]]
- [[Index|DB Index (랜덤 vs 순차 I/O)]]
- [[SQL-Tuning-Terminology|SQL 튜닝 용어 (시퀀셜, 랜덤 액세스)]]
