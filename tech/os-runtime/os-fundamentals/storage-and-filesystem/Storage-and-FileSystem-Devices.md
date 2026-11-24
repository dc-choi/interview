---
tags: [os, storage, filesystem, memory, io]
status: done
verified_at: 2026-10-06
category: "OS&런타임(OS&Runtime)"
aliases: ["저장 장치와 주변장치", "기억장치 계층과 HDD SSD"]
---

# 저장 장치와 주변장치

> 2026-10-06 부분 검증: HDD의 회전 부품, 저장 매체와 통신 규격 및 폼팩터의 구분을 공식 자료와 대조했다. 주변장치와 메모리 계층 전체를 다시 검증한 날짜는 아니다.

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
- 플래터가 회전하고 액추에이터가 헤드를 목표 트랙으로 이동시켜 읽고 쓴다
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
- 실제 I/O 성능은 저장 매체뿐 아니라 컨트롤러, 연결 규격과 요청 패턴의 영향을 함께 받음

### SSD 특성
- 성능이 좋고 소음이 없음. 자석에 데이터가 손상되지 않고 충격에 강함
- flash page는 같은 위치에 바로 덮어쓰기보다 더 큰 erase block을 먼저 지워야 하므로 controller가 garbage collection과 mapping 변경을 수행
- erase cycle 수명이 유한하므로 wear leveling과 over-provisioning으로 쓰기를 분산

### TRIM(보강)
- filesystem이 더는 필요하지 않은 logical block range를 장치에 알리는 discard 명령 계열
- 장치는 이 정보를 garbage collection과 write amplification 완화에 활용할 수 있음
- 지원 여부, 즉시/주기 실행과 실제 효과는 OS, filesystem, controller와 storage 계층 설정에 따라 다름

### 처분 전 데이터 삭제

기기를 팔거나 넘기기 전의 삭제는 누가 어떤 수단으로 복구를 시도할지에 맞춰 고른다. NIST SP 800-88 Rev. 2는 방법을 셋으로 나눈다.

| 방법 | 수단 | 막는 수준 |
|---|---|---|
| Clear | 표준 읽기/쓰기 명령으로 사용자가 접근하는 영역을 덮어쓰거나, 덮어쓰기를 지원하지 않으면 공장 초기화 메뉴를 쓴다 | 사용자와 같은 인터페이스로 하는 단순하고 비침습적인 복구 |
| Purge | 장치의 삭제 명령이나 암호화 삭제처럼 물리적, 논리적 기법을 쓴다. 매체는 다시 쓸 수 있다 | 최신 실험실 수준의 복구 |
| Destroy | 매체를 파괴한다. 이후 저장 매체로 쓸 수 없다 | 최신 실험실 수준의 복구 |

- 지침은 가능하면 Clear보다 Purge를 쓰라고 권하고, 중간 민감도의 데이터에는 일부가 복구될 수 있다는 위험을 받아들이고 Clear를 고를 수 있다고 본다.
- **SSD에 0을 여러 번 덮어쓰는 방식은 피한다.** 덮어쓰기는 host가 접근하는 logical block에만 닿는다. over-provisioning 영역처럼 사용자 용량보다 큰 물리 공간에 데이터가 남을 수 있어, 지침은 이런 매체에서 다회 덮어쓰기가 주는 기밀성 보호가 매우 작다고 적는다.
- **암호화 삭제(cryptographic erase):** 저장 데이터를 암호화한 키를 지워 복호화를 불가능하게 만드는 Purge 기법이다. 다른 방법보다 훨씬 빠르지만 처음부터 강한 암호화가 적용돼 있었다는 조건이 붙는다.
- 개인 기기에 적용하면(해석) 저장 장치 암호화를 켜 둔 상태에서 초기화하는 쪽이 0으로 채우는 포맷보다 SSD에 맞는다. OS와 제조사가 제공하는 초기화가 어느 방법에 해당하는지는 기기별 문서로 확인한다.

## 저장 매체, 통신 규격과 폼팩터

HDD, SSD, NVMe와 EDSFF는 같은 분류 단계의 네 가지 디스크가 아니다. 사양표를 읽을 때는 아래 축을 분리한다.

| 구분 | 용어 | 설명 |
|---|---|---|
| 저장 방식 | HDD, SSD | HDD는 회전하는 자기 매체, 일반적인 SSD는 NAND 플래시 기반이며 기계적 탐색이 없음 |
| 연결과 전송 | SATA, PCIe | 장치와 호스트를 연결하는 인터페이스. 지원 규격과 대역폭 조건을 확인 |
| 호스트 통신 규격 | NVMe | 호스트 소프트웨어와 비휘발성 메모리 장치의 통신을 정의. 로컬 SSD에서는 PCIe 전송과 결합 |
| 물리 형상 계열 | M.2, U.2, EDSFF | 장착 공간, 커넥터와 냉각 조건에 관련. NVMe 지원 여부와 별도로 읽음 |

