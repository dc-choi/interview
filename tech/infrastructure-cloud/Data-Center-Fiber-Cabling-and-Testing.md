---
tags: [infrastructure, data-center, fiber, cabling, mpo, otdr, testing]
status: done
verified_at: 2026-11-14
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Data Center Fiber Cabling", "광케이블 인증 시험", "Fiber Certification", "Tier 1 Tier 2 fiber test", "OLTS", "OTDR", "MPO polarity", "MPO 극성", "OM5"]
---

# 데이터센터 광케이블 구성과 인증 시험

데이터센터의 광케이블은 한 번 깔면 서비스를 멈추고 다시 포설하기 어려우므로, 설치 직후 설계한 손실 예산을 지키는지 시험으로 증명해 두는 것이 장비 교체 주기보다 오래 가는 투자를 지키는 방법이다(해석). 이 문서는 고속 링크에 쓰는 MPO와 OM5의 구조, MPO 극성 설계, Tier 1과 Tier 2 인증 시험, 커넥터 단면 검사를 다룬다. 서버 쪽 케이블과 트랜시버 선택은 [[Server-Quotation-Checklist|서버 견적 검토]], 광 연결의 패키지 수준 변화는 [[Optical-Interconnect-and-CPO|광 인터커넥트와 CPO]]를 따른다.

## 고속 링크를 만드는 두 방식: 병렬 광과 파장 분할

100G 이상 링크를 멀티모드로 만드는 방법은 크게 두 가지다.

- **병렬 광(parallel optics)**: 여러 가닥의 광섬유에 lane을 나눠 보낸다. 한 커넥터에 8, 12, 16, 24가닥 이상을 모은 MPO 커넥터를 쓴다.
- **파장 분할(SWDM)**: 2가닥(송신, 수신)만 쓰고 한 가닥 안에 여러 파장을 실어 보낸다. 100G-SWDM4는 850, 880, 910, 940nm 부근 4개 파장에 25G씩 실어 duplex 광섬유 한 쌍으로 100G를 만든다(발표 기준, 공식 자료로는 850~940nm 범위의 4개 파장까지 확인).

### MPO 커넥터

MPO(Multi-fiber Push-On)는 밀어 끼우고 잡아 빼는 다심 커넥터다. 표준은 TIA의 FOCIS-5(TIA-604-5)이고, 16심 MPO는 별도 규격 FOCIS-18이다. MTP는 US Conec의 상표로, MPO 호환 고성능 제품을 가리킨다.

- **암수**: 정렬 핀이 있으면 male(pinned), 없으면 female(unpinned)이다. 같은 성별끼리는 맞물리지 않는다.
- **키 방향**: 어댑터는 key-up과 key-down을 잇는 Type A, key-up끼리 잇는 Type B가 있다.
- **심수와 키 위치**: 16심과 32심 MPO는 키가 중앙에서 벗어나 있어 12심, 24심 MPO와 물리적으로 맞물리지 않는다. 장비, 트렁크와 패치 코드의 심수 계열을 처음부터 맞춘다.

### OM5

OM5는 SWDM을 위해 약 850nm부터 953nm까지 대역을 규정한 광대역 멀티모드 광섬유다. OM4 규격을 만족하면서 953nm에서도 유효 모드 대역폭(EMB) 2,470MHz-km 이상을 요구한다(850nm에서는 4,700MHz-km 이상). TIA 규격 번호는 OM5 전용 TIA-492AAAE에서 개별 멀티모드 규격을 통합한 TIA-492AAAF로 바뀌었고(TIA 프로젝트 공지 기준), 2024년판은 IEC 60793-2-10 Edition 7.1을 수정 채택한 TIA-492AAAF-A다.

