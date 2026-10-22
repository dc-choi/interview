---
tags: [server, hardware, memory, licensing, infrastructure]
status: done
verified_at: 2026-10-23
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["서버 견적 검토", "Server Quotation Checklist"]
---

# 서버 견적 검토

서버 견적은 부품의 합계와 실제 사용할 구성, 장애 대응 조건을 함께 검토한다. 지원 가능한 최대 사양을 납품 사양으로 읽지 않고, 장착 수량과 옵션을 구분한다. 아래는 구성 검토를 위한 질문이며 특정 제품의 구매 권고가 아니다.

## 부품 목록을 구성 조건으로 바꾼다

| 견적 항목 | 확인할 질문 |
|---|---|
| 섀시와 CPU | 랙의 공간과 설치 조건에 맞는가? 지원 소켓 수와 실제 CPU 수가 구분되는가? |
| 메모리 | 총용량뿐 아니라 DIMM 개수, CPU별 채널 배치와 지원 속도를 확인했는가? |
| 디스크 | 베이와 백플레인, 인터페이스, 컨트롤러가 원하는 구성을 지원하는가? RAID 구성 뒤 사용 용량과 부팅용 디스크를 따로 산정했는가? |
| 네트워크 | NIC, 포트와 광 모듈 또는 케이블이 견적에 포함되는가? 연결할 스위치와 규격이 맞는가? |
| 확장 | 라이저, 슬롯과 장착 CPU 구성으로 필요한 카드를 사용할 수 있는가? |
| 전원과 관리 | 장애 시 남은 전원으로 필요한 부하를 감당하는가? 원격 관리에 필요한 기능과 라이선스, 관리망을 준비했는가? |
| 지원 계약 | 방문이나 응답 조건과 복구 완료 조건을 구분했는가? 설치 지역, 운영 시간과 부품 제공 조건을 확인했는가? |

이 표는 검토 제안이다. 숫자는 해당 모델의 구성표, 견적의 부품 번호와 계약 조건으로 확정한다. 영상이나 다른 모델에서 본 수치를 그대로 적용하지 않는다.

## 메모리는 용량과 배치를 함께 본다

32 GB DIMM 16개는 합계 512 GB다. 그러나 총용량만으로 CPU별 배치나 동작 속도가 결정되지는 않는다. Dell PowerEdge R760 설치 지침은 CPU가 장착된 쪽의 메모리 소켓만 사용할 수 있고, 두 CPU 구성의 메모리 배치가 서로 맞아야 한다고 설명한다. 최적 성능을 위해 동일한 DIMM으로 채널을 균등하게 구성하도록 권고한다.

같은 문서는 시스템 프로파일, CPU와 DIMM의 지원 속도가 동작 속도에 영향을 주며, 서로 다른 속도의 DIMM을 설치하면 가장 느린 DIMM의 속도로 동작한다고 명시한다. MT/s는 초당 전송 횟수 단위다. 견적에 적힌 DIMM 정격 속도를 최종 구성의 동작 속도로 확정하지 않는다.

이는 R760 설명서의 구성 제약이다. 다른 CPU와 서버의 채널 수, 장착 순서, 혼용 가능 여부는 해당 모델 문서로 확인한다. 부팅 가능한 구성과 권장 성능 구성을 구분한다.

## CPU 수량과 소프트웨어 과금 단위를 나눈다

2026-10-23 Microsoft Windows Server 2025 Commercial Licensing 안내 대조 기준, Standard와 Datacenter의 **물리 코어 기준 라이선스**는 실제 물리 코어 수를 계산하며 CPU당 최소 8코어, 서버당 최소 16코어 조건이 있다. CPU 2개에 각각 32코어인 구성은 이 방식에서 한 번 전체 코어를 라이선스할 때 64코어분을 계산한다. 하드웨어 스레드 수로 대체하지 않는다.

VM별 라이선스는 별도 선택지이며 구독 라이선스 또는 활성 Software Assurance 조건이 있다. 따라서 모든 구매를 물리 코어 방식으로 단정하지 않는다. 이 예시는 코어 수 산정만 설명하며, 실행할 OSE 수, 에디션, CAL과 구매 계약의 권리까지 포함한 최종 견적은 아니다. 실제 권리는 Product Terms와 취득 계약으로 확인한다.

## 확인 질문

- 같은 512 GB 구성 두 개를 비교할 때 DIMM 개수와 CPU별 배치를 왜 함께 확인하는가?
- 지원 소켓 두 개 중 하나만 장착하면 메모리와 확장 구성을 어떤 문서로 확인할 것인가?
- CPU의 코어와 스레드 중 구매하려는 소프트웨어가 계산하는 단위는 무엇인가?
- 장애 대응 계약에서 응답이나 방문과 서비스 복구 완료를 어떻게 구분할 것인가?

실제 장비의 부하 시험, 장애 전환과 개별 지원 계약은 검증하지 않았다.

## 출처

- [Dell PowerEdge R760 Installation and Service Manual, General memory module installation guidelines](https://www.dell.com/support/manuals/en-us/oth-r760/per760_ism_pub/general-memory-module-installation-guidelines?guid=guid-841ca5c9-cf8d-4c22-9ea0-761296b8c5d7&lang=en-us)
- [Microsoft Licensing, Windows Server 2025 Licensing Guidance](https://www.microsoft.com/licensing/guidance/Windows-Server-2025)
- [YouTube, 동국시스템즈 IT 채널, 서버 견적서, 한 줄씩 읽어 드립니다](https://www.youtube.com/watch?v=o7ts031-ZqE) — 검토 질문의 계기이며 예시 사양을 실제 제품의 사양으로 사용하지 않음

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[AWS-Pricing-Estimation|AWS 비용 추정]]