NVMe에는 PCIe뿐 아니라 TCP와 RDMA 전송 규격도 있다. NVMe를 특정 모양의 SSD나 PCIe 자체와 같은 뜻으로 쓰지 않는다. M.2에도 SATA 제품이 있으므로 길쭉한 모양만으로 NVMe라고 판단할 수 없다.

EDSFF는 데이터센터의 밀도, 전력과 냉각 요구를 고려한 폼팩터 계열이다. E1.S, E1.L과 E3가 있으며 모두 한 가지 길이나 자 모양인 것은 아니다. NVMe SSD에 EDSFF 형상을 적용할 수 있으므로 둘은 경쟁하는 저장 방식이 아니다.

예를 들어 `E1.S NVMe SSD, PCIe 4.0 x4`는 E1.S 형상, NVMe 통신, PCIe 4.0 네 개 레인을 쓰는 SSD라는 뜻이다. 구매와 교체 전에는 서버 베이, 백플레인, 전원과 냉각의 지원 조건을 함께 확인한다. 명칭만으로 실제 IOPS나 처리량을 보장하지 않으며, 성능 측정의 구분은 [[Storage-and-FileSystem-Performance|디스크 접근 시간과 RAID]]를 참고한다.

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

### CPU 캐시의 쓰기 정책

캐시 라인의 위치를 애플리케이션이 별도 주소로 선택하는 것이 아니라 하드웨어가 메모리 주소를 기준으로 관리한다. 데이터 배치와 접근 순서가 지역성에 영향을 주며, ISA의 prefetch나 cache 관리 명령은 별도 수단이다.

| 정책 축 | 방식 | 의미 |
|---|---|---|
| 쓰기 적중 | Write-through | 캐시와 하위 계층에 쓰기를 전달 |
| 쓰기 적중 | Write-back | 우선 캐시에 쓰고 dirty 상태를 추적해 나중에 하위 계층에 반영 |
| 쓰기 미스 | Write-allocate | 라인을 가져온 뒤 캐시에 쓰기 |
| 쓰기 미스 | No-write-allocate | 라인을 채우지 않고 하위 계층에 쓰기 |

Write-back과 write-allocate는 같은 라인의 후속 쓰기를 합칠 수 있지만 dirty 관리와 교체 시 쓰기 비용이 필요하다. Write-through는 하위 계층으로 쓰기 트래픽을 늘릴 수 있다. 구체 정책은 캐시 계층과 구현마다 다르며, 이 구분만으로 언어의 스레드 간 가시성을 설명할 수는 없다. [[Java-Memory-Model-and-Monitors|언어 메모리 모델]]의 동기화 계약을 별도로 지킨다.

## 관련 문서
- [[Storage-and-FileSystem|기억장치와 파일시스템 (목차)]]
- [[Storage-and-FileSystem-Files|파일시스템 구조]]
- [[Storage-and-FileSystem-Performance|디스크 접근 시간과 RAID]]

## 출처

- [NVM Express, Specifications](https://nvmexpress.org/specifications/)
- [How EDSFF is Making NVMe Technology Even Cooler — NVM Express](https://nvmexpress.org/how-edsff-is-making-nvme-technology-even-cooler/)
- [Kingston, FAQs for SATA and M.2 SSDs](https://www.kingston.com/en/ssd/ssd-faq)
- [Understanding SSD Technology: NVMe, SATA, M.2 — Kingston](https://www.kingston.com/en/ssd/what-is-nvme-ssd-technology)
- [Internal Hard Drives — Western Digital](https://www.westerndigital.com/solutions/hard-drives/internal-hdd)
- [NIST, SP 800-88 Rev. 2 Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) — 2025-09 발행. 2026-11-23 3.1절의 Clear, Purge와 Destroy 정의, 덮어쓰기와 over-provisioning 서술, 3.2절의 암호화 삭제 대조. 처분 전 데이터 삭제 절에만 해당
- [2차 인증이 무적이 아니라고요???? 아니 왜?!!! — YouTube, Normaltic Place](https://www.youtube.com/watch?v=riE7FtkR-7k) — 2026-11-23 업로드, 음성 인식 전사 확인. 노트북 판매 전 초기화 질문의 계기로만 사용

- [인프런, 모영철, Guarded Suspension](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178840)

- 인프런, 널널한 개발자 강사, [HDD, SSD와 파일 시스템](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128250)
- 인프런, 감자 강사, [주변장치](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100851), [마우스/키보드](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100852), [하드디스크/Flash Memory](https://www.inflearn.com/courses/lecture?courseId=328188&unitId=100853)
- [Linux kernel, Bus-Independent Device Accesses](https://docs.kernel.org/driver-api/device-io.html)
- [Linux kernel, Dynamic DMA mapping Guide](https://docs.kernel.org/core-api/dma-api-howto.html)
- 인프런, 널널한 개발자 강사, [컴퓨터가 기억공간을 관리하는 방법](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128249)