현장 인증은 OM5라도 기존 멀티모드처럼 850nm와 1300nm에서 시험하고, 850nm 손실 결과를 953nm 적합성의 근거로 받아들인다. 즉 현장 시험은 SWDM의 4개 파장을 각각 확인하지 않는다. 기존 OM4로도 SWDM 트랜시버가 동작할 수는 있으나 거리와 여유는 OM5 기준이 더 길게 보장되므로, 선택은 트랜시버 가격과 목표 거리로 정한다(해석).

### 싱글모드를 쓰는 이유

멀티모드는 모드 분산 때문에 속도와 거리의 물리 한계가 정해져 있다. 싱글모드는 모드 분산이 없어 대역폭 여유가 훨씬 크지만, 장거리 고속 링크에서는 색분산과 PMD가 여전히 제약이다. 그래서 싱글모드 인프라는 속도가 오를 때 케이블을 그대로 두고 트랜시버만 바꿀 여지가 크고, 멀티모드는 초기 케이블과 트랜시버 비용이 낮은 대신 세대가 바뀔 때 재포설 가능성을 안는다(해석). AI 클러스터용 고밀도 배선에 싱글모드 MPO가 많이 쓰이는 이유도 이 트레이드오프에서 읽는다(해석). 다만 NVIDIA 배선 요구사항은 멀티모드 MPO도 OM3 30m, OM4 50m 이하에서 허용한다.

## MPO 극성 설계

MPO 링크는 송신 가닥이 반대편의 수신 가닥에 닿아야 통신된다. 2심 LC는 현장에서 한쪽을 뒤집어 끼우면 송수신이 바뀌지만, MPO는 다심이 고정 배열이라 그렇게 고칠 수 없으므로 설계 단계에서 트렁크, 어댑터, 모듈과 패치 코드의 조합(연결 방법)을 정한다.

| 케이블 유형 | 배열 |
| --- | --- |
| Type A | 1번이 1번으로 직진(key-up에서 key-down) |
| Type B | 1번이 12번으로 반전(key-up에서 key-up) |
| Type C | 이웃한 두 가닥씩 쌍을 뒤집음(1번이 2번) |

| 연결 방법 | duplex 구성 | 병렬 광 구성 |
| --- | --- | --- |
| Method A | Type A 트렁크, 한쪽 끝 A-to-B 패치 코드, 다른 끝 A-to-A 패치 코드 | 한쪽 Type A 코드, 다른 쪽 Type B 코드 |
| Method B | Type B 트렁크, 양 끝 A-to-B 패치 코드. 대신 양 끝 MPO-to-LC 모듈이 서로 달라야 한다 | 양 끝 Type B 코드 |
| Method C | Type C 트렁크, 양 끝 A-to-B 패치 코드 | 병렬 광에는 맞지 않는다 |

ANSI/TIA-568.3-E(2022)는 Type B 트렁크와 A-to-B 패치 코드를 쓰면서 양 끝 모듈을 같은 부품으로 통일하는 Method U1, U2를 더했다. 어느 방법이든 한 사이트 안에서 하나로 통일하고 물량 산출 때부터 유형별로 나눠야 오배선을 줄인다(해석). 최근에는 현장에서 커넥터를 바꿔 극성 유형을 바꿀 수 있는 제품도 있으나(발표 기준) 바꾼 결과는 시험으로 다시 확인한다(해석).

## 인증 시험: Tier 1과 Tier 2

광케이블 인증 시험의 단계는 ANSI/TIA-568.3과 ISO/IEC 14763-3이 정한다. ISO 용어로는 Tier 1이 Basic, Tier 2가 Extended다.

- **Tier 1(기본)**: OLTS로 링크의 끝단 간 삽입 손실과 길이를 재서 계산한 손실 한계와 비교하고 극성을 확인한다. 설치 시험의 기본이다.
- **Tier 2(확장)**: Tier 1에 OTDR trace를 더한다. Tier 1을 대체하지 않으며 프로젝트 시방서가 요구할 때 수행한다.
- **단면 검사**: CommScope와 Fluke 가이드는 시험 전 IEC 61300-3-35 기준의 현미경 단면 검사를 강하게 권장한다.

