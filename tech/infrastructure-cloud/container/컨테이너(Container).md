---
tags: [infrastructure, container]
status: index
category: "Infrastructure - 컨테이너"
aliases: ["Container"]
---

# 컨테이너(Container)

Docker, Compose, 컨테이너 내부 구조, 이미지 빌드와 베이스 이미지 선택, 신뢰할 수 없는 에이전트 workload의 sandbox와 격리.

## 목차
- [x] [[Docker|Docker 폴더]]
- [x] [[Container-Linux-Internals|Linux 컨테이너 내부 구조 (namespace, cgroup CPU 한도, OverlayFS copy-up, OCI, 최소 rootfs 요건, runc 초기화, whiteout 변환, rootless)]]
- [x] [[Docker-Bridge-Networking|Docker bridge networking (기본 network 3종, veth, routing, netfilter, NAT, port 충돌, 직접 재현)]]
- [x] [[Docker-Compose|Docker Compose]]
- [x] [[Container-Entrypoint-Signals|Entrypoint와 시그널 (CMD와 ENTRYPOINT override, exec, PID 1, Graceful Shutdown, tini)]]
- [x] [[Container-Image-Build|컨테이너 이미지 빌드와 베이스 이미지 선택]]
- [x] [[OpenShell-Agent-Sandbox|OpenShell 에이전트 sandbox (supervisor 중개 egress, Landlock과 seccomp, placeholder 자격 증명, 정책 제안과 형식 검증)]]
- [x] [[AI-Training-Environment-Containment|AI 학습 환경의 격리 (오프라인 웹, 컨테이너와 microVM, DNS 사고, 모델 공격 시험과 은닉 채널)]]
