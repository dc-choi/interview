---
tags: [infrastructure, iac, terraform]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["IaC", "Infrastructure as Code", "테라폼"]
---

# IaC (Infrastructure as Code)

## IaC를 하는 이유
- 콘솔로 인프라를 하나씩 셋업하면 느리다. 코드로 하는 게 더 빠름
- 콘솔로 만들면 의도하지 않은 리소스가 생성되어 추가 비용 발생
- 에러 발생 시 왜 생성되지 않는지 에러 메시지를 명확하게 받을 수 있음

## IaC의 장점
- 구성이 쉽다
- 아키텍처를 보는 눈이 높아진다
- 네트워크/보안/트래픽을 보는 눈이 생긴다
- 서버 비용을 줄일 수도 있다

## 명령형 (Imperative) — CDK
- 클라우드에서 직접 제공하는 CDK, Pulumi 등
- 애플리케이션에 의해 생명주기가 관리되어도 괜찮을 때 사용
- 클라우드 서비스, 미디어 프로세싱 시 일시적으로 띄울 때 사용
- 웬만하면 사용하지 않는 게 좋고, 굳이 쓸 거면 Pulumi를 추천

## 명세형 (Declarative) — Terraform
- 스펙을 명시해놓은 것들의 모음
- 한 회사의 리소스를 관리하는 경우에 적합
- 현 시점에서는 Terraform을 사용하는 것이 더 좋음

## Terraform 핵심 개념
- **상태(State)**: 인프라의 현재 상태를 추적하는 개념이 존재
- **멱등성(Idempotency)**: 같은 코드를 여러 번 실행해도 동일한 결과를 보장
- **프로바이더(Provider)**: AWS, GCP 등 클라우드 벤더별 플러그인 시스템
- **락킹(Locking)**: 동시에 여러 사람이 상태를 변경하지 못하도록 잠금
- **변경사항 계산(Plan)**: 적용 전 변경 사항을 미리 계산하여 확인 가능

## 참고 자료
- [AWSome IaC 발표 자료](https://github.com/drakejin/20250628-tbm)

## 관련 문서
- [[Monolith-vs-Microservice|아임웹 MSA — 테라폼 모듈로 인프라 자동화]]