시방서에 시험 범위가 없으면 Tier 1까지 하는 것이 통상의 합의로 받아들여진다(발표 기준). 발주처가 커넥터별 손실을 현장에서 증명하라고 요구하면 구간 전체 손실만 주는 Tier 1으로는 부족하고 OTDR이 필요하다(해석). 반면 부품 사양은 시험 방법과 다르다. 예를 들어 NVIDIA의 InfiniBand XDR/NDR, 400/800G Ethernet 구조화 배선 요구사항은 MPO를 싱글모드(OS2)와 멀티모드(OM3 30m 이하, OM4 50m 이하) 모두 APC, Type B 극성, 최대 삽입 손실 0.35dB로, 싱글모드 LC를 0.25dB로 두고, 양 끝 트랜시버 연결까지 포함한 end-to-end 기준으로 최대 삽입 손실 2dB와 링크당 커넥터 수 상한을 둔다. 이 페이지는 OLTS나 OTDR 같은 시험 방법을 정하지 않는다. 영구 링크의 Tier 1 결과에는 트랜시버 쪽 연결이 빠지므로 2dB 예산은 Tier 1 결과에 장비 코드와 트랜시버 쪽 연결 손실을 더하거나 채널 전체를 시험해 확인하고, 커넥터별 현장 증명이 필요한지는 계약 조건으로 정한다(해석).

### OLTS와 기준 설정

OLTS(Optical Loss Test Set)는 광원과 광 파워 미터 한 쌍이다. 광원이 낸 빛이 시험 구간을 지난 뒤 미터에 도착한 세기를 기준값과 빼서 손실(dB)을 낸다. 파워는 dBm으로 표시하며 0dBm은 1mW다. 광원 출력은 온도와 노후에 따라 달라지므로 시험 전에 기준 시험 코드(TRC)로 기준값을 잡는다. 멀티모드는 광원의 발광 조건을 맞추는 Encircled Flux 조건을 함께 요구한다.

기준 설정 방법은 사용하는 코드 수에 따라 측정에 포함되는 연결이 달라진다.

| 방법 | 기준에 포함되는 연결 | 측정에 남는 손실 | 쓰임 |
| --- | --- | --- | --- |
| 1-jumper | 없음 | 양 끝 연결과 케이블 전체 | TIA가 권장하는 기본 방법. 변수가 적다 |
| 2-jumper | 연결 하나 | 양 끝 연결 중 하나와 케이블 | 권장하지 않으며, 링크 끝이 plug로 종단된 경우에만 쓴다(Fluke 기준) |
| 3-jumper | 양 끝 연결 | 케이블과 중간 연결만 | 장비 포트 형태 때문에 1-jumper가 어려운 경우 |

IEC 61280-4-1은 이 방법을 코드 수(one-cord, two-cord, three-cord)와 장비 코드 방법으로 부른다. Method A, B, C라는 이름은 이전 TIA-526-14의 멀티모드 명칭이므로 문서마다 어느 체계인지 확인한다. Tier 1이 주는 것은 구간 전체 손실이며, 커넥터 하나하나의 손실은 직접 잰 값이 아니다.

### OTDR

OTDR(Optical Time Domain Reflectometer)은 한쪽 끝에서 짧은 펄스를 쏘고 되돌아오는 후방 산란과 반사를 시간으로 환산해 거리별 사건(커넥터, 융착, 굴곡, 끝단)과 손실, 반사를 보여준다. 장애 지점의 위치를 찾고 융착 손실을 판정하는 데 쓴다.

- 펄스 직후의 dead zone 때문에 첫 커넥터를 보려면 launch 코드가, 마지막 커넥터를 보려면 tail(receive) 코드가 필요하다. 예를 들어 Fluke OptiFiber Pro용 launch cord는 멀티모드 105m, 싱글모드 160m(각각 ±3m)이며, 표준이 정한 값은 아니다.
- 이어 붙인 두 광섬유의 후방 산란 특성이 다르면 한 방향 측정에서 손실이 음수(gainer)로 보이기도 하므로, 사건 손실은 양방향 측정의 평균으로 판정한다.
- MPO는 OTDR로 다심을 한 번에 재지 못하므로, 의심 가닥을 LC 등 단심 형태로 분기해 시험한다(발표 기준).

