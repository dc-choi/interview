---
tags: [infrastructure, kubernetes, service-mesh, istio, network]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio Ambient Mode", "Ambient Mesh", "Service Mesh", "서비스 메시"]
verified_at: 2026-07-18
---

# Istio Ambient Mode

## Service Mesh가 해결하는 문제

마이크로서비스가 늘어나면 mTLS 암호화, 서비스 간 호출 관측(L7 메트릭, 호출 관계), 트래픽 제어(카나리, 재시도, 서킷 브레이커), rate-limit 같은 공통 관심사가 각 애플리케이션과 Ingress, APM에 분산 구현된다. Service mesh는 이 공통 관심사를 애플리케이션 코드 밖 **인프라 계층(프록시)**으로 내려서 일괄 적용한다.

- 도입 판단 기준: 서로 다른 역할의 서비스 수와 Pod 규모가 계속 늘어나고, 트래픽 제어와 가시성 요구가 애플리케이션 레벨 구현으로 감당이 안 될 때. 규모가 작으면 프록시 오버헤드와 운영 복잡도가 이득을 넘어선다.

## Sidecar Mode vs Ambient Mode

Istio의 데이터플레인 배포 방식은 두 가지다. Ambient mode는 Istio 1.24(2024-11-07 릴리스)에서 GA에 도달했다.

| 항목 | Sidecar Mode | Ambient Mode |
| --- | --- | --- |
| 프록시 배치 | Pod마다 Envoy 1개 주입 | Node당 ztunnel 1개(DaemonSet) + 선택적 waypoint |
| L4 / L7 처리 | sidecar가 모두 담당 | ztunnel(L4) + waypoint(L7) 분리 |
| 프록시 수 (Pod 4,000개, 노드 N) | 4,000개 | ztunnel N개 + 필요한 waypoint만 |
| 설정 전파 대상 | Pod 수에 비례 (polynomial scaling) | 노드 수에 비례해 완만 |
| Pod 재시작 필요 | 주입, 제거 시 필요 | 불필요 (Pod 스펙 변경 없음) |
| 성숙도 | 오래 검증됨 | GA 직후, 프로덕션 사례 상대적으로 적음 |

핵심 차이는 **L4와 L7의 분리**다. sidecar는 mTLS만 필요한 Pod에도 L7 풀스택 Envoy를 붙이지만, ambient는 전 구간 기본 L4(mTLS + L4 정책)만 깔고 L7 기능이 필요한 namespace나 service에만 waypoint를 추가한다.

## 핵심 컴포넌트

### ztunnel

- Node당 1개 배치되는 DaemonSet. Rust 기반 경량 프록시.
- L4 담당: mTLS 터널링, L4 authorization policy, TCP 메트릭.
- mesh 전체 워크로드 정보를 알아야 하지만 인스턴스 수가 노드 수라서 설정 전파 부하가 sidecar 대비 크게 감소.

### waypoint proxy

- Namespace 또는 service 단위로 **선택적** 배치하는 Envoy. L7 담당.
- HTTP 라우팅(카나리 가중치), L7 메트릭, `AuthorizationPolicy`의 L7 조건, `RequestAuthentication`, `WasmPlugin` 등을 적용.
- 필요한 곳에만 배포하므로 L7이 필요 없는 워크로드는 비용을 내지 않는다.

### HBONE (HTTP-Based Overlay Network Environment)

- HTTP/2 CONNECT + mTLS 조합의 터널링 프로토콜. ambient 컴포넌트 간 통신에 사용.
- 애플리케이션 원본 트래픽을 변형하지 않고 캡슐화. 대신 구간이 암호화되어 있어 패킷 캡처 기반 디버깅 난이도가 올라간다.

### istio-cni

- CNI 플러그인. Pod 생성, 삭제 시점에 해당 Pod 네트워크 네임스페이스 안에 iptables 규칙을 삽입해 트래픽을 ztunnel로 리다이렉트한다.

## 트래픽 리다이렉션 흐름

Pod의 모든 TCP 트래픽은 istio-cni가 삽입한 iptables 규칙으로 ztunnel 소켓에 리다이렉트된다.

| 포트 | 용도 |
| --- | --- |
| 15001 | egress — 나가는 트래픽을 HBONE으로 캡슐화 |
| 15006 | plaintext inbound |
| 15008 | HBONE inbound |

리다이렉트 대상 소켓은 노드의 ztunnel 프로세스가 **Pod 네트워크 네임스페이스 안에** 열어 둔 소켓이다. ztunnel을 우회하는 경로가 생기면 mTLS와 authorization policy가 전부 무시되므로, 이 리다이렉트 경로의 무결성이 ambient 보안 모델의 전제다.

## 리소스 비교 (정량)

Istio 공식 문서 기준(1,000 RPS 프록시 1개당):

| 프록시 | vCPU | 메모리 |
| --- | --- | --- |
| sidecar (Envoy) | 약 0.2 | 약 60Mi |
| ztunnel | 약 0.06 | 약 12Mi |

