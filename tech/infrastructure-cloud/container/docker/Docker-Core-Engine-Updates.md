---
tags: [infrastructure, docker, container, security, patch-management]
status: done
category: "Infrastructure - Container"
aliases: ["Docker Engine 업데이트 검증", "Docker Engine 보안 수정", "Docker Engine 29 릴리스 노트"]
verified_at: 2026-10-23
---

# Docker Engine 업데이트 뒤 검증 경로

한 Engine 릴리스에 묶인 수정도 경로와 환경 조건이 서로 다르므로, 업데이트 뒤에는 쓰는 경로마다 따로 확인한다. image, container와 daemon 구조는 [[Docker-Core|Docker 기본]]에서 다룬다.

## 29.9.0: 기동 말고도 확인할 경로

컨테이너 기동은 실행 경로 하나의 결과다. Docker Engine 29.9.0(2026-10-08) 릴리스 노트는 containerd image store에서 이미 unpack된 레이어 때문에 필요한 blob을 받지 않아 실행은 되지만 export와 push가 불완전해지는 오류의 수정을 기록한다. `lazy-pull`은 snapshotter가 이미 제공하는 레이어 내용의 다운로드를 생략하도록 제어하며, 알려진 remote snapshotter인 `nydus`, `overlaybd`, `soci`, `stargz`에서 기본 활성화된다. 모든 저장 방식에서 다운로드를 생략한다는 뜻은 아니다.

같은 릴리스의 HTTP/2 수정은 daemon과 deprecated `/grpc`, BuildKit의 frontend용 gRPC 서버 경로를 다룬다. Windows 수정은 data root에 쓰기 권한이 있는 주체가 junction을 둔 조건에 관한 것이다. 암호화 overlay 수정은 커널 암호화 설정 오류 때 일부 노드로 평문이 송신될 수 있던 문제다. 수신 peer가 이를 버려도 단방향 흐름이나 완료되지 않은 handshake의 기밀성 노출은 남을 수 있다.

운영 적용 제안: 사용하는 경로에 맞춰 기동, export/push, 외부 API와 frontend 접근, Windows data root 권한, overlay 송신 암호화를 따로 확인한다. 연결 실패를 암호화 성공으로 해석하지 않는다. 2026-10-23 위 릴리스 범위를 대조했으며 실제 환경 재현 결과나 최신 버전 권고는 아니다.

## 29.9.3 보안 수정과 29.10.0의 firewalld 복원

한 패치 릴리스에 묶인 보안 수정도 영향 조건이 서로 다르다. 29.9.3(2026-11-03)의 보안 수정은 여섯 건이며, 넷은 환경 조건에 따라 영향이 갈리고 둘은 입력 처리 결함이다. Swarm overlay network는 firewalld가 Docker의 iptables 규칙을 비운 뒤 암호화와 spoofing 방어가 빠지던 문제(CVE-2026-115538)이고, SwarmKit은 유효한 worker 인증서와 개인 키를 가진 공격자가 leader 변경 직후 짧은 구간에 manager 인증서를 얻을 수 있던 문제(CVE-2026-115539)다. BuildKit v0.34.2는 control API에 접근한 악의적 client가 state directory 밖 파일에 extended attribute를 설정해 host 권한 상승으로 이어질 수 있던 문제(GHSA-w26x-xg27-7qjc)와, 같은 Git source reference의 metadata를 두 번 해석하는 build가 resolver cache poisoning으로 daemon을 crash시킬 수 있던 문제(GHSA-2fqp-xg6f-v7gj)를 고쳤다. 나머지는 조작된 RSA key 파싱의 CPU 과다 사용(CVE-2026-116587)과 zstd 해제 중 panic(CVE-2026-116591)이다. 같은 릴리스는 부하 중 container, image, system API 요청에서 daemon이 멈추던 문제도 고쳤다.

릴리스 노트는 항목별 심각도나 영향 버전의 전체 범위를 적지 않으며, 이는 각 항목에 연결된 GHSA 보안 권고에서 확인한다. CVE-2026-115538 권고는 encrypted overlay network를 쓰는 Swarm node에서 firewalld가 다른 애플리케이션의 iptables 규칙을 지우는 경우로 조건을 좁히고, 이때 트래픽이 암호화 없이 나가도 dockerd가 로그를 남기지 않는다고 설명한다. 그래서 overlay 통신이 된다는 사실은 암호화가 유지된다는 증거가 아니다.

운영 적용 제안: Swarm에서 encrypted overlay network와 firewalld를 함께 쓰는지, worker 인증서가 노출될 수 있는지, BuildKit control API에 누가 접근하는지, Git source build를 쓰는지를 환경별로 대조해 적용 순서를 정한다. 29.10.0(2026-11-16)은 firewalld가 멈추거나 daemon보다 늦게 시작한 뒤 iptables 규칙이 복원되지 않던 문제의 수정을 별도 항목으로 기록한다. 같은 권고는 firewalld 중지와 늦은 시작도 CVE의 유발 조건으로 들지만, 두 수정의 관계는 릴리스 노트와 권고 어디에도 적혀 있지 않다. 따라서 firewalld를 쓰는 Swarm 환경에서 29.9.3만으로 이 경우까지 막힌다고 단정하지 않는다. 2026-11-19 릴리스 노트와 권고로 대조했으며 실제 환경 재현은 하지 않았다.

## 출처
- [Docker Engine version 29 release notes — Docker Docs](https://docs.docker.com/engine/release-notes/29/) — 29.9.0의 수정 범위와 snapshotter 조건, 2026-10-23 확인. 29.9.3 보안 수정과 29.10.0 firewalld 복원 수정, 2026-11-19 확인.
- [GHSA-6jhp-7446-hf7f 보안 권고 — moby/moby](https://github.com/moby/moby/security/advisories/GHSA-6jhp-7446-hf7f) — CVE-2026-115538의 유발 조건과 로그 부재, 2026-11-19 확인.

## 관련 문서
- [[Docker-Core|Docker 기본]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
