---
tags: [business, customer-support, operations, metrics, automation, cost]
status: done
verified_at: 2026-10-07
category: "비즈니스&제품(Business&Product)"
aliases: ["Customer Support Operations Metrics", "고객지원 운영 지표", "상담 자동화 성과 측정"]
---

# 고객지원 운영 지표와 자동화 비용

고객지원의 성과는 고객이 필요한 일을 마쳤는지, 얼마나 기다렸는지, 처리에 얼마가 들었는지를 함께 측정한다. 상담 화면 통합이나 AI 도입은 수단이므로 도구 수, 상담 시간과 고객의 문제 해결을 서로 다른 지표로 둔다.

아래 AWS 지표와 과금 범위는 2026-10-07 공식 문서 기준이다. 이를 소규모 지원 업무에 적용하는 비교표와 절차는 운영 제안이며, 특정 회사의 절감률을 재현한 결과가 아니다.

## 상담 한 건과 고객의 문제 한 건을 구분한다

한 문제를 해결하려고 전화, 채팅과 후속 이메일이 오갔다면 접점은 여러 개지만 문제는 하나일 수 있다. 상담 종료를 문제 해결로 계산하지 않도록 해결 조건과 재문의 관찰 기간을 먼저 정한다.

| 측정 축 | 운영상 정의 제안 | 함께 확인할 조건 |
| --- | --- | --- |
| 접근성 | 대기 시간과 상담 연결 전 포기 | 채널, 운영 시간과 콜백 처리 기준 |
| 처리 효율 | 상담 처리 시간과 상담 후 정리 시간 | 쉬운 문의만 자동화됐는지, 사람에게 남은 문의의 난이도 |
| 고객 결과 | 해결된 문제 수, 재문의와 재개방 | 처리 종료와 실제 예약, 환불 등 업무 완료의 차이 |
| 미처리 업무 | 남은 문제 수와 오래된 건의 대기 기간 | 신규 유입, 해결, 취소와 다른 부서로의 이동 |
| 경제성 | 해결된 문제 한 건당 총비용 | 도구 청구액, 사람의 처리와 검수, 재작업 비용 |

예를 들어 미처리 건수가 줄어도 취소나 다른 팀으로의 이관이 늘었다면 해결 능력이 좋아졌다고 단정할 수 없다. 예약 지원은 통화 종료와 예약 완료를 따로 기록한다. 이 구분은 업종과 도구에 맞춰 정의한다.

## 제품 지표의 포함 범위를 확인한다

Amazon Connect의 **Abandonment rate**는 대기열에 들어간 contact 중 상담원 연결 전에 고객이 연결을 끊은 contact의 비율이다. 콜백 대기 contact는 포기로 세지 않는다. 분모는 전체 고객 수나 해결할 문제 수가 아니다.

**Average handle time(AHT)**은 상호작용, 보류와 상담 후 작업(ACW)을 포함한다. task에는 상담원 pause 시간도 포함된다. 최초 대기열 진입부터 문제 해결까지의 전체 경과 시간과 같은 지표로 쓰지 않는다. [AWS 지표 정의](https://docs.aws.amazon.com/connect/latest/adminguide/metrics-definitions.html)

운영 비교에는 다음 조건을 고정한다.

1. 채널, 문의 유형, 시간대와 집계 기간을 맞춘다.
2. 평균 처리 시간과 함께 해결 여부, 재문의, 대기와 포기를 본다.
3. 자동화가 처리한 문의와 사람에게 인계된 문의를 나누고 전체 결과도 집계한다.
4. 상담 과정의 변화와 고객 구성, 인력 배치의 변화를 분리한다. 전후 차이만으로 도구의 인과 효과를 확정하지 않는다.

상담 도구 통합을 평가할 때도 제거한 앱 수보다 정보 재입력, 검색과 인계에 드는 시간이 얼마나 줄었는지를 먼저 측정한다. 이 비교 기준은 [[Metrics-Framework|지표 설계]]의 분모, 코호트와 보호 지표 원칙을 상담 업무에 적용한 것이다.

## 사용량 과금과 총운영비를 나눈다

Amazon Connect Customer의 가격 페이지는 사용량 기반 과금을 안내하지만, 음성 요금에는 별도 통신 요금이 적용된다. 가격 부록의 Voice 사용량에는 상담원과 통화한 시간뿐 아니라 flow와 대기열 안에서 통화가 활성화된 시간도 포함된다. 따라서 AHT와 청구 대상 시간을 같은 값으로 계산하지 않는다. 실제 견적에는 적용 요금제, 국가별 통신 요금과 선택 기능을 확인한다. [가격 안내](https://aws.amazon.com/products/connect/customer/pricing/), [가격 부록](https://aws.amazon.com/products/connect/customer/pricing/appendix/)

소규모 사업의 비교에는 다음 계산 틀을 사용할 수 있다.

`해결 건당 비용 = 같은 기간에 귀속한 지원 총비용 / 같은 기준으로 해결된 문제 수`

- 도구 비용과 사람의 응대, 자료 확인, 검수, 재작업 시간을 함께 반영한다.
- 초기 연동과 교육 비용은 반복 운영비와 나누고, 비교 기간에 배분하는 기준을 적는다.
- 재문의 접점을 새 해결 건으로 중복 계산하지 않는다. 분모가 0이면 건당 비용을 계산하지 않는다.
- 자동화 전후에 해결 기준과 품질 조건을 유지한다. 사용량 과금이라는 이유만으로 비용이 더 낮다고 가정하지 않는다.

상담 한 건의 비용과 사업 전체의 수익성은 범위가 다르다. 영업과 무료 문의의 배분, 대표 노동의 평가와 중복 계산 방지는 [[Business-Model#서비스와 AI의 실제 제공 비용|서비스의 실제 제공 비용]]을 따른다.

## 출처

- [AWS, Metric definitions in Connect Customer](https://docs.aws.amazon.com/connect/latest/adminguide/metrics-definitions.html)
- [Amazon Connect Customer Pricing — AWS](https://aws.amazon.com/products/connect/customer/pricing/)
- [Amazon Connect Customer Pricing Appendix — AWS](https://aws.amazon.com/products/connect/customer/pricing/appendix/)

## 관련 문서

- [[Metrics-Framework|지표 설계와 비교 조건]]
- [[Business-Model|비즈니스 모델과 실제 제공 비용]]
- [[Amazon-Connect-Conversation-Continuity|상담 대화 복원과 인증 경계]]
