---
tags: [infrastructure, docker, container]
status: index
category: "Infrastructure - Container"
aliases: ["Docker 인덱스", "Docker 폴더"]
---

# Docker

Docker 기본, 데이터 영속성, Dockerfile, Compose와 bridge networking을 묶는 폴더 인덱스다.

## 목차

- [[Docker-Core|Docker 기본]] — image, container, client와 daemon 구조, Docker Desktop VM 경계, 수명주기와 CLI(stop, kill, pause, rm), tag와 pull 정책, CPU architecture와 배포 안전선
- [[Docker-Core-Storage|Docker 데이터 영속성]] — writable layer와 image `VOLUME`, anonymous와 named volume 수명주기, bind mount 문법과 권한, 공식 DB image 초기화 계약
- [[Docker-Core-Dockerfile|Dockerfile과 build context]] — 주요 명령, build context, COPY와 WORKDIR 경로 규칙, COPY와 ADD, 캐시 무효화
- [[Docker-Compose|Docker Compose]] — 멀티 컨테이너 정의, docker run 대응, named volume 선언, 코드와 image 변경 반영, 네트워킹
- [[Docker-Compose-Startup|Compose 기동 순서와 healthcheck]] — healthcheck, depends_on 조건, 의존 서비스 healthcheck와 한계, 기동 직후 연결 실패 진단
- [[Docker-Bridge-Networking|Docker bridge networking]] — 기본 network 3종, veth, bridge, NAT와 port publishing, source IP 제한, port 충돌, 직접 재현

## 관련 문서

- [[컨테이너(Container)|컨테이너 인덱스]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
