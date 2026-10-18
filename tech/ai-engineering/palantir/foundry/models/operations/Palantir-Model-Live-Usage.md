---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Objective live의 compute와 replica별 자원 합산

이 계산은 Modeling Objective live에 해당하고 direct는 compute module usage 원칙을 따른다. JavaScript Function-backed deployment도 이 계산 범위 밖이다. active objective live는 request가 없어도 자원을 예약하며 stop할 때까지 compute-seconds를 사용한다.

## 계산 구조

vCPU compute = max(vCPU/replica,GiB RAM/replica ÷7.5) × replica 수 × usage rate × active 초다. GPU compute = GPU/replica × replica 수 × GPU usage rate × active 초다. CPU가 낮아도 memory 기준이 높으면 compute가 커진다.

2026-10-16 읽은 문서의 기본 rate는 vCPU0.2,T4 1.2,A100 1.3,L4 2.1,A10G 1.5,V100 3,H100 4.7이다. 이는 계약 청구 금액표가 아니며 실제 enterprise 조건/instance의 Resource Management를 확인한다.

container-backed model은 deployment resource와 각 replica의 model container CPU/GPU/memory resource를 합산한다. source 예제는2replica/20초에서 deployment4 +model32 =36compute-seconds다. image에 할당한 별도 자원을 빠뜨리면 사용량을 과소평가한다.

## 운영 판단

Resource Management의 objective/project attribution과 resource queue Continuous compute에서 live를 찾는다. API traffic만 줄여도 같은 profile/replica가 예약한 자원 비용은 줄지 않는다. 현재 live는 replica autoscaling도 제공하므로 고정 replica일 때의 공식과 실제 active replica 변화를 구분한다.

peak concurrency를 stress-test해 under-resource 실패와 over-resource 낭비를 조정한다. 쓰지 않는 staging을 명시적으로 disable한다. min0 direct의 idle scaling과 objective 지속 실행을 동일하게 가정하지 않는다. 문서의 profile 변경 no downtime 설명은 자기 workload의 검증된 가용성 보장이 아니다.

## 출처

- [Palantir, compute-usage](https://www.palantir.com/docs/foundry/manage-models/compute-usage)

## 관련 문서

- [[Palantir-Direct-Model-Deployment]]
- [[Palantir-Objective-Deployment-Operations]]
