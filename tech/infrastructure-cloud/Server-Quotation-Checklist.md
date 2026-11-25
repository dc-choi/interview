---
tags: [server, hardware, memory, licensing, infrastructure, network, cabling, transceiver, power]
status: done
verified_at: 2026-11-02
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["서버 견적 검토", "Server Quotation Checklist", "케이블과 트랜시버 식별", "Cable and Transceiver Identification"]
---

# 서버 견적 검토

서버 견적은 부품의 합계와 실제 사용할 구성, 장애 대응 조건을 함께 검토한다. 지원 가능한 최대 사양을 납품 사양으로 읽지 않고, 장착 수량과 옵션을 구분한다. 장비를 잇는 케이블, 모듈과 전원 코드도 견적 줄과 실물로 확인한다. 아래는 구성 검토를 위한 질문이며 특정 제품의 구매 권고가 아니다.

## 부품 목록을 구성 조건으로 바꾼다

| 견적 항목 | 확인할 질문 |
|---|---|
| 섀시와 CPU | 랙의 공간과 설치 조건에 맞는가? 지원 소켓 수와 실제 CPU 수가 구분되는가? |
| 메모리 | 총용량뿐 아니라 DIMM 개수, CPU별 채널 배치와 지원 속도를 확인했는가? |
| 디스크 | 베이와 백플레인, 인터페이스, 컨트롤러가 원하는 구성을 지원하는가? RAID 구성 뒤 사용 용량과 부팅용 디스크를 따로 산정했는가? |
| 네트워크 | NIC, 포트와 광 모듈 또는 케이블이 견적에 포함되는가? 연결할 스위치와 규격, 링크별 거리와 양쪽 끝 부품이 맞는가? |
| 확장 | 라이저, 슬롯과 장착 CPU 구성으로 필요한 카드를 사용할 수 있는가? |
| 전원과 관리 | 장애 시 남은 전원으로 필요한 부하를 감당하는가? 전원 코드의 양쪽 끝이 전원 장치와 PDU 콘센트에 맞는가? 원격 관리에 필요한 기능과 라이선스, 관리망을 준비했는가? |
| 지원 계약 | 방문이나 응답 조건과 복구 완료 조건을 구분했는가? 설치 지역, 운영 시간과 부품 제공 조건을 확인했는가? |

