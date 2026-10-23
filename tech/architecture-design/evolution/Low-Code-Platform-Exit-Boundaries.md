---
tags: [architecture, low-code, migration, portability]
status: done
verified_at: 2026-10-24
category: "Architecture - 진화"
aliases: ["Low Code Platform Exit Boundaries", "로우코드 플랫폼 이탈 조건"]
---

# 로우코드 플랫폼의 코드 반출과 운영 이관

코드를 받는 것과 독립 운영은 다르다. 데이터, 실행 환경과 운영 도구도 이관 대상이다.

## O11 detach의 범위

2026-10-24 OutSystems 11 공식 절차 대조 기준이다.

- .NET 앱의 독립 운영 경로이며, 플랫폼 사용을 중단할 때 전체 앱에 적용한다. 일부만 분리하고 나머지를 플랫폼에 남길 수 없다.
- Platform Server 11.18.1 이상이 필요하다. 이전 버전은 분리 전에 업그레이드해야 한다.
- Cloud에서는 자체 관리 환경으로 앱과 데이터를 옮긴 뒤 분리한다. 서버 준비와 데이터 복사는 고객 책임이다.
- 분리 후 Service Studio, Service Center와 LifeTime 등의 개발, 배포, 모니터링 도구는 사용할 수 없다.
- 수정한 코드를 플랫폼으로 역변환할 수 없고, 분리된 소스의 변경은 지원 대상이 아니다.
- Timers, BPT Activities와 이메일을 유지하도록 Scheduler Service 소스를 제공한다. 스케줄러 의존성이 자동 제거되지는 않는다.

## 판단과 한계

**검토 제안:** 제품과 계약, 이전 범위, 데이터 및 외부 연동, 운영 도구의 대체 수단을 확인한다. 플랫폼 서비스 없이 실행하는 검증을 완료 증거로 삼는다.

코드 제공은 이탈 비용이 없다는 보장이 아니다. 위 조건은 O11에 한정한다. ODC의 지원 범위는 별도 확인이 필요하며, 여기서는 이전을 실행하지 않았다.

## 출처

- [OutSystems Support, The detach process for OutSystems 11](https://success.outsystems.com/support/licensing/the_detach_process_for_outsystems_11/)

## 관련 문서

- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Fullstack-BaaS-Boundaries|풀스택 프레임워크와 BaaS 경계]]
