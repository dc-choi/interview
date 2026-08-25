---
tags: [performance, scalability, capacity-planning, load-test, spike, case-study]
status: index
category: "성능&확장성(Performance&Scalability)"
aliases: ["Capacity and Load Testing", "캐퍼시티와 부하 검증"]
---

# 캐퍼시티와 부하 검증

필요한 가용량을 산정하고 실제로 버티는지 재는 문서를 모은다. 시점이 정해진 스파이크의 사전 확보, 예측 불가 폭증의 계층별 차등 할당, 그리고 두 판단의 근거가 되는 부하 테스트 도구를 다룬다.

- [[Capacity-Planning|캐퍼시티 플래닝]]: 스파이크 대비 사이클, 램프업 vs 스텝 BMT, Redis 가용량 확보 3옵션
- [[Traffic-Spike-Query-Types|예측 불가 트래픽 폭증]]: Repetitive vs Unique Query, 계층별 차등 캐퍼시티
- [[Load-Test-K6|성능 테스트 도구]]: k6, JMeter, Keploy 비교와 역할 분담, 실행 설정, 전용 환경

## 함께 볼 문서

- [[성능&확장성(Performance&Scalability)|성능&확장성]]
