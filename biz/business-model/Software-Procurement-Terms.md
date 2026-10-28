---
tags: [business, procurement, outsourcing, rfp, sow, sla]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Software Procurement Terms", "소프트웨어 구매와 계약 용어"]
---

# 소프트웨어 구매와 계약 용어

소프트웨어 구매에서는 시장 정보, 제안, 견적, 검증 결과와 수행 약속을 구분한다. 약어를 모두 순서대로 거쳐야 하는 단일 절차로 보지 않고, 이번 거래에서 어떤 결정을 내리기 위해 어떤 자료가 필요한지 확인한다.

## 정보 요청과 제안, 견적을 나눈다

| 용어 | 풀네임 | 목적과 확인할 내용 |
| --- | --- | --- |
| RFI | Request for Information | 공급 역량, 가격과 납기 등 시장 정보를 탐색한다 |
| RFP | Request for Proposal | 요구사항과 평가 기준을 제시하고 해결 방법과 수행 조건의 제안을 받는다 |
| RFQ | Request for Quotation | 제시한 작업 범위와 조건에 대한 견적을 받는다 |
| BAFO | Best and Final Offer | 정해진 절차 안에서 후보에게 마지막으로 제안을 개선할 기회를 준다 |

미국 FAR 15.201(e)의 RFI는 당장 계약을 체결할 의도가 없는 계획 단계에서도 쓰며, 응답은 계약 체결을 위한 offer가 아니다. FAR 15.203의 경쟁 RFP에는 요구사항, 예상 계약 조건, 제출 정보와 평가 요소를 명시한다. FAR 8.405-2의 특정 서비스 발주에서는 RFQ 안에 작업명세서와 평가 기준이 함께 들어간다. 따라서 RFQ를 가격 숫자만 받는 문서로 한정하지 않는다.

세계은행의 2025년 9월 조달 규정 6.32에서 BAFO는 가격 인하뿐 아니라 제안의 명확화, 수정과 추가 정보도 포함한다. 사전 검토 대상 국제 경쟁조달에서 은행이 동의하는 선택지이며, 적용 여부를 입찰 문서에 알리고 BAFO 이후에는 협상하지 않는다고 명시한다. 이 조건을 국내 민간 외주의 공통 의무로 옮기지 않는다.

위 근거들은 서로 다른 제도의 실제 사용 예다. 특정 거래의 순서, 낙찰 방식과 법적 효과는 해당 구매 규정 및 계약 문서로 확인한다.

## 공유, 검증과 수행 약속을 나눈다

| 용어 | 풀네임 | 역할 |
| --- | --- | --- |
| NDA | Non-Disclosure Agreement | 상대에게 공유하는 정보의 비밀유지 조건을 정한다 |
| PoC | Proof of Concept | 정해진 가설과 범위에서 실현 가능성을 검증한다 |
| SOW | Statement of Work | 수행할 업무, 기간, 산출물과 성능 기준 등을 명시한다 |
| SLA | Service Level Agreement | 약속할 서비스 수준, 측정 지표와 미달 시 조치를 정한다 |

NDA의 비밀유지 역할과 소프트웨어 납품 범위는 별개다. SOW는 작업과 산출물의 약속이며, SLA는 가동률, 응답 시간 등 서비스 수준의 약속이다. FAR 8.405-2의 SOW 구성은 작업 내용과 위치, 수행 기간, 납품 일정, 성능 기준과 특별 요구사항이다. AWS의 SLA 설명은 지표뿐 아니라 미달 시 추가 지원, 할인 또는 환불 같은 보완 조치도 다룬다.

AWS의 생성형 AI PoC 가이드는 사업 가치, 데이터 준비, 기술적 실현 가능성과 위험을 검증 대상으로 둔다. 이 관점을 소규모 구매에 적용한다면 시연 화면이 동작하는지와 실제 데이터 및 환경에서 성공 기준을 충족하는지를 나눠 확인할 수 있다. 모든 거래에서 고객의 운영 데이터를 직접 사용해야 한다는 뜻은 아니다.

## 소규모 외주에 적용하는 질문

다음은 위 용어를 개발 외주에 적용한 운영 제안이다. 표준 계약 양식이나 법정 필수 순서가 아니다.

1. 정보 탐색인지 실제 구매 요청인지 확인하고, 제안 준비에 쓸 시간과 공개할 자료를 정한다.
2. 견적을 비교할 때 기능 범위, 제외 업무, 고객의 제공 자료와 검수 기준을 같은 조건으로 맞춘다.
3. PoC를 한다면 기간, 비용, 데이터 사용 범위, 성공 기준과 종료 후 구매 판단자를 먼저 합의한다.
4. 계약에는 구축 산출물과 운영 지원을 구분하고, 변경 요청과 인수 이후의 책임을 연결한다.
5. 구독이나 유지보수의 갱신 주기와 해지 조건은 실제 계약에서 확인한다. 구축 계약이 있다는 이유만으로 매년 갱신하는 구조라고 가정하지 않는다.

요청 문서가 많으면 제안 준비 비용도 늘어난다. 작은 거래에서는 필요한 질문을 한 문서에 모을 수 있지만, 견적과 검수의 기준이 서로 달라지지 않도록 합의된 범위를 남긴다.

## 출처

2026-10-28 아래 1차 자료의 해당 용어와 적용 범위를 대조했다. 미국 및 세계은행 조달 절차, 호주 사업 안내와 벤더 문서를 국내 계약에 적용되는 법률로 해석하지 않는다.

- [Acquisition.gov, FAR 15.201 Exchanges with industry before receipt of proposals](https://www.acquisition.gov/far/15.201)
- [Acquisition.gov, FAR 15.203 Requests for proposals](https://www.acquisition.gov/far/15.203)
- [Acquisition.gov, FAR 8.405-2 Ordering procedures for services requiring a statement of work](https://www.acquisition.gov/far/8.405-2)
- [World Bank, Procurement Regulations for IPF Borrowers, Seventh Edition, September 2025](https://thedocs.worldbank.org/en/doc/c84273d1b230aeb2b0b8134de5dc8cd7-0290012025/original/Procurement-Regulations-7th-Edition-Sep-2025.pdf) — 6.32, BAFO
- [Your top IP questions answered — business.gov.au](https://business.gov.au/news/your-top-ip-questions-answered) — NDA의 정보 보호 역할
- [AWS, Architecting a successful generative AI proof of concept](https://docs.aws.amazon.com/prescriptive-guidance/latest/gen-ai-lifecycle-operational-excellence/dev-architecting.html)
- [What is an SLA (Service Level Agreement)? — AWS](https://aws.amazon.com/what-is/sla/)

## 관련 문서

- [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]
- [[B2B-Sales-Pipeline-and-Pilot|B2B 영업 파이프라인과 파일럿]]
- [[Public-Procurement-Small-Contracts|국가기관과 지방자치단체의 소액 수의계약]]
- [[PRD-Writing|요구사항과 비범위 정리]]