이 표는 검토 제안이다. 숫자는 해당 모델의 구성표, 견적의 부품 번호와 계약 조건으로 확정한다. 영상이나 다른 모델에서 본 수치를 그대로 적용하지 않는다. 네트워크와 전원 행의 부품은 [[#연결 부품은 양쪽 끝과 길이로 읽는다|연결 부품 절]]에서 견적 줄과 실물로 확인한다.

## 메모리는 용량과 배치를 함께 본다

32 GB DIMM 16개는 합계 512 GB다. 그러나 총용량만으로 CPU별 배치나 동작 속도가 결정되지는 않는다. Dell PowerEdge R760 설치 지침은 CPU가 장착된 쪽의 메모리 소켓만 사용할 수 있고, 두 CPU 구성의 메모리 배치가 서로 맞아야 한다고 설명한다. 최적 성능을 위해 동일한 DIMM으로 채널을 균등하게 구성하도록 권고한다.

같은 문서는 시스템 프로파일, CPU와 DIMM의 지원 속도가 동작 속도에 영향을 주며, 서로 다른 속도의 DIMM을 설치하면 가장 느린 DIMM의 속도로 동작한다고 명시한다. MT/s는 초당 전송 횟수 단위다. 견적에 적힌 DIMM 정격 속도를 최종 구성의 동작 속도로 확정하지 않는다.

이는 R760 설명서의 구성 제약이다. 다른 CPU와 서버의 채널 수, 장착 순서, 혼용 가능 여부는 해당 모델 문서로 확인한다. 부팅 가능한 구성과 권장 성능 구성을 구분한다.

## CPU 수량과 소프트웨어 과금 단위를 나눈다

2026-10-23 Microsoft Windows Server 2025 Commercial Licensing 안내 대조 기준, Standard와 Datacenter의 **물리 코어 기준 라이선스**는 실제 물리 코어 수를 계산하며 CPU당 최소 8코어, 서버당 최소 16코어 조건이 있다. CPU 2개에 각각 32코어인 구성은 이 방식에서 한 번 전체 코어를 라이선스할 때 64코어분을 계산한다. 하드웨어 스레드 수로 대체하지 않는다.

VM별 라이선스는 별도 선택지이며 구독 라이선스 또는 활성 Software Assurance 조건이 있다. 따라서 모든 구매를 물리 코어 방식으로 단정하지 않는다. 이 예시는 코어 수 산정만 설명하며, 실행할 OSE 수, 에디션, CAL과 구매 계약의 권리까지 포함한 최종 견적은 아니다. 실제 권리는 Product Terms와 취득 계약으로 확인한다.

## 세대 교체 견적은 벤치마크 배수를 풀어서 읽는다

새 세대 서버가 옛 서버보다 몇 배 빠르다는 결과는 여러 시험의 평균이다. 교체와 통합 견적에서는 그 배수를 우리 워크로드, 전력과 과금 단위로 다시 풀어 본다. 아래 사양은 2026-11-25 AMD 공식 사양 페이지와 데이터시트로 대조한 소켓당 값이다.

| 항목 | 1세대 EPYC 7601 | 6세대 EPYC 9996 | 6세대 EPYC 9686F |
|---|---|---|---|
| 코어와 스레드 | 32, 64 | 256, 512 | 96, 192 |
| 기본 클럭과 최대 부스트 | 2.2 GHz, 3.2 GHz | 2.55 GHz, 4.1 GHz | 4.05 GHz, 5.3 GHz |
| L3 캐시 | 64 MB | 1,024 MB | 384 MB |
| 메모리 | DDR4 8채널, 최대 2666 MT/s, 소켓당 170.6 GB/s | DDR5 16채널, MRDIMM 12,800 MT/s에서 소켓당 이론 최대 1,638.4 GB/s | 9996과 같은 플랫폼 |
| 전력 기준 | 기본 TDP 180 W | 기본 CPU 전력 600 W(400~600 W) | 기본 CPU 전력 600 W(400~600 W) |

AMD는 6세대부터 전력 기준으로 TDP 대신 연산 다이와 I/O 다이의 전체 전력을 뜻하는 기본 CPU 전력(Default CPU Power)을 쓰고, 두 값 모두 비교와 전력 계획의 기준으로 쓸 수 있다고 설명한다. 표로 계산하면 소켓당 코어는 9996이 8배, 9686F가 3배이고 L3는 16배와 6배, 메모리 이론 대역폭은 약 9.6배다.

Phoronix는 2026-11 두 소켓 구성끼리 100개 넘는 벤치마크를 돌려 기하평균으로 9996이 7601의 12.1배, 9686F가 8.7배라고 보고했다. 원문은 2026-11-25 자동 접근 확인 페이지에 막혀 직접 대조하지 못했고, 이하 수치는 이를 인용한 Hardware Busters 기사와 GeekNews 요약 기준이다. 분야별 기하평균은 AVX-512를 쓰는 작업 16.4배, HPC 15.6배, 창작 작업 13.6배였고 OpenSSL과 데이터베이스류 서버 작업은 최대 22배, OpenVINO 추론 시험 하나는 처리량이 최대 133배였다(GeekNews 요약은 얼굴 인식 시험으로 적는다). 성능 대비 전력은 약 5배인데, CPU 자체 센서(RAPL)로 잰 값이라 팬, 메모리, 디스크와 전원 손실은 들어가지 않는다.

다음은 이 결과를 견적에 옮길 때의 읽는 법이다(적용 제안).

- **평균은 우리 작업의 배수가 아니다.** 같은 비교 안에서 기하평균은 12.1배인데 시험 하나는 최대 133배다(가장 낮은 배수는 확인한 2차 기사에 없다). 명령어 확장을 쓰는지, 메모리 대역폭에 묶이는지, 코어 수만큼 병렬화되는지에 따라 달라지므로 우리 작업을 새 장비에서 직접 잰다. 보고된 배수를 코어 배수로 나누면 코어당 약 1.5배(9996)와 2.9배(9686F)인데, 시험마다 병렬화 정도가 달라 단순 계산으로만 쓴다.
- **세대 격차에는 CPU 밖의 차이가 섞인다.** 인용한 기사는 구형 서버가 Spectre 계열 소프트웨어 완화를 모두 켠 채 돌아 시스템 호출이 많은 시험의 격차 일부가 보안 오버헤드라고 적는다. 두 서버는 메모리와 저장장치 구성도 다르다(DDR4 32GB 16개와 SATA SSD 대 MRDIMM-12800 64GB 32개와 PCIe Gen6 SSD).
- **코어 단위 과금을 다시 센다.** 위 물리 코어 라이선스처럼 코어로 과금하는 소프트웨어는 256코어 소켓 하나가 32코어 소켓 여덟 개 분량을 요구한다. 같은 작업을 더 적은 코어로 처리하는 고클럭 SKU가 라이선스 총액에서는 유리할 수 있다.
- **통합 비율은 공급사의 추정이다.** AMD 데이터시트는 2P EPYC 9996 서버(SPECrate2017_int_base 추정 4,900)로 2P Xeon Gold 6258R 서버(397)를 12대 1로 통합해 서버 약 92%, 전력 약 77%, 5년 TCO 약 40%를 줄인다고 제시하면서, 각주에서 이 시나리오가 많은 가정과 추정을 담은 정보 제공용 예시이므로 실제 시험을 대신하는 의사결정 근거로 쓰지 말라고 적는다.
- **통합하면 장애 단위가 커진다.** 옛 서버 여러 대의 일을 한 대가 맡으면 그 한 대의 장애나 정비가 그만큼의 용량을 한 번에 뺀다. N-1 헤드룸은 새 장비 단위로 다시 계산하고, 코어가 많은 신형 장비에서만 드러난 결함 사례도 함께 본다([[N-1-Capacity-Headroom#사례 — 시험에서 잰 한계가 운영 장비의 한계보다 높았다|N-1 가용량 헤드룸]]).
- **전력과 냉각 한도부터 본다.** 소켓당 기본 600 W면 두 소켓 CPU만 1,200 W다. 랙의 전력과 냉각 한도 안에 몇 대를 넣을 수 있는지 먼저 확인한다([[Data-Center-Power-Distribution|데이터센터 전력 분배]], [[Data-Center-Cooling|데이터센터 냉각]]).

## 연결 부품은 양쪽 끝과 길이로 읽는다

견적서의 네트워크와 전원 항목은 링크나 전원 경로 하나를 이루는 부품의 조합으로 읽는다. 선의 종류, 양쪽 끝 모양, 길이와 수량이 함께 맞아야 장비가 연결된다. 아래 제품 수치는 2026-11-02에 대조한 해당 제품 문서 기준이며 다른 제품으로 일반화하지 않는다. 제품명은 표기를 읽는 예시이고 구매 권고가 아니다.

### 구리 랜 케이블은 피복 인쇄에서 등급을 읽는다

피복에는 사양이 한 줄로 인쇄된다. 예를 들어 L-com Cat 5e 케이블(명세 TC8500)의 피복 인쇄는 `(UL) CMG 75°C 4PR 24AWG ETL VERIFIED TO ANSI/TIA-568-C.2 CAT. 5E PATCH CABLE --- UTP` 형태이고, 도체는 4쌍, 24 AWG다.

| 인쇄 | 읽는 법 |
|---|---|
| U/UTP, F/UTP, S/FTP | 차폐 표기다(Fluke Networks가 정리한 ISO/IEC 11801 약어). U/UTP는 전체 차폐와 쌍별 차폐가 없고, F/UTP는 케이블 전체만 차폐하며, S/FTP는 전체 편조 차폐에 쌍별 호일 차폐를 더한다 |
| 4PR, 24AWG | 쌍 수와 도체 굵기(AWG)다. 위 명세의 구성은 4쌍, 24 AWG다 |
| CM, CMG, CMR, CMP | UL 마킹 가이드가 미국 NEC Article 800에 묶은 통신 케이블 유형이다. 유형 뒤 접미사 P는 플레넘, R은 라이저, G나 접미사 없음은 일반 용도를 뜻한다. L-com 명세는 이 유형을 난연 등급(Flammability Rating) 칸에 적는다 |
| 75°C | 온도 정격이다. 이 통신 케이블 유형들의 최소 정격은 60°C이고, 그보다 높게 표시한 정격은 건조한 장소에만 적용된다 |
| CAT5E, CAT6, CAT6A | 카테고리다. 쓸 수 있는 이더넷 속도와 거리가 달라지며, 위 L-com 인쇄의 `ETL VERIFIED TO ANSI/TIA-568-C.2`처럼 TIA-568 검증 표시와 함께 인쇄되기도 한다 |

차폐 표기는 Fluke Networks가 ISO/IEC 11801의 약어라고 밝힌 범위만 확인했고 표준 원문은 확인하지 않았다. 유형, 접미사와 온도 정격은 UL 마킹 가이드 2022년 6월판 기준이며, 2016년 7월판도 통신 케이블 행(Article 800, 최소 60°C)과 온도 주석이 같다. 설치 공간에 필요한 유형은 설치 지역의 규정으로 확인한다(적용 제안).

Intel X540 어댑터의 케이블 요구사항 기준, 1000BASE-T는 Cat5e, Cat6, Cat6A에서 모두 100 m다. 10GBASE-T는 Cat6에서 55 m, Cat6A에서 100 m이고 Cat5e는 지원하지 않는다. 이 거리는 X540 제품군 문서의 값이다.

기존 Cat6 배선이 10GBASE-T를 감당하는지는 TIA TSB-155(표준이 아닌 기술 회보)가 다룬다. TSB-155는 10GBASE-T가 Cat6 채널 37 m까지 동작하고, 37~55 m는 외부 누화(alien crosstalk) 환경에 따라 다르며, 55 m를 넘으면 완화 조치가 필요할 수 있다고 본다(Fluke Networks의 2014년 설명, TSB 원문은 확인하지 않았다). 30 m 링크가 외부 누화 요건을 통과하지 못하고 60 m 링크가 통과한 관측도 있어, 링크의 적합성은 500 MHz까지의 채널 시험과 외부 누화 시험으로만 알 수 있다(Fluke Networks). 새로 까는 10GBASE-T 구간은 Cat6A 이상으로 견적을 받고, 기존 Cat6를 다시 쓰는 구간은 양쪽 장비 문서가 정한 지원 거리(예: X540은 Cat6 55 m) 안에서만 검토하고, 그 안에서도 길이만으로 판정하지 않고 외부 누화까지 현장 시험으로 확인한다. 이 거리를 넘는 구간은 Cat6A 이상이나 광 링크로 견적한다(적용 제안).

### 광케이블과 트랜시버는 등급, 커넥터와 거리를 함께 맞춘다

피복 색은 광섬유 종류의 단서일 뿐이다. 레이저 최적화 멀티모드인 OM3와 OM4는 아쿠아이고 OM4를 바이올렛으로 구분하는 제조사도 있으며, OM5는 라임이다(Leviton). 주황 피복은 OM1일 가능성이 높지만 OM2에도 주황 케이블이 있으므로(Leviton), 색만으로 등급을 확정하지 않고 피복 인쇄를 확인한다(적용 제안). 싱글모드에서는 ICC의 OS2 패치 코드처럼 싱글모드용임을 나타내려고 노란 피복을 쓰는 제품이 있다. 이 색들은 업계 표준 단체가 정한 체계에서 나왔다고 설명되지만(Leviton) 표준 원문은 확인하지 않았다.

Cisco SFP+ 데이터시트 기준 10GBASE-SR은 850 nm 멀티모드에서 OM3 300 m, OM4 400 m이고, 10GBASE-LR은 싱글모드(G.652)에서 10 km다. 이 모듈들의 커넥터는 듀플렉스 LC(PC, Physical Contact 연마)이고, APC(Angled Physical Contact) 커넥터 패치 코드는 지원하지 않는다(Cisco). APC 커넥터는 끝면이 8도 기울어 있고 초록색이며, UPC(Ultra Physical Contact) 커넥터는 싱글모드에서 파랑이다(Fluke Networks의 2014년 테스터 설명). 이 설명은 멀티모드 UPC를 베이지로 들지만 멀티모드 등급별 색은 다루지 않는다. 멀티모드 커넥터 색은 단서로만 쓰고, 양쪽 끝의 연마 방식을 장비 쪽 커넥터 사양에 맞춘다(적용 제안).

40G와 100G의 SR4 모듈은 MPO-12 커넥터로 여러 가닥을 한 번에 꽂는다. Cisco 기준 QSFP-40G-SR4는 OM3 100 m, OM4 150 m이고 QSFP-100G-SR4-S는 OM3 70 m, OM4 100 m다. 40G와 100G에도 LC 커넥터 모듈이 있다. QSFP-40G-SR-BD는 두 가닥 멀티모드(듀플렉스 LC)로 40G를 전송해 기존 10G 듀플렉스 멀티모드 배선을 다시 쓸 수 있게 하고, 100G에는 LC를 쓰는 SR-BiDi 모듈 QSFP-100G-SR1.2가 있다(Cisco). 같은 OM3 배선이라도 모듈에 따라 요구하는 커넥터, 가닥 수와 지원 거리가 달라지므로, 증설할 때는 새 모듈의 커넥터(듀플렉스 LC 또는 MPO-12), 필요한 가닥 수와 거리를 기존 배선과 함께 다시 확인한다(적용 제안).

| 모듈 | Cisco 문서 기준 |
|---|---|
| SFP | 1G 이더넷. 100M/1G 겸용 모듈(GLC-GE-DR-LX)과 10/100/1000 자동 협상을 지원하는 1000BASE-T SFP도 있어 폼팩터 이름이 곧 속도는 아니다 |
| SFP+ | 10G 이더넷 |
| SFP28 | 25G. SFF-8402가 정한 SFP+ 계열 28 Gb/s 1채널 모듈이다 |
| QSFP+ | 40G. Q는 Quad를 뜻하며 SR4 모듈은 4레인을 쓴다 |
| QSFP28 | 100G. SFF-8665가 정한 QSFP+ 계열 28 Gb/s 4채널 모듈이다 |

Cisco의 1G, 10G, 40G, 100G 모듈은 장비 전원을 끄지 않고 장착하거나 교체할 수 있는 hot-swappable 장치다(각 데이터시트, 전원 차단이 필요 없다는 문구는 10G 문서). 지원 장비는 호환 매트릭스로 확인하며, 목록에 있는 장비라도 모든 모듈을 지원하지는 않는다(Cisco 10G 데이터시트). 직결 링크는 양쪽 포트에 모듈이 하나씩 들어간다. 다만 QSFP-40G-SR4를 4x10G 브레이크아웃으로 쓰면 모듈 하나가 10G 링크 넷을 맡고, 1000BASE-BX10-D는 1000BASE-BX10-U와 짝을 이룬다(Cisco). 이름이 비슷한 모듈은 라벨과 부품 번호로 구분하고, 모듈 수량은 포트 단위로 세며 양 끝 부품 조합, 거리 등급과 케이블 종류는 링크 단위로 맞춘다(적용 제안).

### DAC와 AOC는 머리와 선이 한 조립품이다

흔히 DAC라고 부르는 구리 twinax 직결 케이블과 AOC(Active Optical Cable)는 양쪽 끝에 모듈 모양의 머리가 붙은 조립품이다. twinax 직결 케이블은 매우 짧은 거리용이고, AOC는 양 끝에 SFP+ 커넥터가 달린 광섬유 직결 조립품이다(Cisco SFP+ 데이터시트). 조립품마다 길이가 고정되며, Cisco는 아래 표처럼 길이별 부품 번호로 판매하고 브레이크아웃용 구리 케이블과 AOC도 별도 부품 번호로 둔다.

| Cisco 제품군 | 수동 구리 DAC | AOC |
|---|---|---|
| SFP+ 10G | 1~5 m | 1~10 m |
| SFP28 25G | 1~5 m | 1~10 m |
| QSFP+ 40G | 0.5~5 m | 1~30 m |
| QSFP28 100G | 1~5 m | 1~30 m |

7 m와 10 m 능동 구리 케이블도 있다(Cisco SFP+, 40G 데이터시트). AOC는 구리 케이블보다 훨씬 가늘고 가벼워 케이블 정리가 쉽다(Cisco 40G, 100G 데이터시트).

이 문단의 선택 규칙은 모두 적용 제안이다. 먼저 거리를 정해, 같은 랙이나 옆 랙처럼 수 m 안이면 DAC, 그보다 길고 AOC 길이 안이면 AOC, 그 밖이면 트랜시버와 광케이블을 검토하고, 거리로 후보를 좁힌 뒤 케이블 굵기와 공기 흐름, 가격도 함께 비교한다. DAC나 AOC를 고르면 양쪽 장비의 호환 목록에 그 부품 번호가 있는지 확인하고, 실제 경로 길이를 재서 길이별 부품 번호를 고르며, 예비품도 조립품 단위로 잡는다.

### 전원 코드는 양쪽 끝 규격과 PDU 콘센트를 맞춘다

IEC 60320 계열 전원 코드의 끝 모양 이름(C13 등)은 커플러 종류를 가리키며, 그 끝의 정격은 인증 지역에 따라 다를 수 있어 부품 표시로 확인한다. Interpower 제품 설명 기준 C13 커넥터와 C14 인렛은 국제 정격 10 A/250 VAC(북미 15 A)이고, C19 커넥터와 C20 인렛은 국제 16 A/250 VAC(북미 20 A)다. 커넥터는 인렛을 통해 장비에 전원을 넣는 코드 끝이고 인렛은 장비의 전원 입력부이며, 인렛 번호는 짝이 되는 커넥터 번호보다 1 크다. 코드 세트 전체의 전류와 전압 정격은 플러그, 케이블, 커넥터 가운데 가장 낮은 정격을 따르므로, 13 A, 12 A, 10 A 부품으로 만든 코드 세트는 10 A다(Interpower).

랙 PDU에는 콘센트 규격이 섞인 제품이 있다. Schneider Electric AP7553은 랙 공간을 아끼는 Zero U 세로 장착형으로 C13 콘센트 20개와 C19 콘센트 4개를 둔다. 서버 전원 장치의 인렛 규격(C14 또는 C20)과 꽂을 PDU 콘센트 규격(C13 또는 C19)을 각각 확인하고, 양쪽 끝이 맞는 코드를 전원 장치 수만큼 견적에 넣되, 코드의 두 끝과 케이블, PDU 콘센트 가운데 가장 낮은 정격이 전원 장치의 입력 전류를 감당하는지 확인한다(적용 제안). Schneider Electric AP9870은 양 끝이 C13과 C14인 코드의 예다.

코드 색으로 이중 전원 경로를 나누는 제품과 운영 방식이 있다. 예를 들어 Raritan SecureLock 코드에는 A 경로를 빨강, B 경로를 파랑으로 맞춰 이중화된 전원 경로를 구분하는 색 구성이 있다(Legrand 제품 설명). 2026-11-02 대조 범위에서 색을 정한 표준은 확인하지 못했으므로 색만으로 경로를 판정하지 않고, 두 전원 장치가 서로 다른 PDU와 회로에 연결됐는지 라벨과 실제 배선으로 확인한다(적용 제안). 전원 장치 이중화와 정상 성능의 구분은 [[GPU-Server-Infrastructure#전원 이중화와 정상 성능은 구분한다|GPU 서버 인프라의 전원 이중화]]를 따른다.

## 확인 질문

- 같은 512 GB 구성 두 개를 비교할 때 DIMM 개수와 CPU별 배치를 왜 함께 확인하는가?
- 지원 소켓 두 개 중 하나만 장착하면 메모리와 확장 구성을 어떤 문서로 확인할 것인가?
- CPU의 코어와 스레드 중 구매하려는 소프트웨어가 계산하는 단위는 무엇인가?
- 새 세대 서버의 몇 배라는 벤치마크 결과를 우리 작업의 실측, 코어 단위 라이선스와 커진 장애 단위로 어떻게 다시 계산하는가?
- 장애 대응 계약에서 응답이나 방문과 서비스 복구 완료를 어떻게 구분할 것인가?
- 기존 OM3 듀플렉스 LC 배선을 10G에서 40G나 100G로 올릴 때 새 모듈의 커넥터, 필요한 가닥 수와 거리를 왜 다시 확인하는가?
- 서버 전원 장치의 인렛과 랙 PDU의 콘센트 규격으로 전원 코드의 양쪽 끝과 수량을 정한 뒤, 코드 세트의 정격이 전원 장치의 입력 전류를 감당하는지 어떻게 확인하는가?

실제 장비의 부하 시험, 장애 전환, 케이블과 모듈의 실장 호환성과 개별 지원 계약은 검증하지 않았다.

## 출처

- [Dell PowerEdge R760 Installation and Service Manual, General memory module installation guidelines](https://www.dell.com/support/manuals/en-us/oth-r760/per760_ism_pub/general-memory-module-installation-guidelines?guid=guid-841ca5c9-cf8d-4c22-9ea0-761296b8c5d7&lang=en-us)
- [Microsoft Licensing, Windows Server 2025 Licensing Guidance](https://www.microsoft.com/licensing/guidance/Windows-Server-2025)
- [AMD, AMD EPYC 9006 SP7 Series Server CPUs Data Sheet](https://www.amd.com/content/dam/amd/en/documents/epyc-technical-docs/other/amd-epyc-9006-sp7-server-cpus-data-sheet.pdf) — 2026-11-25 대조. 9996과 9686F의 코어, 클럭, L3와 기본 CPU 전력, 16채널 MRDIMM 12,800 MT/s와 소켓당 이론 대역폭, Default CPU Power 정의, 12:1 통합 시나리오와 각주의 한계
- [AMD, AMD EPYC 7601 Drivers and Downloads](https://www.amd.com/en/support/downloads/drivers.html/processors/epyc/epyc-7001-series/amd-epyc-7601.html) — 2026-11-25 사양 표 대조. 코어, 클럭, L3, 기본 TDP, DDR4 8채널과 소켓당 메모리 대역폭
- [AMD EPYC Zen 6 vs. Zen 1 Performance: 12.1x Geo Mean In Less Than 10 Years, Up To 133x In AI Review — Phoronix](https://www.phoronix.com/review/amd-epyc-9006-7601) — 벤치마크 원문. 2026-11-25 자동 접근 확인 페이지에 막혀 본문을 대조하지 못했고 제목만 검색 결과로 확인했다
- [EPYC Zen 6 vs Zen 1: Nine Years Bought 12.1x the Server Throughput, and Up to 133x in AI — Hardware Busters](https://hwbusters.com/news/epyc-zen-6-vs-zen-1-nine-years-bought-12-1x-the-server-throughput-and-up-to-133x-in-ai/) — Phoronix 결과를 인용한 2차 기사, 2026-11-25 대조. 시험 구성, 분야별 기하평균과 RAPL 기준 성능 대비 전력
- GeekNews, 2026-11-25 제공 요약: AMD EPYC Zen 6 대 Zen 1 성능 비교: 10년도 안 돼 기하평균 12.1배 (토픽 번호 미확인, 원문 식별에 사용)
- [Cisco, Cisco SFP Modules for Gigabit Ethernet Applications Data Sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/gigabit-ethernet-gbic-sfp-modules/datasheet-c78-366584.html)
- [Cisco, Cisco 10GBASE SFP+ Modules Data Sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/data_sheet_c78-455693.html)
- [Cisco, Cisco 25GBASE SFP28 Modules Data Sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/datasheet-c78-736950.html)
- [Cisco, Cisco 40GBASE QSFP Modules Data Sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/data_sheet_c78-660083.html)
- [Cisco, Cisco 100GBASE QSFP-100G Modules Data Sheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/datasheet-c78-736282.html)
- [Intel, Cable Requirements for Intel Ethernet Converged Network Adapter X540 Series](https://www.intel.com/content/www/us/en/support/articles/000007404.html)
- [Fluke Networks Knowledge Base, Acronyms for cables - DSX CableAnalyzer](https://www.flukenetworks.com/knowledge-base/dsx-cableanalyzer-series/acronyms-cables-dsx-cableanalyzer)
- [Fluke Networks Knowledge Base, APC connectors and the CertiFiber Pro](https://www.flukenetworks.com/knowledge-base/certifiber-pro/apc-connectors-and-certifiber-pro)
- [Fluke Networks Knowledge Base, 10GBASE-T field testing requirements](https://www.flukenetworks.com/knowledge-base/applicationstandards-articles-copper/10gbase-t-field-testing-requirements)
- [UL, Wire and Cable Marking and Application Guide, 2022년 6월판](https://code-authorities.ul.com/2023/06/30/wire-and-cable-marking-and-application-guide/)
- [UL, Wire and Cable Marking and Application Guide, 2016년 7월판](https://code-authorities.ul.com/wp-content/uploads/2014/04/WC_MG.pdf)
- [L-com, Cat 5e UTP Bulk Cable Specification TC8500 Revision C](https://l-com.com/Images/Downloadables/2D/TC8501_2D.pdf) — 링크 파일명의 TC8501은 같은 명세에 있는 검정 피복 부품 번호
- [ICC, Singlemode OS2 LC to LC 9/125µm Fiber Patch Cable](https://icc.com/product/lc-duplex-singlemode-9-125-os2-fiber-optic-patch-cable-yellow/)
- [Interpower, Designing Products with IEC 60320 C13 Connectors and C14 Inlets](https://www.interpower.com/ic/InfoPower/iec-60320-c13-c14.html)
- [Interpower, Designing Products with IEC 60320 C19 Connectors and C20 Inlets](https://www.interpower.com/ic/InfoPower/iec-60320-c19-c20.html)
- [Incompatible and Compatible Power Cords: The Truth May Shock You — Interpower](https://email.interpower.com/incompatible-and-compatible-power-cords-the-truth-might-shock-you)
- [Schneider Electric, AP7553 Rack PDU, Basic, Zero U, 32A, 230V, (20)C13 & (4)C19](https://www.se.com/au/en/product/AP7553/rack-pdu-basic-zero-u-32a-230v-20c13-4c19)
- [Schneider Electric, AP9870 Power Cord, C13 to C14, 2.5m](https://www.se.com/us/en/product/AP9870/power-cord-c13-to-c14-2-5m)
- [Legrand, SecureLock Power Cords - Raritan](https://www.legrand.com/datacenter/en/white-space/in-rack-power-management/power-accessories/data-center-accessories-securelock-power-cords-raritan)
- [Recognizing Multimode Fiber Types by Color — Leviton](https://leviton.com/support/literature/blogs/recognizing-multimode-fiber-types-color)
- [YouTube, 동국시스템즈 IT 채널, 서버 견적서, 한 줄씩 읽어 드립니다](https://www.youtube.com/watch?v=o7ts031-ZqE) — 검토 질문의 계기이며 예시 사양을 실제 제품의 사양으로 사용하지 않음
- [YouTube, 동국시스템즈 IT 채널, 케이블만 봐도 안다, 랜/광/DAC/전원 코드, 실물로 구분하는 법](https://www.youtube.com/watch?v=Y_0p7VjYM10) — 연결 부품 절의 계기이며 거리, 길이와 정격은 위 제조사 문서와 UL 가이드로 대조함

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[AWS-Pricing-Estimation|AWS 비용 추정]]
- [[Physical-DataLink-Layer|물리 계층과 데이터링크 계층]] — 전송 매체와 트위스티드 페어의 거리 한계
- [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크]] — 업링크용 SFP 포트와 콤보 포트
- [[Optical-Interconnect-and-CPO|광통신과 CPO]] — 플러그형 광 트랜시버와 CPO의 광 변환 위치