sidecar는 idle 상태여도 Pod 수만큼 상주 비용이 쌓인다. Pod 4,000개 기준 순수 프록시에만 수십에서 수백 vCPU와 약 240Gi 메모리가 소비되는 규모다. ambient는 ztunnel(노드 수) + 필요한 waypoint만이라 프록시 상주 비용이 구조적으로 낮다.

- 조건 표기: 위 수치는 공식 문서의 기준 벤치마크이고, 실측값은 트래픽 패턴(커넥션 수, payload, mTLS 여부)에 따라 수 배 차이 날 수 있다.

## 트레이드오프

| 얻는 것 | 잃는 것 |
| --- | --- |
| 프록시 상주 리소스 대폭 절약 | sidecar 대비 검증된 성숙도 |
| 설정 전파 확장성 (노드 수 비례) | 장애 영향 범위 확대 — ztunnel 장애 시 노드 전체, waypoint 장애 시 namespace/service 전체 (SPoF) |
| Pod 스펙 무변경 (주입, 재시작 불필요) | 디버깅 난이도 상승 (HBONE 암호화, proxy hop 증가, 새 개념 학습) |
| Gateway API 표준 정렬 | — |

선택 기준:

- **Pod 규모가 크고 계속 성장** + L7이 일부 서비스에만 필요 → ambient가 유리. 나중에 sidecar에서 ambient로 재마이그레이션하는 비용까지 고려하면 처음부터 ambient를 고르는 판단도 성립한다.
- **소규모거나 Pod 단위 격리(프록시 장애 반경을 Pod 하나로 제한)가 더 중요** → sidecar가 여전히 유효.
- ambient의 장애 반경 확대는 ztunnel/waypoint 자체의 가용성 설계(리소스 여유, PDB, 모니터링)로 상쇄해야 한다.

## 면접 체크포인트

- service mesh를 왜 쓰나? → 공통 관심사(mTLS, 관측, 트래픽 제어)를 앱 코드에서 인프라 계층으로 분리. 도입 판단은 규모와 요구가 오버헤드를 넘는지로.
- sidecar와 ambient의 본질적 차이? → 프록시 배치 단위(Pod vs Node)가 아니라 **L4/L7 분리**가 핵심. 필요한 곳에만 L7 비용을 낸다.
- ambient의 최대 리스크? → 장애 반경. sidecar는 프록시 장애가 Pod 1개, ztunnel은 노드 전체, waypoint는 namespace/service 전체.
- polynomial scaling 문제? → sidecar는 프록시 수와 설정 전파 대상이 모두 Pod 수에 비례해 컨트롤플레인 부하가 곱으로 증가. ambient는 전파 대상이 노드 수.

## 사례

- 채널코퍼레이션 (2025): 약 4,000 Pod 규모에서 네트워크 가시성과 카나리 배포를 목표로 service mesh 도입. sidecar의 성숙도 대신 리소스 효율과 확장성, 재마이그레이션 회피를 근거로 GA 직후의 ambient를 선택. ztunnel 실측 2,000 RPS 기준 약 0.8~1.2 vCPU, 300~500Mi 메모리.

## 관련 문서

- [[Istio-Ambient-Traffic-Internals|Istio Ambient 트래픽 내부 구현]] — HBONE, ztunnel 리다이렉션의 Envoy 설정 수준 딥다이브
- [[Istio-Ambient-Stale-Connection|Stale Connection과 503]] — L4/L7 분리가 만든 connection 생명주기 결함의 프로덕션 장애 사례
- [[Istio-Ambient-Partially-Enrolled-Pod|Partially Enrolled Pod와 Untaint Controller]] — node-local 컴포넌트 준비 순서 race와 startup taint 해법
- [[Istio-Ambient-Upgrade|Istio Ambient 업그레이드 전략]] — ztunnel의 장애 반경이 결정하는 blue-green node pool 방식
- [[Envoy-Retry-Buffer-507|Envoy Retry Buffer와 507]] — retry 정책이 만든 보이지 않는 payload 한도
- [[Envoy-XDS-Disconnected-Detection|Envoy xDS 단절 탐지]] — readiness가 못 보는 control plane 단절과 탐지 메트릭
- [[K8s-Resource-Right-Sizing|K8s Resource Right-Sizing]] — 프록시 상주 비용 산정과 같은 축의 리소스 역산
- [[EKS]] — EKS 위 service mesh 옵션 (App Mesh, Istio, Linkerd)
- [[Monolith-vs-Microservice|모놀리스 vs 마이크로서비스]] — mesh 도입 판단의 전 단계인 서비스 분리 결정
- [[Forward-vs-Reverse-Proxy|Forward vs Reverse Proxy]] — 프록시 기본 개념

## 출처

- [Istio Ambient Mode 도입기 — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/tech-istio-ambient-mode-30cdf79a)
- [Announcing Istio 1.24 — istio.io](https://istio.io/latest/news/releases/1.24.x/announcing-1.24/)
