---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo 상태 probe와 운영 메타데이터

## 재시작, 트래픽 수신과 운영 건강은 다르다

일반 Kubernetes 연동은 관리 엔티티의 liveness와 readiness를 수집해 Hub에 표시한다. Beta product spec은 HTTPS GET의 /status/liveness와 /status/readiness를 별도로 규정한다. 200~399는 성공, 200 미만 또는 400 이상은 실패이며 readiness의 전송 오류도 트래픽 수신 불가다. body는 비워야 하고 인증 없이 접근 가능해야 한다. 5초 주기 호출에 부담이 없어야 하므로 비싼 검사는 캐시한다.

liveness 실패는 재시작 필요를, readiness 실패는 트래픽 수신 불가를 나타낸다. readiness는 해당 복제본의 지역적 상태로 판단하며 의존 서비스의 readiness/liveness를 그대로 연쇄시키지 않는다. 오류 응답을 낼 수 있어도 요청을 처리하고 진단 정보를 제공할 준비가 되었다면 readiness를 true로 둘 수 있다. `allow-traffic-when-not-ready`는 준비 전 라우팅을 허용하는 별도 Beta 선택이다.

## custom health

Health는 Beta이며 일반 제공 기능이 아니다. expected-state-k8s와 Pod template의 `apollo.palantir.com/health.probe` annotation으로 container 이름, context path, port를 연결한다. 실제 endpoint는 context 아래 /status/health이며 HTTPS를 받아야 한다. 클러스터 network policy는 수집 서비스에서 해당 Pod까지의 ingress와 egress를 허용해야 한다.

복제본 health는 HEALTHY < REPAIRING < WARNING < ERROR 순으로 심각해지며 여러 check 중 가장 심각한 상태로 집계한다. REPAIRING은 회복 중이라 재시작이 복구를 깨뜨릴 수 있는 상태다. WARNING은 조치 없을 때 ERROR로 악화할 상태를 표현한다.

- 모든 health 상태는 HTTP 200과 JSON checks로 반환한다. 5xx는 검사 내부 오류이고 ERROR에 해당한다.
- check의 type은 비어 있지 않은 대문자 ASCII/underscore 이름, state는 지정한 네 상태 중 하나다.
- message와 params는 환경 밖으로 전송해도 안전하도록 민감 값을 가린다.
- 전체 JSON은 10,000바이트보다 작아야 한다. 초과하면 message/params가 제거될 수 있고 HEALTH_CHECK_MAX_LEN의 WARNING이 추가된다.
- v2.0 health JSON은 버전을 나타내는 별도 필드가 없다.

## Kubernetes 식별 메타데이터

관리 agent는 status.liveness_and_readiness label과 environment ID, entity ID, product group/name/version annotation을 추가한다. AEID는 `aeid:<environment>:<entity-type>:<entity-name>`이고 255자 미만이다. 이 메타데이터는 관측과 대상 매핑을 위한 것이며 응용의 건강 상태 자체를 증명하지 않는다. Pod Running, probe 성공, Plan 성공과 custom health의 의미를 각각 확인한다.

## 출처

- [Palantir, Labels and annotations](https://www.palantir.com/docs/apollo/apollo-product-specification/annotations) — 자동 label과 환경/제품 annotation, AEID 255자 미만.
- [Palantir, Health Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/health) — TLS custom health, 최악 상태 집계와 JSON 10KB 제한.
- [Palantir, Liveness and Readiness Beta](https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_liveness-and-readiness) — Beta liveness/readiness HTTP 계약과 local readiness.
- [Palantir, Liveness and Readiness](https://www.palantir.com/docs/apollo/core/liveness-and-readiness) — Kubernetes probe 결과의 자동 수집.

## 관련 문서

- [[Apollo-Beta-Runtime-Specification]]
- [[Apollo-Orchestration-and-Constraints]]
