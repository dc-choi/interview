---
tags: [infrastructure, network, gpu, optical-interconnect, cpo, silicon-photonics]
status: done
verified_at: 2026-10-23
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Optical Interconnect and CPO", "광통신과 공동 패키징 광학", "Co-Packaged Optics"]
---

# 광통신과 CPO의 배치 경계

CPO(Co-Packaged Optics)는 광 엔진을 스위치 ASIC 같은 전자 칩과 같은 패키지에 배치하는 통합 방식이다. 광통신의 전기와 빛 변환 지점을 칩 가까이 옮겨, 고속 전기 신호가 이동하는 경로를 줄이는 데 초점을 둔다. 광 연결을 쓴다고 GPU의 연산 자체가 광 연산으로 바뀌는 것은 아니다.

## 광 변환이 어디에 있는지 본다

| 구성 | 전기 신호와 광 변환의 경계 | 확인할 점 |
| --- | --- | --- |
| 플러그형 광 트랜시버 | ASIC에서 전면 모듈까지 전기 신호를 전달한 뒤 빛으로 변환 | 기판 경로, 모듈 전력과 교체 방식 |
| CPO | 같은 패키지의 광 엔진까지 짧은 전기 경로를 거쳐 변환 | 패키지 통합, 열 관리와 광 연결의 정비 단위 |
| 프로세서와 광 엔진의 더 조밀한 통합 | 인터포저까지 광 연결을 가까이 가져오는 설계 연구 | 스위치 제품과 프로세서 I/O의 적용 상태를 별도 확인 |

세 구성을 모든 장비가 차례로 통과해야 하는 고정 로드맵으로 읽지 않는다. 스위치에 CPO를 적용했다는 발표만으로 GPU, 메모리와 모든 서버 연결이 이미 광 방식이라고 판단할 수 없다. 프로세서와 광 엔진의 인터포저 통합은 별도의 연구 주제다.

## 줄이는 비용과 남는 비용

고속 전기 경로가 길면 신호 무결성을 유지하기 위한 설계와 보정 부담이 커진다. NVIDIA의 2025년 스위치 설명은 광 엔진을 같은 패키지에 두어 경로를 줄이고 별도 DSP를 제거하는 구조를 제시한다. 핵심은 빛이라는 말 자체보다 전기 경로와 신호 처리 부품이 어떻게 바뀌는지다.

광 엔진, 레이저, 광섬유와 커넥터는 계속 필요하다. CPO를 광 부품이나 전력 소비가 사라지는 기술로 설명하지 않는다. 같은 패키지에 통합된다고 모든 구성품을 같은 교체 단위로 묶는 것도 아니다.

### 외부 레이저와 광 엔진을 나눈다

NVIDIA의 Quantum-X와 Spectrum-X Photonics 설계 설명에서는 ELS(External Laser Source)를 광 엔진과 분리하고 현장에서 교체할 수 있게 한다. 레이저의 열 환경과 파장 안정성을 관리하면서 정비할 수 있게 한 제품 설계 사례다. 모든 CPO 구현이 같은 구조라는 뜻은 아니다.

광 엔진 쪽에도 설계 차이가 있다. 같은 설명에서 Quantum-X는 socket 기반 optical subassembly를, Spectrum-X는 모듈 기판에 solder reflow한 광 엔진과 분리 가능한 광 커넥터를 소개한다. 레이저 교체가 가능하다는 사실만으로 광 엔진도 같은 방식으로 교체할 수 있다고 추정하지 않는다.

## 도입 검토 질문

다음은 구조 차이에서 도출한 검토 제안이며 실측 결과가 아니다.

- 병목이 GPU 연산, 메모리 접근, 서버 간 전송 중 어디에 있는가?
- 비교하는 대역폭은 포트, 단방향, 양방향과 시스템 합계 중 어느 기준인가?
- 전력 절감 수치는 광 링크 부분인가, 스위치 전체인가, 데이터센터 전체인가?
- 레이저, 광 엔진과 커넥터의 장애를 각각 어떻게 진단하고 어느 단위로 교체하는가?
- 같은 워크로드와 토폴로지에서 처리량, 지연, 소비 전력과 복구 시간을 비교했는가?

벤더의 특정 구성에 대한 절감 배수를 다른 포트 속도나 데이터센터 전체 비용으로 확대하지 않는다. 기술 구조의 설명과 양산 공급, 실제 도입 효과는 별도로 검증한다.

## 출처

2026-10-23 아래 공개 1차 자료로 배치 방식과 제품별 정비 경계를 대조했다. 장비 실측과 성능 배수의 독립 재현은 수행하지 않았다.

- [What is Co-Packaged Optics (CPO) Technology? — Corning](https://www.corning.com/oem-solutions/worldwide/en/home/products-solutions/optical-communication-components/co-packaged-optics.html)
- [A New Era in Data Center Networking with NVIDIA Silicon Photonics-based Network Switching — NVIDIA Technical Blog](https://developer.nvidia.com/blog/?p=97917)
- [How Industry Collaboration Fosters NVIDIA Co-Packaged Optics — NVIDIA Technical Blog](https://developer.nvidia.com/blog/how-industry-collaboration-fosters-nvidia-co-packaged-optics/)
- [Beyond CPO: A Motivation and Approach for Bringing Optics onto the Silicon Interposer — NVIDIA Research](https://research.nvidia.com/publication/2023-02_beyond-cpo-motivation-and-approach-bringing-optics-silicon-interposer)

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — 메모리와 GPU, 서버 간 통신 경로
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 계산과 데이터 이동의 비용
- [[인프라&클라우드(Infrastructure&Cloud)|인프라와 클라우드 인덱스]]
