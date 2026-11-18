---
tags: [testing, chaos-engineering, kubernetes, reliability]
status: done
verified_at: 2026-11-18
category: "테스트&품질(Testing&Quality)"
aliases: ["Chaos Mesh", "Chaos Mesh 장애 테스트"]
---

# Chaos Mesh로 Kubernetes 장애 테스트 자동화하기

Chaos Mesh는 Kubernetes 위에서 장애를 리소스로 선언해 주입하는 카오스 엔지니어링 도구다. 가설, 폭발 반경과 도입 단계 같은 일반 원칙은 [[Chaos-Testing|카오스 테스팅]]에 있고, 이 문서는 Chaos Mesh로 장애 테스트를 매일 자동 실행할 때의 구조, 시나리오 설계와 함정을 다룬다. 사례 부분은 NAVER Engineering Day의 클라우드 DB 서버리스 팀 발표 기준이다. 구성 요소, Helm 기본값, selector 규칙, Workflow 템플릿과 `abortWithStatusCheck` 기본값은 Chaos Mesh 2.8.8 문서와 v2.8.8 태그 소스로 대조했고, 발표 기준이라고 적은 동작은 공식 문서로 확인하지 못한 관찰이다.

## 테스트 코드로 장애를 만들 때의 한계

발표 팀은 Kubernetes에서 자동 확장되는 관리형 DB를 만들었고, 기존 자동화 테스트에도 일부 장애 테스트가 있었다. 다음 장애를 테스트 코드로 직접 만들기가 어려웠다.

- 프라이머리와 관리 파드를 같은 순간에 종료하려면 여러 파드의 종료 시점을 맞추는 제어 스크립트가 복잡해진다.
- 파드는 살아 있고 네트워크만 끊긴 상태를 만들려면 대상 파드가 뜬 노드의 네트워크 설정을 직접 바꿔야 한다.
- 여러 장애를 병렬로 넣고 기다리는 시간을 코드로 정교하게 맞추기 어려워 시점 오류로 테스트가 자주 불안정했다.

Chaos Mesh는 장애를 YAML로 선언하고 여러 장애의 순서와 시점을 Workflow로 고정해 이 문제를 줄인다.

## 동작 구조

Chaos Mesh는 Chaos Dashboard, Chaos Controller Manager와 Chaos Daemon으로 구성된다. 장애 종류는 CRD로 등록되므로 장애 실험도 `kubectl apply`, `get`, `delete`로 다루는 일반 리소스다. Controller Manager가 리소스 변경을 받아 대상을 고르고 장애를 적용하고 되돌린다.

| 경로 | 처리 주체 | 예 |
|---|---|---|
| Kubernetes API로 충분한 장애 | Controller Manager | 파드 종료 |
| 노드와 커널을 건드리는 장애 | 노드마다 DaemonSet으로 뜨는 Chaos Daemon | 네트워크 지연, 차단, CPU 부하 |

Chaos Daemon은 기본으로 privileged 권한을 갖고, Controller Manager는 gRPC로 Daemon을 제어한다. 발표는 이 구조 덕분에 대상 앱의 코드나 설정을 바꾸거나 사이드카를 붙이지 않고 실행 중인 파드에 네트워크 지연 같은 장애를 넣는다고 설명했다. 모든 장애가 이미지에 손대지 않는 것은 아니다. PodChaos의 pod-failure는 대상 파드 컨테이너의 이미지를 pause 이미지로 바꾼다. 발표 기준으로 Daemon이 뜨지 않은 노드의 파드에는 커널 수준 장애를 넣을 수 없었다. NetworkChaos 문서는 Controller Manager와 Daemon의 연결이 끊기면 주입한 네트워크 장애를 복구하지 못한다고 경고한다. 발표는 실험 리소스에 finalizer를 붙여 복구가 끝나야 삭제가 완료된다고 설명했다.

### 대상 선택

