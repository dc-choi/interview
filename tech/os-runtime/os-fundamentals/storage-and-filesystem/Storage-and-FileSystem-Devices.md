---
tags: [os, storage, filesystem, memory, io]
status: done
verified_at: 2026-08-04
category: "OS&런타임(OS&Runtime)"
aliases: ["저장 장치와 주변장치", "기억장치 계층과 HDD SSD"]
---

# 저장 장치와 주변장치

## 기억장치계층

| 계층 | 구성요소 | 특성 |
|------|---------|------|
| CPU내부 | 레지스터, L1/L2/L3캐시 | 가장 빠름, 용량 작음 |
| 1차메모리 | RAM | 휘발성, 전원 꺼지면 소멸 |
| 2차메모리 | SSD, HDD | 비휘발성, 영구 저장 |

- 위로 갈수록 빠르고 비싸고 용량이 작음
- 아래로 갈수록 느리고 싸고 용량이 큼

### 캐시메모리
- CPU와 RAM 사이의 속도 차이를 극복하기 위해 존재
- cache miss가 나면 보통 필요한 memory block을 채우고 시간적, 공간적 locality를 이용한다. hardware prefetch는 접근 pattern을 예측해 미리 가져오는 별도 최적화이며 구현마다 다르다
- L1(가장 빠름, 가장 작음) → L2 → L3(가장 느림, 가장 큼)

### 각기억장치관리방법
| 기억장치 | 관리방식 |
|---------|---------|
| 레지스터 | ISA가 정의한 register identifier |
| RAM | 가상/물리 address와 cache coherence 규칙 |
| HDD/SSD | controller가 노출한 logical block address |

## HDD(하드디스크)

### 구조
- 자기 디스크 위를 헤드가 회전하며 읽기/쓰기
- 데이터는 **트랙**(원형 경로)과 **섹터**(트랙의 구간)로 구분
- **스핀들**: 플래터를 회전시키는 막대
- **플래터**: 자기 기록층이 있는 원판. 실제 인코딩과 오류 정정은 drive controller가 담당
- **디스크 암/액추에이터**: read/write head를 목표 track으로 이동시킴. head 공유 방식은 drive 설계에 따라 다름
- **실린더**: 여러 플래터의 같은 트랙의 집합
- **섹터**: drive가 노출하는 논리/물리 block 단위. 둘의 크기가 다를 수 있음

### 배드섹터
- 읽기/쓰기 오류가 반복되는 media 영역을 drive가 spare sector로 remap할 수 있다.
- 고장 원인은 media 손상, head/controller 문제 등 다양하며 특정 overwrite 횟수 하나로 정의되지 않는다.

### 조각모음
- 파일이 여러 섹터에 흩어져 저장되면(파편화) 헤드 이동 시간 증가 → 성능 저하
- 조각 모음 = 파편화된 데이터를 연속된 영역으로 재배치
- 실행 여부와 주기는 운영체제, 파일시스템과 관리 정책에 따라 다름

## SSD

- HDD의 자기 디스크 → 반도체 칩으로 대체
- host에는 logical block interface를 제공하고 내부 Flash Translation Layer가 이를 flash page/erase block에 매핑
- HDD처럼 head seek를 줄이기 위한 전통적 조각 모음의 이점은 작고, 불필요한 재쓰기는 수명과 write amplification에 영향을 줄 수 있음
- 칩의 I/O 성능에 따라 속도 결정

### SSD 특성
- 성능이 좋고 소음이 없음. 자석에 데이터가 손상되지 않고 충격에 강함
- flash page는 같은 위치에 바로 덮어쓰기보다 더 큰 erase block을 먼저 지워야 하므로 controller가 garbage collection과 mapping 변경을 수행
- erase cycle 수명이 유한하므로 wear leveling과 over-provisioning으로 쓰기를 분산

### TRIM(보강)
- filesystem이 더는 필요하지 않은 logical block range를 장치에 알리는 discard 명령 계열
- 장치는 이 정보를 garbage collection과 write amplification 완화에 활용할 수 있음
- 지원 여부, 즉시/주기 실행과 실제 효과는 OS, filesystem, controller와 storage 계층 설정에 따라 다름

## 주변장치

### 종류

| 구분 | 예시 | 전송 단위 |
|------|------|----------|
| 캐릭터 디바이스 | terminal, serial device, 일부 입력 장치 | byte stream 또는 device별 operation |
| 블록 디바이스 | HDD, SSD, virtual block device | addressable block과 request queue |

Linux의 character/block 구분은 kernel interface 분류다. 장치의 데이터 양이나 물리 모양만으로 정하지 않으며 GPU 같은 복합 장치를 단순 block device로 분류하지 않는다.

### 버스 구조
- interconnect는 address, data와 control 의미의 transaction을 전달하지만 물리 배선과 protocol은 플랫폼마다 다르다.
- CPU-memory fabric, PCIe, USB처럼 지연과 대역폭 요구가 다른 연결이 bridge/controller를 통해 계층을 이룰 수 있다.

### 입출력 제어기와 DMA
- CPU/driver가 descriptor와 buffer를 준비해 장치에 I/O를 요청하고 완료는 interrupt나 polling으로 확인할 수 있다.
- **DMA**는 장치/controller가 CPU의 개별 load/store 없이 memory와 데이터를 전송하게 한다. CPU와 OS는 DMA mapping, cache coherence, IOMMU와 lifetime을 관리해야 한다.
- **MMIO**는 CPU address space의 일부를 일반 RAM이 아니라 device register 접근으로 해석하는 방식이다. DMA 충돌을 막기 위해 RAM 영역을 나누는 뜻이 아니다.

### 마우스/키보드의 동작
1. 디바이스 컨트롤러가 입력을 감지
2. CPU에 인터럽트를 보냄
3. 디바이스 드라이버가 데이터를 읽어감
4. 드라이버가 운영체제에 이벤트 전달
5. 운영체제가 애플리케이션에 이벤트 전달
6. 애플리케이션이 이벤트 처리

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템 (목차)]]
- [[Storage-and-FileSystem-Files|파일시스템 구조]]
- [[Storage-and-FileSystem-Performance|디스크 접근 시간과 RAID]]

## 출처

- 인프런, 널널한 개발자 강사, [HDD, SSD와 파일 시스템](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128250)
- 인프런, 감자 강사, [주변장치](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100851), [마우스/키보드](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100852), [하드디스크/Flash Memory](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100853)
- [Linux kernel, Bus-Independent Device Accesses](https://docs.kernel.org/driver-api/device-io.html)
- [Linux kernel, Dynamic DMA mapping Guide](https://docs.kernel.org/core-api/dma-api-howto.html)
