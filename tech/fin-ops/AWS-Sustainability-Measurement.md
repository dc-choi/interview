---
tags: [aws, sustainability, carbon, water, finops]
status: done
verified_at: 2026-10-23
category: "비용&운영(FinOps)"
aliases: ["AWS 환경 영향 측정", "AWS Sustainability Measurement"]
---

# AWS 환경 영향 측정

AWS Sustainability는 AWS 사용에 배분된 탄소 배출과 취수량의 추정치를 제공한다. 청구액, 서버의 실시간 전력계 값, 기업 전체의 환경 영향과 구분한다. 아래 기능과 제공 주기는 2026-10-23 공식 문서 대조 기준이다.

## 탄소와 물의 단위, 주기를 나눈다

| 항목 | 의미와 단위 | 제공 주기 |
|---|---|---|
| 탄소 배출 | 여러 온실가스를 CO2 환산 톤으로 나타낸 MTCO2e | 사용 월의 다음 달 21일까지 월별 게시, 2022년 1월부터 제공 |
| 취수량 | 데이터센터 운영을 위해 여러 수원에서 가져온 물의 부피, m³ | 연간 단위로 전년도 값을 게시, 2023년부터 제공 |

취수량은 물이 나중에 환경으로 반환되는지와 관계없이 가져온 총량이다. AWS 데이터센터의 취수량을 고객의 클라우드 서비스 사용 비중에 따라 배분하므로, 해당 수치를 고객 장비가 직접 계측한 값이나 반환되지 않은 물의 양으로 읽지 않는다. 탄소와 물의 갱신 주기가 다르므로 두 그래프의 최신 기간이 같다고 가정하지 않는다.

## 비교 전에 범위와 계산 방법을 고정한다

리전별 전력 구성과 사용량이 배출 추정에 영향을 준다. Savings Plans 선결제 같은 일회성 청구 증가는 그 금액만큼의 배출 증가를 뜻하지 않는다. 비용 절감률을 탄소 감축률로 바꿔 쓰지 않는다.

AWS 운영 인프라의 영향과 외부 공급자의 활동도 나눈다. Marketplace에서 구매한 소프트웨어를 공급자가 자체 인프라에서 개발하고 유지한 배출량은 포함하지 않는다. AWS 인프라에서 실행되지만 Marketplace 구독으로 청구되는 서비스의 범위는 확장 중이라고 명시되어 있으므로, 구매 경로만으로 포함 여부를 단정하지 않는다.

계산 방법이 개정되면 과거 값도 다시 계산된다. 개선 전후를 비교할 때 사용 기간, 계정 범위와 계산 방법 버전을 함께 보존한다(운영 제안). 과거에 내려받은 값과 새 방식으로 다시 계산된 값을 섞으면 방법 변경을 운영 개선으로 오인할 수 있다.

## 조회와 보관

- 콘솔에서 탄소, 물과 CSV 보고서를 확인한다. 세밀한 기간과 계정별 분석에는 API를 검토한다.
- 탄소 데이터는 Data Exports로 S3에 보관할 수 있다. 방법 버전이 바뀌면 새 접두사를 사용하고 이전 버전도 남는다.
- 현재 취수량 데이터는 Data Exports에서 제공하지 않는다. API나 CSV 등 다른 접근 방법과 동일하게 지원한다고 가정하지 않는다.

보고용 추출물에는 추출일, 사용 기간, 단위, 계산 방법 버전과 집계 범위를 함께 남긴다(운영 제안). 이 문서는 실제 계정의 API 호출이나 보고서 다운로드를 검증한 기록은 아니다.

## 적용 점검

1. 비용과 환경 영향을 같은 기간, 같은 범위에서 비교하는가?
2. 총량 감소가 사용량 감소인지, 처리 효율 개선인지 구분할 분모가 있는가?
3. 방법 개정으로 다시 계산된 과거 값과 이전 추출물을 구분했는가?
4. 취수량을 물 소비량으로, 보고서 수집 완료를 감축 성과로 표현하지 않았는가?

이 점검은 운영 제안이다. 처리량당 지표를 만들 때는 [[Cloud-Unit-Cost|클라우드 단위 비용]]처럼 분모의 정의와 품질 조건을 먼저 고정한다.

## 출처

- [AWS Sustainability, Getting started with AWS Sustainability](https://docs.aws.amazon.com/sustainability/latest/userguide/getting-started.html)
- [AWS Sustainability, Key concepts](https://docs.aws.amazon.com/sustainability/latest/userguide/key-concepts.html)
- [AWS Sustainability, Calculation methodology](https://docs.aws.amazon.com/sustainability/latest/userguide/methodology.html)
- [AWS Sustainability, Carbon emissions](https://docs.aws.amazon.com/sustainability/latest/userguide/methodology-carbon.html)
- [AWS Sustainability, Water withdrawals](https://docs.aws.amazon.com/sustainability/latest/userguide/methodology-water.html)

## 관련 문서

- [[Cloud-Unit-Cost|클라우드 단위 비용]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