- `selector`에는 `namespaces`, `labelSelectors`, `pods` 등을 쓴다. 여러 selector를 함께 지정하면 대상은 모든 조건을 동시에 만족해야 한다. `pods`로 이름을 지정하면 다른 selector는 무시된다.
- `mode`는 `one`, `all`, `fixed`, `fixed-percent`, `random-max-percent` 중 하나로 후보 중 몇 개에 넣을지 정한다.
- 컨테이너를 고르는 장애(StressChaos처럼 `ContainerSelector`를 쓰는 종류)에서 `containerNames`를 지정하지 않으면 첫 번째 컨테이너에 주입된다(저장소 `selector.go` 주석 기준). 첫 컨테이너가 로그 수집 같은 사이드카면 앱 컨테이너는 장애를 받지 않는다. NetworkChaos에는 이 필드가 없다. 한 파드의 컨테이너는 네트워크 namespace를 공유하기 때문이다.

### Workflow

Workflow 템플릿 종류는 `Serial`, `Parallel`, `Suspend`, `Task`, `Schedule`, `StatusCheck`와 각 장애 종류(NetworkChaos, PodChaos, StressChaos 등)다. 발표의 예는 사전 상태를 확인한 뒤 `Parallel` 안에서 한쪽은 관리 파드에서 Kubernetes API 서버로 가는 경로를 늦추고, 다른 쪽은 `Suspend`로 잠깐 기다렸다가 DB 프라이머리를 종료한다. 승격 순간에 통신이 늦어지는 상황을 매번 같은 시점에 만든다.

`StatusCheck`가 실패해도 `abortWithStatusCheck`의 기본값이 `false`라 Workflow는 멈추지 않는다. Workflow가 끝났다는 사실은 장애 순서가 제한 시간 안에 진행됐다는 뜻일 뿐 시스템이 정상 동작했다는 뜻이 아니다.

## 시나리오 유형

발표 팀은 운영 환경이 아니라 매일 밤 테스트용 Kubernetes 클러스터에 DB 클러스터를 만들어 9개 시나리오를 돌렸다. 구조는 존 A에 프라이머리와 레플리카, 존 B에 레플리카, 그 위에 DB 오퍼레이터와 페일오버 컨트롤러가 리더 1개와 대기 1개로 뜨는 형태다.

| 제어 대상 | 시나리오 | 기대 결과 |
|---|---|---|
| 파드 종료 시점 | 쓰기 중 프라이머리 종료, 점검(자동 페일오버 중지) 중 종료, 프라이머리와 오퍼레이터 동시 종료, 프라이머리와 페일오버 컨트롤러 리더 동시 종료 | 새 프라이머리 1개와 쓴 데이터 조회. 점검 중에는 페일오버가 없어야 한다 |
| 네트워크 | 프라이머리 격리, 복제 경로에 지연을 건 채 격리 | 새 프라이머리는 1개, 레플리카는 새 프라이머리를 복제, 격리가 풀린 옛 프라이머리에 쓸 수 없음(split brain 없음) |
| 사건 겹침 | 리소스 상한을 낮추는 운영 작업 중 CPU 부하와 프라이머리 종료, API 서버 통신 지연 중 프라이머리 종료 | 페일오버 완료와 운영 작업 반영 |
| 존 장애 근사 | 존 A의 DB와 관리 파드를 네트워크로 격리하고 30초마다 4번 재종료 | 존 B 레플리카 승격, 관리 파드 리더 이전, 옛 프라이머리를 복제하는 레플리카 없음 |

### 실제로 찾은 버그

페일오버 컨트롤러 리더에서 API 서버로 가는 경로에만 수 초 단위 지연을 90초 동안 걸고 그사이 프라이머리를 종료했다. 컨트롤러는 승격 직전에 자신이 아직 리더인지 lease를 다시 읽는데, 이 확인이 지연으로 실패하자 재시도 없이 페일오버를 끝냈다. 게다가 짧은 간격의 반복 페일오버를 막는 anti-flap 장치(설정값 10분)가 실패한 시도 뒤에도 다음 페일오버를 막아, 프라이머리 없이 쓰기가 불가능한 상태로 남았다. 일시적 실패는 120초 안에서 다시 확인하고 리더를 확실히 잃었을 때만 중단하도록 고친 뒤, 같은 시나리오를 매일 밤 회귀 테스트로 남겼다. 두 장애가 같은 순간에 겹쳐야만 드러나는 버그라 테스트 코드만으로는 재현하기 어려웠다.