### 단면 검사

IEC 61300-3-35는 커넥터 단면을 코어(A), 클래딩(B), 접착(C), 접촉(D) 구역으로 나누고 커넥터 유형과 결함 크기별 기준을 둔다. 2022년 제3판은 C, D 구역 검사 요건을 없애고 B 구역의 바깥 경계를 115µm에서 110µm로 바꿨다. 또 단면 검사(visual inspection, 현미경 영상 검사 전체를 가리킨다) 불합격만으로 커넥터를 거부할 수 없게 해, 사용 여부는 감쇠와 반사 감쇠 같은 광학 성능 충족으로 판단한다. 검사 프로브와 카메라 중에는 이 표준 기준의 자동 PASS/FAIL 판정을 지원하는 제품이 있다(Fluke 가이드). 이 판정은 단면 등급이며 커넥터 사용 여부는 광학 성능으로 정한다.

코어 바깥의 먼지도 결합 때 코어 쪽으로 옮겨 갈 수 있고, 운영 중 진동으로 이동한 오염이 간헐 장애를 만들기도 하므로 커넥터를 꽂기 전마다 검사하고 MPO는 심수에 맞는 전용 클리너로 청소한다(발표 기준). 레이저 빛은 눈에 보이지 않는 적외선이라 활성 포트를 눈으로 들여다보지 않는다.

## MPO 전용 시험과 더 작은 다심 커넥터

MPO 전용 OLTS는 한 번에 모든 가닥의 손실과 극성 유형을 보고한다. 예를 들어 Fluke MultiFiber Pro는 8, 10, 12심 MPO의 전 가닥을 약 6초에 스캔하고 극성 A, B, C와 Corning Plug & Play Universal을 판별하며, 멀티모드 850nm와 싱글모드 1310/1550nm 모델이 있다. 16심, 24심 MPO와 MMC 링크는 시험기가 해당 커넥터를 지원하는지 따로 확인한다(Fluke 가이드는 이 범위에 CertiFiber Max를 제시한다). LC 분기 카세트를 거쳐 3-jumper로 재면 가닥 쌍마다 코드를 바꿔 끼워야 해 시간과 코드 마모가 커진다(발표 기준). 시험할 MPO 구간이 사이트 전체로 수만 개 단위가 되면 TRC는 일정 결합 횟수(발표에서는 100~250회) 뒤 교체해야 하는 소모품이므로 장비 비용과 별도로 산정한다(해석).

MPO보다 밀도를 높인 VSFF(Very Small Form Factor) 다심 커넥터도 쓰인다.

| 커넥터 | 구성 | 공식 사양 |
| --- | --- | --- |
| US Conec MMC | TMT ferrule, 1x12, 1x16, 2x12(12, 16, 24심), 250µm pitch | MPO 대비 포트 밀도 3배, 삽입 손실 0.25dB(97% 무작위 결합, TMT Elite) |
| Senko SN-MT | 1열 16심 또는 2열 32심, 200µm pitch | 최대 0.35dB, 일반 0.15dB, 일반 반사 감쇠 60dB 이상(싱글모드 APC 목표 사양) |

## 적용 점검

- 시방서가 Tier 2, 커넥터별 손실 상한, 단면 검사 기록 중 무엇을 요구하는지 시공 계약 전에 확인한다.
- 극성 연결 방법을 하나로 정하고 트렁크, 어댑터, 모듈, 패치 코드의 유형과 MPO 심수 계열을 물량표에 함께 적는다.
- OLTS 결과에는 기준 설정 방법과 TRC를 함께 남겨, 실패 재현을 1-jumper로 다시 할 수 있게 한다.
- 멀티모드와 싱글모드 선택은 초기 비용과 다음 속도 세대에서 재포설할 가능성을 함께 비교한다.

