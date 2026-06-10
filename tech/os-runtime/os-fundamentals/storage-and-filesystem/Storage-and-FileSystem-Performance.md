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
실제 데이터 **읽기, 쓰기**. 블록 크기, 회전 속도, 기록 밀도에 비례. 보통 ms 이하.

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

### 비휘발성 스토리지 계층
속도 순서 (대략):
```
CPU 캐시 < 메모리(RAM) < NVMe SSD < SATA SSD < HDD < 네트워크 스토리지
 ~ns       ~100ns        ~10µs      ~100µs     ~10ms    ~수 ms 이상
```

DB 튜닝, OS 캐시, CDN 설계는 이 속도 계층을 인지하고 **자주 쓰는 데이터를 위로** 끌어올리는 작업.

## RAID (Redundant Array of Independent Disks)

여러 디스크를 **하나의 논리 장치처럼** 묶어 **성능** 또는 **안정성**을 높이는 기술. 구성 방식에 따라 레벨이 나뉜다.

### 주요 레벨

| 레벨 | 구성 | 장점 | 단점 |
|---|---|---|---|
| **RAID 0** | 스트라이핑 — 데이터를 여러 디스크에 분산 저장 | 읽기/쓰기 매우 빠름, 공간 100% 활용 | 1개 장애 시 전체 데이터 손실 |
| **RAID 1** | 미러링 — 동일 데이터를 2개 이상 디스크에 복제 | 1개 장애 감내, 읽기 성능 향상 | 저장 공간 50%만 사용 |
| **RAID 4** | 전용 패리티 디스크 + 스트라이핑 | RAID 1보다 적은 디스크로 보호 | 패리티 디스크가 쓰기 병목 |
| **RAID 5** | 패리티를 모든 디스크에 분산 | 병목 해소, 공간 효율 좋음 | 1개 장애까지만, 복구 시간 김 |
| **RAID 6** | 이중 패리티 분산 | 2개 장애까지 감내 | 쓰기 성능 가장 낮음 |
| **RAID 10** | RAID 1+0 (미러링 후 스트라이핑) | 성능, 안정성 모두 확보 | 공간 효율 50% |

### 사용 시나리오

- **속도 우선 (임시 데이터, 캐시 서버)**: RAID 0
- **중요 데이터, DB 서버**: RAID 1 / 5 / 6 / 10
- **클라우드 스토리지**: AWS RDS, EBS는 내부적으로 스트라이핑, 미러링을 자동 처리

### 한계

- RAID는 **디스크 장애**는 방어하지만 **파일 손상, 랜섬웨어, 사람 실수**는 막지 못함 → 별도 **백업 필수**
- SSD 기반 RAID 5/6은 쓰기 증폭이 쌓여 수명이 빨리 소진될 수 있음
- 복구 중(Rebuild) 추가 장애가 나면 전체 손실 — 큰 디스크일수록 복구 시간이 길어 위험

## 출처
- [매일메일 — 디스크 접근 시간](https://www.maeil-mail.kr/question/148)
- [매일메일 — RAID](https://www.maeil-mail.kr/question/6)

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템 (목차)]]
- [[Storage-and-FileSystem-Devices|저장 장치와 주변장치]]
- [[Storage-and-FileSystem-Files|파일시스템 구조]]
- [[Index|DB Index (랜덤 vs 순차 I/O)]]
- [[SQL-Tuning-Terminology|SQL 튜닝 용어 (시퀀셜, 랜덤 액세스)]]
