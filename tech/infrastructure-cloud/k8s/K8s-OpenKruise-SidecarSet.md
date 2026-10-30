---
tags: [kubernetes, openkruise, sidecar, deployment]
status: done
verified_at: 2026-10-30
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["OpenKruise SidecarSet", "사이드카의 선언적 관리"]
---

# OpenKruise SidecarSet

SidecarSet은 Pod 생성 시 admission webhook으로 대상 Pod에 사이드카를 주입하고, 메인 컨테이너와 사이드카의 수명주기를 분리해 관리하는 OpenKruise 컨트롤러다. 모니터링 도구처럼 상태 없는 사이드카 관리에 적합하다. 아래는 OpenKruise v1.9 문서 기준이다.

## 주입과 업데이트를 구분한다

- 주입은 Pod 생성 시 일어난다. 이미 실행 중인 모든 Pod에 새 컨테이너가 자동 추가된다고 가정하지 않는다.
- 일반 사이드카의 이미지 in-place 업데이트는 Pod와 다른 컨테이너를 재시작하지 않지만, 바뀐 사이드카 컨테이너는 재시작한다.
- `initContainers`의 `restartPolicy: Always`를 사용하는 Kubernetes native sidecar는 별도 경로다. 이 문서 버전은 자동 주입만 지원하고 해당 경로의 in-place 업데이트는 지원하지 않는다고 명시한다.

## 배포 범위와 속도

| 설정 | 의미 |
|---|---|
| `partition` | 이전 버전에 남길 Pod 수 또는 비율. 업데이트 순서를 뜻하지 않는다 |
| `maxUnavailable` | 업데이트 중 unavailable Pod 수의 한도. 기본값 1 |
| `paused: true` | 추가 업데이트를 멈춘다. 새 Pod의 주입과 이미 완료된 업데이트는 유지한다 |

Pod 100개에서 `partition: 90`이면 업데이트 대상은 10개다. 동시에 몇 개를 진행할지는 `maxUnavailable`과 따로 판단한다.

## 가용성 확인

OpenKruise의 일반 in-place 설명을 그대로 적용하지 않는다. SidecarSet은 업데이트 전에 Pod를 not-ready로 설정하지 않는 차이가 있다. Pod 유지가 사이드카 기능의 연속 제공을 보장하지는 않는다.

운영 적용 제안: 작은 대상 집합에서 이미지 변경을 시험하고, 로그 누락과 프록시 연결 중단, 메인 서비스 오류를 각각 관찰한다. 설치된 CRD와 버전의 지원 범위도 먼저 확인한다. 문서 대조만 수행했으며 실제 클러스터에서 검증한 절차는 아니다.

## 출처

- [OpenKruise, SidecarSet](https://openkruise.io/docs/user-manuals/sidecarset) — v1.9, 주입과 이미지 업데이트, native sidecar 제약, 업데이트 전략
- [OpenKruise, InPlace Update](https://openkruise.io/docs/core-concepts/inplace-update) — SidecarSet의 not-ready 처리 예외

## 관련 문서

- [[k8s|Kubernetes]]
- [[K8s-Core-Workloads-and-Service|Pod와 Deployment]]
- [[K8s-Configuration-Storage-and-Probes|설정과 probe]]
