---
tags: [virtualization, emulation, testing, oxide, voxel]
status: done
verified_at: 2026-10-16
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Rack Scale System Emulation", "랙 규모 시스템 에뮬레이션", "Oxide Voxel"]
---

# 랙 규모 시스템 에뮬레이션

여러 서버, 스위치와 관리 장치를 소프트웨어로 재현하면 물리 랙을 확보하기 전에 제어 평면과 네트워크 구성을 검증할 수 있다. 핵심은 필요한 동작을 얼마나 충실히 재현하고 실제 제품 소프트웨어와 어떤 차이를 남기는가다.

## 제품과 테스트의 차이를 줄인다

테스트 전용 소프트웨어를 별도 유지하면 배포 제품과 다른 경로를 검사할 수 있다. 실제 이미지와 제어 평면을 그대로 실행하고 하드웨어 경계만 대체하면 이 차이를 줄일 수 있다. 그래도 가상 타이밍, 물리적 장애와 성능은 실장비 검증이 필요하다.

## Oxide Voxel 사례

2026-10-14 Oxide 공식 글과 2026-10-16 GeekNews 입력을 대조했다. Voxel은 illumos 기반 Rust 에뮬레이션 스택으로 Oxide 랙의 실제 소프트웨어를 수정 없이 실행하는 것을 원칙으로 삼는다.

- Propolis로 server sled를 가상화한다.
- SoftNPU 소프트웨어 스위치와 Debian/FRR로 네트워크 경로를 구성한다.
- Service Processor와 Root of Trust의 관리 마이크로컨트롤러도 모사한다.
- 공개 사례는 32-thread Ryzen 미니 PC, RAM 96GB에서 sled 6개를 하나 또는 관리 평면을 공유하는 두 랙으로 구성하고 약 10분 만에 기동했다.

장비와 기동 시간은 해당 구성의 사례다. 임의의 컴퓨터에서 랙 성능을 재현한다는 뜻이 아니다.

## 검증 경계

- 같은 이미지와 구성으로 반복 초기화할 수 있는가?
- 고객의 라우팅과 네트워크 토폴로지를 재현하는가?
- 에뮬레이션 시간과 실제 시간의 차이가 timeout 및 재시도를 바꾸는가?
- snapshot과 초기화 도구가 테스트 사이의 상태를 격리하는가?
- 기능 테스트 뒤 실장비에서 확인할 전력, 성능과 장애 조건은 무엇인가?

공식 설계 설명만 대조했으며 Voxel 설치나 랙 실행은 하지 않았다.

## 출처

- [Virtual Oxide Labs: Emulating a Full Oxide Rack — Oxide Computer Company](https://oxide.computer/blog/voxel-labs)

## 관련 문서

- [[Compile-and-Runtime|프로세스 VM과 시스템 VM]]
- [[인프라&클라우드(Infrastructure&Cloud)|인프라와 클라우드]]
