---
tags: [reliability, incident, sre, postmortem]
status: index
category: "안정성엔지니어링(Reliability)"
aliases: ["Incident Lifecycle", "장애 대응 라이프사이클"]
---

# 장애 대응 라이프사이클

장애를 예방하고, 발생했을 때 대응하고, 끝난 뒤 학습으로 바꾸는 운영 체계를 모았다. SRE 방법론이 전체 틀을 잡고, 부하가 장애의 성격을 어떻게 바꾸는지와 N-1 가용량 헤드룸 같은 사전 경보 지표가 예방 축을, 장애 복구 설계와 핫픽스 판단이 대응 축을, RCA와 포스트모템 문화가 학습 축을 맡는다.

- [[SRE|SRE]]: 규모와 신뢰성의 난제, 비상 대응 체계, 위험 탐지 지표, 시간 압축, 도메인 전문성
- [[Failure-Evolution-Under-Load|부하에 따른 장애 진화]]: 단일 원인, 용량과 런타임, 상호작용 3단계, 재시도 트래픽 증폭기, Degradation 사다리, 돈으로 시간 사고 엔지니어링으로 회수
- [[N-1-Capacity-Headroom|N-1 가용량 헤드룸]]: 최대가용배수 vs 부하증가배수, 임계 상황 사전 경보
- [[Incident-Recovery-Prevention|장애 복구와 재발 방지]]: P1~P4 등급, 포스트모템, 사전 예방
- [[Hotfix-Decision-Loop|핫픽스 판단과 학습 루프]]: 점진 배포의 영향 분모, 완화 수단 선택, 미진행 결정 기록, 재발 방지 이행
- [[RCA-Postmortem|RCA / Postmortem 문화]]: blameless, 5 Whys, 액션 아이템, MTTR/MTTD

## 함께 볼 문서

- [[안정성엔지니어링(Reliability)|안정성엔지니어링]]
