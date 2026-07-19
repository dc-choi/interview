---
tags: [infrastructure, kubernetes, service-mesh, istio, envoy, network, reliability]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Istio Ambient Stale Connection", "Half-open Connection", "Stale Connection 503"]
---

# Stale Connection과 503 (Ambient Mode 장애 사례)

프록시가 connection pool에 쥐고 있던 커넥션의 목적지 Pod가 사라졌는데도 커넥션을 폐기하지 못하면, 같은 IP를 물려받은 새 Pod에게 그 커넥션을 재사용해 요청을 보내다 503이 터진다. IP 재사용은 방아쇠일 뿐이고, 본질은 **connection 생명주기 관리 결함**이다.

## 용어

- **Stale connection**: 목적지 Pod가 이미 종료됐는데도 pool에 살아있는 것처럼 남은 커넥션.
- **Half-open connection**: 송신 쪽은 연결이 유효하다고 믿지만 수신 쪽에는 해당 TCP 상태가 없는 커넥션. stale connection을 재사용하는 순간 half-open이 드러난다.

## 장애 메커니즘 — 세 요소의 결합

어느 하나만으로는 장애가 안 되고, 셋이 겹쳐야 발생한다.

1. **Envoy connection pool의 식별 키가 `IP:Port`뿐**: waypoint는 HBONE 커넥션(`connect_originate` cluster)을 `IP:Port`로만 구분한다. 같은 IP면 다른 Pod라도 같은 커넥션으로 취급.
2. **ztunnel이 Pod 종료 시 커넥션을 정리하지 않음**: HTTP/2 GOAWAY도 TCP FIN도 발송되지 않아, upstream인 waypoint는 커넥션이 죽었다는 사실을 알 방법이 없다.
3. **CNI의 빠른 IP 재사용**: 삭제된 Pod의 IP가 짧은 시간 안에 새 Pod에 할당된다 (AWS VPC CNI 등).

결과: 롤아웃 중 Pod-A(10.x.x.x) 삭제 → 같은 IP로 Pod-B 생성 → waypoint가 Pod-A 시절 커넥션을 `using existing fully connected connection`으로 재사용 → TLS handshake 없이 application data가 새 Pod에 인입 → 새 Pod의 네트워크 네임스페이스에는 그 TCP 상태가 없으므로 **kernel TCP stack이 RST** → waypoint는 503 반환.

구조적 배경: sidecar mode는 프록시와 앱이 같은 Pod에서 생사를 함께해 커넥션 상태가 자연히 정리되지만, ambient는 L4(ztunnel)와 L7(waypoint)이 분리되면서 프록시가 Pod 생명주기를 모른 채 커넥션을 쥐게 됐다. [[Istio-Ambient-Mode]]의 L4/L7 분리가 만든 새 결함 영역이다.

## 증상과 레이어별 로그 시그니처

- 발생 조건: 워크로드 롤아웃(배포, 재시작) 중. 트래픽이 적은 환경일수록 재현이 잘 되고, 프로덕션에서는 드물게 발생.
- idle timeout, keep-alive 조정이나 config propagation 지연 대응으로는 해결되지 않음 — 원인이 타이밍이 아니라 생명주기라서.

| 레이어 | 시그니처 |
| --- | --- |
| Gateway | `response_code: 503`, `response_code_details: via_upstream` |
| Waypoint | `response_code: 503`, `upstream_reset_before_response_started{connection_termination}`, `response_flags: UC` |
| ztunnel | 에러 로그 없음 (정리를 안 했으니 에러도 모름) |

`UC`(UpstreamConnectionTermination)는 upstream 커넥션이 응답 시작 전에 끊겼다는 뜻으로, half-open 커넥션 재사용의 전형적 흔적이다.

## 진단 방법론

로그만으로는 인과가 안 보여서 계층별 증거를 쌓는 방식이 필요하다.

1. **격리 재현 환경**: dummy 앱 + 전용 gateway, waypoint, ztunnel로 프로덕션 노이즈를 제거하고 같은 503을 재현. 문제 구간을 waypoint ↔ ztunnel ↔ Pod로 좁힘.
2. **debug 로그 + 패킷 캡처 병행**: waypoint를 debug 레벨로 올리고, 대상 Pod에 tcpdump sidecar(NET_RAW, NET_ADMIN)를 붙여 Pod 생성부터 종료까지 전 구간 pcap 확보.
3. **Wireshark에서 결정적 증거**: 정상 케이스는 TCP 연결 → TLS handshake → data 순서인데, 비정상 케이스는 **handshake 없이 data가 바로 인입되고 Pod가 RST로 응답**. 새 Pod에 이전 커넥션 상태가 없다는 직접 증거.
4. **3각 검증**: Envoy debug 로그에서 같은 ConnectionId 재사용 확인, pcap 전체에서 GOAWAY/FIN 부재 확인, Pod 삭제 후에도 waypoint의 15008 소켓이 ESTABLISHED로 남는 것 확인.
5. **가설 교정**: 최초 가설은 CNI의 IP 겹침이었지만, 증거가 가리킨 근본 원인은 connection pool의 stale 커넥션. 문제 정의를 증거로 다시 쓰는 것이 해결의 절반.