## 시나리오를 설계할 때 확인할 것

- **감지 조건:** 페일오버 조건이 프라이머리 연결 불가와 복제 중단의 동시 충족이라 한쪽 통신만 끊으면 아무 일도 일어나지 않았다. 레플리카 쪽과 컨트롤러 쪽을 함께 끊었다.
- **지속 시간:** 복제 중단 판정에 약 1분이 걸려 그보다 짧은 격리는 페일오버 전에 풀렸다. 장애는 감지 시간보다 길게 유지한다.
- **동적 대상:** 리더 여부가 라벨이 아니라 lease에만 있어, 테스트 코드가 lease에서 리더 파드 이름을 읽어 selector에 넣었다.
- **재생성 파드:** 발표 기준으로 격리 규칙은 주입 시점에 고른 파드에만 들어가 다시 뜬 파드는 격리 밖에 있었다. 존 장애는 한 번 종료로 모사되지 않아 반복 종료로 바꿨다.
- **경로 범위:** 지연은 페일오버 컨트롤러에서 나가는 경로에만 걸었다. 관리 파드가 모인 네임스페이스 전체에 걸면 다른 파드도 영향을 받는다.
- **공유 구성 요소:** 관리 파드는 모든 DB가 함께 쓰므로 존 장애 시나리오는 다른 시나리오와 병렬로 돌리지 않고 단독 실행했다.

## 통과로 보이는데 장애가 안 들어간 경우

발표에서 가장 강조한 함정은 주입 실패가 Workflow 성공으로 가려지는 것이다. 발표 팀 환경에서는 주입이 실패해도 Workflow가 정상 완료로 끝났고, 오류는 실험 리소스의 Kubernetes 이벤트에만 남아 `kubectl describe`나 `kubectl get events`로 찾아야 했다.

| 원인 | 결과 |
|---|---|
| 컨테이너를 고르는 장애에서 `containerNames` 생략 | 첫 컨테이너(사이드카일 수 있음)에만 주입 |
| Helm 값 `chaosDaemon.runtime` 기본값 `docker`, `socketPath` 기본값 `/var/run/docker.sock` | containerd 노드에서 Daemon이 컨테이너를 찾지 못함. containerd는 `--set chaosDaemon.runtime=containerd --set chaosDaemon.socketPath=/run/containerd/containerd.sock`로 설치한다 |
| taint 때문에 Daemon이 뜨지 않은 노드, privileged 파드를 막는 보안 정책 | 커널 수준 장애가 들어가지 않음. 발표 팀은 Kyverno에 Chaos Mesh 파드 예외를 등록했다 |
| selector 오타 | 대상이 빈 채 진행됨. 발표 팀은 이벤트에서야 흔적을 찾았다 |
| 한 selector에 여러 네임스페이스와 라벨을 함께 지정 | 라벨 조건이 모든 네임스페이스에 똑같이 적용된다. DB 네임스페이스는 전체, 관리 네임스페이스는 컨트롤러만 고르려다 레플리카 쪽 차단이 조용히 빠졌고, 실험 두 개로 나눠 해결했다 |

그래서 결과 판정에는 장애가 실제로 주입됐는지와 프라이머리 변경 같은 의도한 이벤트가 일어났는지를 먼저 확인하고, 일어나지 않았으면 실패로 처리하는 단계를 넣는다. 공식 문서 기준으로 실험 리소스의 status에는 Selected, AllInjected 같은 condition이 기록되므로 이벤트를 사람이 찾기 전에 검증 코드가 이 값을 읽게 할 수 있다(설계 제안, 대상이 비었을 때의 값은 시험하지 않았다). 감지 시간보다 짧은 장애나 재생성 파드가 대상에서 빠진 경우도 이 확인에서 드러난다.

## 테스트 구성과 자동화

