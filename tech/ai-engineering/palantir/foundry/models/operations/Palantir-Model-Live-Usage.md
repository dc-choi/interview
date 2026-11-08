---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
---

# Objective live의 compute와 replica별 자원 합산

이 계산은 Modeling Objective live에 해당하고 direct는 compute module usage 원칙을 따른다. JavaScript Function-backed deployment도 이 계산 범위 밖이다. active objective live는 request가 없어도 자원을 예약하며 stop할 때까지 compute-seconds를 사용한다.

## 계산 구조

vCPU compute = max(vCPU/replica,GiB RAM/replica ÷7.5) × replica 수 × usage rate × active 초다. GPU compute = GPU/replica × replica 수 × GPU usage rate × active 초다. CPU가 낮아도 memory 기준이 높으면 compute가 커진다. Live deployment의 vCPU는 millicore(1/1000 vCPU) 단위로 잡고, 한 deployment의 replica는 모두 같은 vCPU와 memory를 받는다.

2026-11-08 대조한 기본 rate는 vCPU 0.2, T4 1.2, A100 1.3, L4 2.1, A10G 1.5, V100 3, H100 4.7, H200 4.7, B200 5.7, B300 7.1, RTX PRO 6000 3.5다. 이는 계약 청구 금액표가 아니다. Enterprise 계약은 배율 자체가 기본값과 다를 수 있으므로 계산 전에 Palantir 담당자에게 계약 배율을 확인하고, 실제 사용량은 Resource Management의 objective/project attribution과 대조한다.

container-backed model은 deployment resource와 각 replica의 model container CPU/GPU/memory resource를 합산한다. source 예제는2replica/20초에서 deployment4 +model32 =36compute-seconds다. image에 할당한 별도 자원을 빠뜨리면 사용량을 과소평가한다.

## 운영 판단

Resource Management의 objective/project attribution과 resource queue Continuous compute에서 live를 찾는다. 한 objective에 live deployment 여러 개가 동시에 active일 수 있으므로 objective에 귀속된 사용량을 볼 때 Modeling Objective의 Deployments 섹션에서 떠 있는 live를 함께 확인한다. Live는 UI나 API로 shut down할 때까지 active이고, 연결된 Modeling Objective를 platform trash로 보내도 shut down된다. compute-usage 문서는 profile을 바꾸지 않으면 API load가 늘거나 줄어도 compute usage가 변하지 않는다고 하고, request volume에 따른 auto-scaling은 direct deployment에 대해서만 설명한다. 반면 set-up-live 문서는 live deployment가 최소와 최대 replica 범위로 request volume에 따라 자동 horizontal scaling한다고 설명한다. 두 Palantir 문서가 어긋나므로 replica 수가 고정된 구간에만 위 공식을 쓰고, replica가 바뀐 구간을 나눠 합산하는 계산은 추정으로 두어 Resource Management의 실제 attribution으로 확인한다.

peak concurrency를 stress-test해 under-resource 실패와 over-resource 낭비를 조정한다. 쓰지 않는 staging을 명시적으로 disable한다. min0 direct의 idle scaling과 objective 지속 실행을 동일하게 가정하지 않는다. 문서의 profile 변경 no downtime 설명은 자기 workload의 검증된 가용성 보장이 아니다.

## 출처

- [Palantir, compute-usage](https://www.palantir.com/docs/foundry/manage-models/compute-usage)
- [Palantir, set-up-live](https://www.palantir.com/docs/foundry/manage-models/set-up-live)

## 관련 문서

- [[Palantir-Direct-Model-Deployment]]
- [[Palantir-Objective-Deployment-Operations]]
