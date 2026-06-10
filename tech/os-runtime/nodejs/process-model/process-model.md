---
tags: [runtime, nodejs, process, thread]
status: index
category: "OS & Runtime"
aliases: ["프로세스 모델", "Node.js 프로세스와 스레드"]
---

# 프로세스와 스레드 모델

Node.js의 프로세스, 스레드 구조와 멀티코어 활용 전략 문서 묶음. 싱글 스레드 모델의 실체를 짚고, CPU 바운드 해법의 프로세스 분리 트랙(child_process, cluster)을 다룬다. 스레드 병렬 트랙은 [[Worker-Threads|워커 스레드]] 참조.

## 하위 문서

- [[Single-vs-Multi-Thread|싱글 스레드인가 멀티 스레드인가 — 면접 프레임, 메인 스레드와 OS 비동기 이벤트 시스템]]
- [[Process-Child-Process|process 전역 객체와 child_process — spawn, exec, fork, IPC, 시그널]]
- [[Nodejs-Clustering|클러스터링과 멀티코어 활용 — cluster 모듈, PM2, 워커 분산]]

## 관련 문서
- [[Worker-Threads|워커 스레드]]
- [[Event-Loop|이벤트 루프]]
- [[libuv]]
- [[Node.js]]
