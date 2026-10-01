---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Multi-Tenant 경계"]
---

# Next.js Multi-Tenant 경계

## 독립 앱 분할과 tenant 격리

Multi-Tenant는 하나의 앱이 여러 고객/조직을 서비스하는 데이터와 권한의 분리 문제다. Multi-Zone처럼 경로별 독립 앱 배포를 뜻하지 않는다. 공식 multi-tenant 페이지는 starter 예제로 연결하는 짧은 안내이며 그 자체가 tenant 격리, 과금과 보안의 상세 계약을 제공하지 않는다.

실제 설계에서는 검증된 tenant 식별자, 데이터 조회 조건과 캐시 키의 tenant 구분을 확인한다. 이는 보안 경계를 적용한 설계 체크포인트이며 링크된 starter 전체의 구현을 검증했다는 뜻은 아니다.

## 출처

- [Next.js, multi-tenant](https://nextjs.org/docs/app/guides/multi-tenant)

## 관련 문서

- [[NextJS-Multi-Zones]]
- [[NextJS-Data-Security]]