## 해결

### 단기 완화 — RST에 retry

waypoint의 retry 정책에 `reset`을 추가하면, stale 커넥션 재사용으로 RST를 맞았을 때 자동 재시도가 새 커넥션을 만들어 성공한다.

- 한계: stale 커넥션이 빨리 소진되게 할 뿐, 재사용 자체를 막지는 못한다.
- 주의: retry 대상 API의 **멱등성** 확인이 선행돼야 한다. OOM이나 프로세스 크래시로 인한 RST까지 재시도 대상이 되기 때문.
- 검토했지만 효과가 제한적인 대안: aggressive HTTP/2 keepalive(감지 시간 단축뿐), HBONE idle timeout 단축.

### 근본 해결 — upstream 개선 (진행 중 과제)

- **pool 키에 Pod 정체성 추가**: `IP:Port`에 Pod UID나 SPIFFE identity를 더해 같은 IP라도 다른 Pod면 다른 커넥션으로 취급. 단 같은 Deployment의 새 Pod는 ServiceAccount(= SPIFFE identity)가 같으므로 Pod UID까지 넣어야 완전하다.
- **ztunnel의 graceful connection close**: Pod 종료 시점에 GOAWAY 등으로 upstream에 알리는 방식. 종료 전에 정리해야 하는 타이밍 문제, 신호 전달 경로 부재, active stream 즉시 정리 불가 문제로 설계가 어렵다. [[Graceful-Shutdown]]의 프록시 계층 버전 문제.

## 면접 체크포인트

- 롤아웃 중에만 503이 나는 이유? → 커넥션 재사용 + Pod 교체 + IP 재사용이 겹치는 유일한 시점. 원인 후보로 connection 생명주기를 먼저 의심.
- retry로 덮으면 끝인가? → 아니다. 완화일 뿐이고 멱등성 전제가 붙는다. 근본은 pool 키와 종료 시그널링.
- sidecar에선 왜 없던 문제인가? → 프록시가 앱과 생사를 같이해서 커넥션 상태가 Pod와 함께 정리됨. 프록시를 Pod 밖으로 빼는 순간 생명주기 동기화 문제가 생긴다.
- 진단에서 로그 다음 단계는? → 격리 재현 + 패킷 캡처. L7 로그는 결과(503, UC)만 보여주고 인과(handshake 생략, RST)는 L4 증거에 있다.

## 사례

- 채널코퍼레이션 (2026): dev 환경 격리 재현과 pcap 분석으로 위 메커니즘을 규명하고 waypoint retry 정책에 reset을 추가해 완화. connection pool 키 문제는 istio/ztunnel#1637로 upstream에 직접 리포트 (생명주기 논의는 istio/ztunnel#1191).

## 관련 문서

- [[Istio-Ambient-Mode|Istio Ambient Mode]] — 개념과 트레이드오프 (장애 반경, 성숙도 리스크의 실증 사례가 이 문서)
- [[Istio-Ambient-Traffic-Internals|Istio Ambient 트래픽 내부 구현]] — connect_originate, HBONE 15008 등 이 장애의 무대가 되는 구조
- [[Istio-Ambient-Partially-Enrolled-Pod|Partially Enrolled Pod와 Untaint Controller]] — 같은 시리즈의 다른 장애 (신규 노드 편입 순서 race)
- [[Envoy-Retry-Buffer-507|Envoy Retry Buffer와 507]] — 이 문서의 완화책(reset retry)이 만든 2차 함정
- [[Graceful-Shutdown]] — 종료 시 커넥션 정리 문제의 애플리케이션 계층 버전
- [[External-Service-Resilience|외부 서비스 Resilience]] — retry와 멱등성 전제
- [[RCA-Postmortem|RCA와 포스트모템]] — 가설 교정 중심의 원인 분석 방법론

## 출처

- [Istio Ambient Mode 3-1편: 503과 Half-open Connection — 채널톡 테크 블로그](https://tech.channel.io/kr/articles/82576790)
