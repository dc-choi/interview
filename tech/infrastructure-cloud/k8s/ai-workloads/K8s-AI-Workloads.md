---
tags: [kubernetes, ai, gpu, agent, index]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["K8s AI Workloads", "Kubernetes AI 워크로드"]
---

# Kubernetes AI 워크로드

여러 팀이 GPU를 나눠 쓰는 스케줄링과, 대부분의 시간을 기다리며 보내는 에이전트를 적은 수의 sandbox에 번갈아 올리는 실행 런타임. 상위: [[k8s|Kubernetes]].

## 목차

- [[K8s-GPU-Sharing-and-Quota|GPU 공유와 팀별 할당]]: 할당 계층이 없을 때의 네 증상, Run:ai 오픈소스 구성, KAI Scheduler의 큐, 회수와 큐 안 선점, GPU 분할 모드별 메모리 강제, GPU Fractioning의 r615 드라이버 전제와 조용한 실패
- [[Air-Gapped-AI-Delivery|폐쇄망 AI 플랫폼의 이미지와 모델 반입]]: 미러 영역의 검증과 발표 자료가 다르게 그린 에어갭 경계, 반입 주기, oc-mirror의 m2d와 d2m, 모델 반입 파이프라인과 검증 8단계, ModelPack, SPDX AI 프로필, 모델 서명과 Rekor, ClusterImagePolicy의 범위 규칙
- [[K8s-Agent-Substrate|Agent Substrate]]: Actor와 Worker 풀, 스냅샷 재개, gVisor와 microVM 격리, 자격 증명 주입과 GKE 배포의 egress, GPU 제약

## 함께 볼 문서

- [[OpenShell-Agent-Sandbox|OpenShell]] — Kubernetes 드라이버와 네트워크 정책의 강제 조건

- [[GPU-Server-Infrastructure#Kubernetes와 GPU 공유의 관측 경계|GPU 공유의 관측 경계]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