- **실행과 판정의 분리:** Workflow는 장애 순서와 제한 시간만 맡고, 정상 동작 판정은 별도 검증 코드(발표 팀은 pytest)가 프라이머리 수, 복제 상태, 데이터 조회를 확인한다. 둘 다 통과해야 성공이며 하나라도 실패하면 진단 로그와 상태 덤프를 남긴다.
- **실행 주기:** 장애 테스트는 재시도 없이 한 번 도는 데도 1시간을 넘겨 매일 밤 빌드가 통과한 뒤 돌리고, PR에서는 단위 테스트와 가벼운 회귀 테스트만 돌린다. 소요 시간은 시나리오별 실행 시간과 안정화 시간의 합에 시나리오 수를 곱한 값으로 정해진다.
- **그룹 스케줄링:** Daemon이 필요 없는 4개, 필요한 4개, 존 장애 1개로 나눠 그룹마다 15분에서 55분이 걸렸다.
- **정리 책임:** 테스트가 어떻게 끝나든 대상 DB 클러스터를 삭제하고, 주입한 실험도 직접 지워 다음 테스트에 남지 않게 한다. 발표 팀은 장애가 지정 시간 만료로 끝난 것은 정상으로 보고, 중단된 경우는 실패로 본다(전사문의 해당 단어가 불분명해 Workflow의 Aborted 상태를 가리킨 것으로 추정한다).
- **결과 처리:** 실패 로그와 덤프를 빌드 artifact로 보관하고 이슈 트래커에 자동 등록해 다음 날 바로 본다.

발표의 결론은 주입은 YAML 몇 줄이고 노력 대부분이 결과 검증 코드와 테스트 안정화에 들었다는 것이다. 첫 실험은 스테이징 클러스터에서 대상 네임스페이스를 하나로 제한하고 파드 하나를 종료한 뒤 요청 실패율과 복구 시간을 확인하는 수준으로 작게 시작하길 권했다. 리더, 스케줄러, 컨슈머, 배치 작업처럼 혼자 일을 맡은 파드가 작업 중일 때 장애를 넣는 시나리오가 우선 후보다.

## 출처

- [Chaos Mesh로 Kubernetes 앱의 장애 내구성 검증하기 — NAVER D2](https://www.youtube.com/watch?v=m77OiOWld94)
- [Chaos Mesh 문서, Chaos Mesh Overview](https://chaos-mesh.org/docs/)
- [Chaos Mesh 문서, Install Chaos Mesh using Helm](https://chaos-mesh.org/docs/production-installation-using-helm/)
- [Chaos Mesh 문서, Define the Scope of Chaos Experiments](https://chaos-mesh.org/docs/define-chaos-experiment-scope/)
- [Chaos Mesh 문서, Create Chaos Mesh Workflow](https://chaos-mesh.org/docs/create-chaos-mesh-workflow/)
- [Chaos Mesh 문서, Status Check in Workflow](https://chaos-mesh.org/docs/status-check-in-workflow/)
- [Chaos Mesh 문서, Simulate Network Faults](https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/)
- [Chaos Mesh 문서, Simulate Pod Faults](https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/)
- [Chaos Mesh 문서, Inspect Chaos Experiments](https://chaos-mesh.org/docs/inspect-chaos-experiments/)
- [chaos-mesh/chaos-mesh v2.8.8 Helm values.yaml — GitHub](https://github.com/chaos-mesh/chaos-mesh/blob/v2.8.8/helm/chaos-mesh/values.yaml)
- [chaos-mesh/chaos-mesh v2.8.8 api/v1alpha1/selector.go — GitHub](https://github.com/chaos-mesh/chaos-mesh/blob/v2.8.8/api/v1alpha1/selector.go)

## 관련 문서

- [[Chaos-Testing|카오스 테스팅 (가설, 폭발 반경, 도입 단계)]]
- [[Test-Strategy-Layers|테스트 전략과 계층]]
- [[Deterministic-Test|결정적 테스트와 flaky 대응]]
- [[Regression-Test-Automation|회귀 테스트 자동화]]
