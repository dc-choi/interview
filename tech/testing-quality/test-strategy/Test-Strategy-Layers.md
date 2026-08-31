---
tags: [testing, pyramid, contract-test, service-layer]
status: index
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Strategy Layers", "테스트 전략과 계층"]
---

# 테스트 전략과 계층

테스트 피라미드의 계층별 범위와 비중, 레이어 설계가 정하는 테스트 경계, 계층이 모두 초록불이어도 남는 사각지대를 다룬다.

- [[Test-Pyramid|테스트 피라미드]]: Unit, Integration, Contract, E2E 계층별 범위와 비중, 아이스크림 콘 안티패턴
- [[Test-Pyramid-Blind-Spots|초록불이 못 잡는 것]]: 배포와 인프라 경계, 스모크 실행, 계약 부재의 죽은 코드
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]: 도메인 모델과 트랜잭션 스크립트 비교, 레이어별 단위와 통합 테스트 배치
- [[Deterministic-Test|결정적 테스트와 flaky 대응]]: 시간, 난수, 외부 상태와 순서 의존성 제어
- [[Load-Test-Automation|부하 테스트 자동화]]: 기준선, 단계적 부하와 CI 판정
- [[Chaos-Testing|카오스 테스팅]]: 장애 가설, 격리된 실험과 복구 검증

## 함께 볼 문서

- [[테스트&품질(Testing&Quality)|테스트&품질]]