## 출처

- [DIOT 2026 데이터센터 인프라 운영기술, MPO, OM5 Fiber Cable for Data Center — 토크아이티(Talk IT), Fluke Networks](https://www.youtube.com/watch?v=ECuZoAyR9O0)
- [The Right Way to Certify Fibre — Fluke Networks](https://images.a.fluke.com/Web/FlukeCorporation/{6b1a1e0d-fe1a-451a-ba84-a0184129ad15}_net-260559-en-emea-right-way-to-certify-fibre-testing-guide-w.pdf)
- [Why the 1-Jumper Reference is Recommended — Fluke Networks](https://www.flukenetworks.com/blog/cabling-chronicles/why-1-jumper-reference-recommended)
- [101 Series: 12-Fiber MPO Polarity — Fluke Networks](https://www.flukenetworks.com/blog/cabling-chronicles/101-series-12-fiber-mpo-polarity)
- [What's the Deal with OM5 Cable Standards – WBMMF? — Fluke Networks](https://www.flukenetworks.com/blog/cabling-chronicles/what-is-the-deal-with-om5)
- [OTDR Guide — Fluke Networks](https://www.flukenetworks.com/expertise/learn-about/otdr)
- [TIA publishes ANSI/TIA-492AAAF-A — TIA](https://tiaonline.org/standardannouncement/tia-publishes-new-standard-ansi-tia-492aaaf-a-detail-specification-for-class-1a-graded-index-multimode-optical-fibers-modification-of-iec-60793-2-102022-optical-fibers-part-2-10-product-specifi)
- [Fluke Networks, OptiFiber Pro launch fiber specifications](https://pt.flukenetworks.com/knowledge-base/optifiber-pro/launch-fiber-specifications-optifiber-pro)
- [Fluke Networks, MultiFiber Pro](https://www.flukenetworks.com/mfpro)
- [CommScope, Field Testing Guidelines for Fiber-Optic Cabling](https://webresources.commscope.com/download/assets/Technical+Document:+Structured+Connectivity+Solutions+Field+Testing+Guidelines+for+Fiber-Optic+Cabli/8cc5a7503bd811f0bd0f3e67199c332c?r=1)
- [ANSI/TIA Introduces New Polarity Methods — Siemon](https://www.siemon.com/en/ansi-tia-introduces-new-polarity-methods/)
- [IEC, IEC 61300-3-35:2022](https://webstore.iec.ch/publication/64254)
- [IEC, IEC 61280-4-1](https://webstore.iec.ch/publication/72750)
- [FOA, FOCIS connector standards](https://foa.org/tech/focis.html)
- [FOA, Optical Fiber](https://www.thefoa.org/tech/ref/basic/fiber.html)
- [NVIDIA, Interconnect Structured Cabling Requirements for IB XDR/NDR and 400/800G ETH](https://networking-docs.nvidia.com/intrcnctcabreqndr400eth/intrcnctcabreqndr400eth/mpo-lc-cable-requirements)
- [US Conec, MMC Connector brochure](https://www.usconec.com/media/hohfpwn1/mmc_brochure.pdf)
- [Senko, SN-MT 16 Connector Data Sheet](https://www.senko.com/wp-content/uploads/2024/04/Data-Sheet_SN-MT-16-Connector.pdf)

## 관련 문서

- [[Server-Quotation-Checklist|서버 견적 검토]] — 케이블과 트랜시버, DAC와 AOC
- [[Optical-Interconnect-and-CPO|광 인터커넥트와 CPO]] — 패키지 수준의 광 연결
- [[Physical-DataLink-Layer|물리 계층과 데이터링크 계층]] — 광케이블, 감쇠와 WDM
- [[Data-Center-Power-Distribution|데이터센터 전력 공급과 이중화]] — 같은 시설 기반의 다른 축
