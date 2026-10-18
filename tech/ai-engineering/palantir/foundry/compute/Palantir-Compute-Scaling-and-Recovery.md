---
tags: [palantir, compute-modules, autoscaling, observability]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compute Modules 확장과 복구"]
---

# Compute Modules 확장과 복구

Horizontal scaling은 replica 수를 바꾼다. Replica의 CPU/memory/GPU 구성은 별도 설정이다. Replica는 언제든 교체될 수 있고 최대 수명은 volumes 안내 기준 22시간이므로 process, local file과 연결을 영구 상태로 취급하지 않는다.

## 동시성과 자동 확장

Replica concurrency는 동시 query 수이며 기본 1이다. SDK는 이를 처리하지만 custom client는 MAX_CONCURRENT_TASKS를 구현에 반영해야 한다. Minimum 0은 idle 시 0으로 줄일 수 있다는 뜻이다. 최초 배포, 새 query와 predicted load에서는 실제 요청이 없어도 다시 시작할 수 있다. Nonzero minimum은 idle에도 가용성과 비용을 유지한다.

Load는 `running jobs / (replicas * concurrency)`로 계산한다. Scale-up은 threshold 이상, scale-down은 threshold 미만 상태가 delay만큼 유지될 때 replica 하나를 더하거나 뺀다. 기본 threshold는 각각 0.75, delay는 up 1분/down 30분이다. Up threshold는 down보다 낮을 수 없고 up delay는 down보다 길 수 없다. 둘 다 0~1 범위다.

Predictive scaling도 configured maximum을 따른다. 현재 schedule override는 하나이며 요일/시간대/timezone과 min/max를 바꾼다. 바깥 시간에는 기본값을 적용한다. Concurrency를 낮추면 같은 workload에서 replica 수가 늘 수 있으므로 latency, resource saturation과 함께 조정한다.

## Probes가 수행하는 조치를 구분한다

Readiness 실패는 traffic을 끊고 회복하면 다시 받는다. Liveness 실패는 container를 restart한다. Exec는 exit 0, HTTP GET은 200~399가 성공이며 timeout도 실패로 본다. 기본 exec readiness의 echo는 dependency나 모델 로딩 완료를 확인하지 않는다.

초기 download를 readiness에서 수행하는 예제는 매 검사 실행과 재시도, 파일 완성 여부를 고려해야 한다. 부분 파일이 존재한다는 이유만으로 ready가 되지 않게 atomic write 또는 별도 완료 상태를 둔다. Foundry 접근에는 해당 권한과 network 설정도 필요하다. HTTP probe port 역시 8945/8946을 제외한 허용 범위여야 한다.

## 장애를 replica 수명과 연결한다

Starting은 host 확보/image pull/startup/readiness 단계이며 큰 image(예: 5GB 초과), resource 요청과 초기화가 지연 원인일 수 있다. Started와 Responsive를 구분하고 Unresponsive replica에는 새 query를 보내지 않는다. 장기 unresponsive는 종료될 수 있다. Starting Error는 로그가 없을 수 있으므로 diagnostics를 확인한다.

Decommissioned는 진행 중 job에 grace period를 주는 종료 단계일 수 있다. Deleted 자체를 오류로 판단하지 않고 종료 사유와 수명을 확인한다. Deleted replica diagnostics는 1시간, replica history details는 7일 보존이라는 서로 다른 관측 창이다. 필요한 증거를 지연 없이 확보한다.

History는 configuration ID, image version 변경, 시작/중지 주체와 run을 연결한다. 이전 saved specification과 diff하거나 replica별 image/start/duration/end/reason 및 logs/metrics를 대조한다. History는 read-only이며 영구 감사 보존을 대신하지 않는다.

## 안전한 업그레이드도 조건부다

가능한 변경은 기존 deployment 옆에 새 deployment를 띄우고 responsive replica가 생긴 뒤 새 job을 전환한다. 기존 job은 old deployment에서 grace period 동안 마무리한다. 새 deployment가 responsive하지 않으면 기존 deployment를 유지하며 설정 rollback 또는 forward fix로 해결한다.

일부 configuration 변경은 downtime 승인이 필요하다. 모든 변경이 무중단이라는 보장은 아니다. Source 추가/제거와 network policy 변경의 full restart 계약도 함께 확인한다.

## 비용은 실행 중 replica 시간에 따른다

Query 성공 수가 아니라 starting/active replica 시간이 compute-seconds를 소비한다. CPU 계열 계산은 `max(vCPU, GiB RAM / 7.5) * replica 수 * CPU rate * 시간`, GPU는 GPU 수와 rate를 곱해 더한다. Replica가 시간에 따라 바뀌면 구간별로 합산한다.

2026-10-16 문서의 기본 rate는 vCPU 0.2, T4 1.2, V100 3, A100 1.3, A10G 1.5, L4 2.1, H100 4.7이다. 이는 통화 가격표가 아니며 enterprise 계약 조건과 실제 usage attribution을 확인한다. 기본 resource 안내는 1 vCPU/4GB/no GPU이며 request와 limit, 실제 소비를 같은 값으로 단정하지 않는다. 여러 container가 있는 replica 전체 구성을 확인한다.

## 출처

- [Palantir, Scaling](https://www.palantir.com/docs/foundry/compute-modules/scaling)
- [Palantir, Probes](https://www.palantir.com/docs/foundry/compute-modules/probes)
- [Palantir, Debugging](https://www.palantir.com/docs/foundry/compute-modules/debugging)
- [Palantir, Compute module history](https://www.palantir.com/docs/foundry/compute-modules/history)
- [Palantir, Usage and pricing](https://www.palantir.com/docs/foundry/compute-modules/usage)
- [Palantir, Volumes](https://www.palantir.com/docs/foundry/compute-modules/volumes)

## 관련 문서

- [[Palantir-Compute-Sources-and-Storage|Network 변경과 임시 volume]]
- [[Palantir-Compute-Containers-and-Distribution|배포 artifact]]
