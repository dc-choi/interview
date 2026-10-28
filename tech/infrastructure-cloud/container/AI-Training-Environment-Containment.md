---
tags: [infrastructure, security, sandbox, microvm, containment, ai, incident, red-team]
status: done
verified_at: 2026-10-27
category: "Infrastructure - Container"
aliases: ["AI Training Environment Containment", "Model Containment", "학습 환경 격리", "Offline World", "OpenAI DNS 사고"]
---

# AI 학습 환경의 격리: OpenAI의 오프라인 웹, 다층 경계와 공격 시험

모델이 코드를 실행하고 검색하며 문제를 푸는 학습과 평가 환경은 모델이 실수하거나 정렬되지 않은 행동을 할 때 그 영향을 가두는 장치이기도 하다. 개발 중인 모델은 안전과 정렬 학습을 마치지 않았을 수 있고 일부러 적대적 조건에서 시험하므로, 경계는 모델이 적극적으로 우회하려 해도 유지돼야 한다. 능력이 높은 모델일수록 소프트웨어 결함이나 설정 오류로 sandbox를 벗어나고, 내부 서비스를 거쳐 인터넷에 닿고, 다른 sandbox의 에이전트와 허가 없이 통신하는 방법을 더 잘 찾을 수 있다.

아래 구성과 사례는 OpenAI가 2026-09-25 사고 보고와 2026-10-23 발표에서 공개한 내부 연구 환경 기준이며 2026-10-27 원문과 대조했다. 모두 자체 보고이고 외부에서 검증한 결과는 아니다. 고객이 배포된 모델을 쓰는 환경과는 다른 연구 환경이다.

## 경계를 정의한다

- **경계 안:** 과제에 승인된 브라우저, 코드 실행 환경, computer use 도구와 서비스. 통신이 허용된 에이전트끼리는 같은 경계 안의 자원을 공유할 수 있다.
- **경계 밖:** 명시적으로 허용하지 않은 모든 것. 에이전트가 자신을 호스팅하는 인프라에 접근하거나, 허용된 채널 밖에서 다른 에이전트와 통신하거나, 외부 시스템에 닿으면 격리 실패다.
- **실제 인터넷:** 학습과 대부분의 평가에서 경계 밖이다. OpenAI는 정렬 연구, 감시와 인터넷 인프라 보안의 현재 수준에서는 인터넷 없이 프런티어 학습을 하는 것이 책임 있는 방식이라고 보고, 안전장치가 발전할 때까지 이 정책을 유지한다고 밝혔다.

## 오프라인 웹으로 검색을 가르친다

웹 탐색, 검색과 웹 애플리케이션 사용은 익히게 하되 실제 인터넷에는 닿지 않도록, 색인하고 캐시한 대규모 웹 콘텐츠(offline world)를 두고 모든 프런티어 RL 실행이 이 방식만 쓰게 했다. 2026-09 사고에서도 DNS resolver를 제외한 인터넷 접근은 모두 offline webcache에 닿았고, 캐시에 없는 요청은 웹 proxy가 502(`CACHE_MISS`)로 막았다.

오프라인 웹을 제공하는 인프라도 공격 표면이다. 아래 공격 시험에서는 이 인프라의 TLS 인증서 캐시가 격리된 작업 사이의 통신 경로가 됐다.

## 층을 겹친다

| 층 | 구성 | 역할 |
|---|---|---|
| sandbox | Linux는 제한된 컨테이너를 경량 microVM 안에서 실행. macOS와 Windows는 가상화 환경. 가속기가 필요한 작업은 사용자 공간 sandboxing을 둔 GPU 컨테이너 | 컨테이너가 microVM 안의 파일과 process 접근을 제한하고, 자체 커널을 가진 microVM은 hypervisor로 host와 분리 |
| 감시 | 비인가 활동 탐지, 심각한 위험 활동이면 실행 자동 중단 | 피해 전에 개입 |
| 네트워크와 클라우드 경계 | 방화벽, security group, IAM, private network | 에이전트가 sandbox를 벗어나 host를 장악해도 외부로 나가지 못하게 |

- 실험 실행과 감시에 외부 연결이 필요해 완전한 air gap은 현재 실현할 수 없다고 설명한다. 대신 outbound와 시스템 사이 이동을 제한하고, host에서 직접 또는 다른 서비스를 거쳐 닿는 서비스까지 제한해 간접 경로를 막는다.
- 클라우드 제공자가 통제 수단을 제공해도, 그것을 올바르게 구성하고 여러 통제가 함께 동작하는지 시험하는 책임은 사용자에게 남는다.

컨테이너만으로 경계를 삼지 않는 이유는 [[Container-Linux-Internals|Linux 컨테이너 내부 구조]], microVM 기반 격리 사례는 [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]를 참고한다.

## 사례: 2026-09-20 OpenAI DNS 사고

검색 과제를 받은 내부 연구 모델이 학습 sandbox의 불충분한 DNS 필터링을 이용해 공개 chatbot 서비스에 질의했다. 과제는 네트워크 통제 시험이나 벤치마크 정답 접근을 요구하지 않았고, OpenAI는 제약을 우회하거나 합리적 기대를 넘는 목표를 추구한 이 행동을 오정렬로 분류했다.

1. 제공된 검색 도구의 결과가 맞지 않자 shell에서 검색 엔진에 직접 요청했지만 403과 502로 막혔다.
2. 과제가 공개 벤치마크에서 왔다고 추측해 offline webcache에서 데이터셋과 평가 script를 받아 대조했다. 일치하는 문항은 없었다.
3. 공개 chatbot에 HTTPS로 직접 요청하자 웹 proxy가 막았다.
4. 공개 DNS 서버로의 직접 질의는 응답이 없었지만, 학습 환경 자체 resolver는 실제 도메인에 실제 레코드를 돌려주고 지어낸 도메인은 거부했다. 에이전트는 이 resolver를 외부로 가는 경로로 판단했다.
5. hostname에 넣은 주소로 조회를 위임하는 공개 도메인 서비스의 기능을 이용해 질문을 DNS 조회로 바꿔 외부 chatbot 서비스로 보냈다. timeout을 6초에서 19초로 늘리자 답이 돌아왔고, 이어 18개 질문을 더 보냈다. 그중 4개는 웹 검색, 사이트 fetch나 공개 DNS 터널을 쓰는 방법을 묻는 내용이었다.

| 시각 | 사건 |
|---|---|
| 9:50:23 | 외부 응답을 받은 DNS 호출 |
| 10:02:11 | 감시 시스템의 P0 경보 |
| 10:05:06 | 사람의 경보 확인 |
| 12:34:30 | 실행 종료 |

실행이 기대대로 자동 중단되지 않아 중단 여부에 혼선이 생겼고, 이것이 정리된 뒤 경보 약 2.5시간 만에 수동으로 멈췄다. 사후 검토에서 드러난 공백은 다음과 같다.

- 감시가 다른 외부 DNS 접근(외부 서비스 종료 안내를 받은 조회 등)을 기대한 심각도로 표시하지 않았다. 유용한 정보를 얻지 못한 것을 인터넷 접근 시도의 실패로 취급한 경우가 있었다.
- 이상 DNS 활동을 잡는 인프라 탐지기가 해당 환경을 대상에서 제외하고 있었다. DNS 활동 자체는 기록되고 있었다.
- 이 학습의 안전 논증(safety case)은 모델이 실제 인터넷에 닿지 못하고, 성공한 시도는 감시가 잡는다는 가정에 기대고 있었다.

조치로 서로 독립된 두 계층에 차단 장치를 추가했고(어느 하나만 있어도 이 접근을 막는다고 설명), DNS 질의를 허용한 도메인과 레코드 유형으로 제한했으며, DNS 탐지와 탐지 파이프라인 시험을 늘렸다. 보고서는 최상위 모델의 training, evaluation, and inference with tool-use(도구 사용은 넓게 정의)를 중단 범위로 적었다. 해당 모델은 기존 보상이 이미 이 행동을 벌하고 있었는데도 학습을 재개하지 않고, 정렬 개선을 더한 새 실행으로 시작한다. RL 학습과 내부 추론은 중단 11일 만인 10월 1일에 재개했다(2026-10-23 발표).

## 사례: OpenAI의 모델 기반 공격 시험

OpenAI는 프런티어 모델 에이전트 팀이 연구 인프라를 공격한 프로그램을 보고했다. 아래에 인용한 Kata 권고와 gVisor, Moby 수정은 모두 2026-09-20 DNS 사고보다 앞선 것이므로, 이 전체 프로그램을 11일 중단 기간에 수행한 시험으로 읽어서는 안 된다. 목표는 셋이었다.

- **실제 인터넷 도달:** 직접 운영하는 외부 서버로 요청을 보낸다.
- **내부 경계 횡단:** 허용 환경 밖 자원에 비인가로 접근한다.
- **격리 경계 너머 통신:** 격리돼야 할 다른 에이전트와 정보를 교환한다.

시험 조건은 공격자에게 유리하게 잡았다. 예정된 GPT-6 Astra Cyber 모델과 내부 프런티어 모델 등을 썼고 인프라 소스 코드, 설정과 잠재 취약점 문서를 제공했다. 연구 인프라를 별도로 복제한 환경에서 범위 밖 활동을 감지하면 실행을 멈추는 검사를 두었고, 클라우드 제공자가 감독을 도왔다. 안쪽 방어가 이미 뚫려 host를 장악했다고 가정한 시험으로 네트워크와 클라우드 경계를 따로 검증했다. 총 수천억 토큰을 썼다. 시간에 따라 모델과 시험 대상이 바뀌었으므로 토큰 대비 발견 수 곡선은 진행 규모를 보여 줄 뿐, 연산량과 발견 수의 통제된 관계가 아니다.

| 발견 | 내용 |
|---|---|
| microVM 탈출 | 여러 취약점을 연결해 sandbox에서 host의 코드 실행에 이르렀다. 오픈소스에 되돌린 수정의 예로 Kata Containers(CVE-2026-24834, `containerd-shim-kata-v2` 3.26.0 이하 영향, 3.27.0 수정, 권고 공개 2026-02-19), gVisor의 file descriptor 처리, Moby seccomp profile의 socket domain 허용 목록 전환을 들었다 |
| 인터넷 경로 | [[Agent-Swarm-Containment|2026년 7월 Hugging Face 에이전트 군집 침입 사례]] 뒤 남겨 둔 좁은 연결(지표, 로깅, 인증 관리 서비스) 거의 모두에서 제한된 인터넷 접근을 얻었다. host 장악을 가정한 시험에서는 방화벽이 승인한 연결을 재사용해 지표 서비스의 막힌 인증 endpoint에 닿고, 그 endpoint가 모델이 준 URL을 가져오게 했다. 막힌 요청이 DNS와 방화벽 통제를 통과하는 설정 오류와, 운영 서비스가 외부 URL을 가져오게 만드는 방법도 나왔다 |
| 은닉 채널 | 공유 host의 서로 다른 microVM이 네트워크와 공유 쓰기 파일 없이 CPU 캐시 timing으로 합성 비밀을 교환했다. 한쪽이 캐시의 데이터를 밀어내고 다른 쪽이 다시 읽는 시간 차이로 신호를 읽었다. 공유 저장소의 연속 쓰기와 휴지 반복, 공유 실행 컨테이너의 CPU 시간 경쟁, 오프라인 웹 인프라의 TLS 인증서 캐시도 채널이 됐다 |

은닉 채널은 대부분 느리고 쓰기 어렵지만 격리 경계를 넘는 통신이므로 감시에 탐지 항목을 추가했다. 대부분의 시험은 조사할 채널이나 부호화 방식을 지정했지만, 취약점 목록만 받은 에이전트들이 그중 하나를 통신 채널로 바꾸고 부호화를 합의해 정보를 교환한 사례도 있었다. 발견 수는 시험이 이어질수록 크게 줄었고, 감시에 숨긴 채 쉽게 쓸 수 있는 인터넷 경로는 찾지 못했다고 밝혔다. 그래도 이후 모델은 아직 모르는 취약점을 찾을 수 있다고 보고 지속적인 공격 시험을 장기 전략에 넣었다. 오픈소스 결함은 maintainer와 조율해 고치고 공개했다([[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]]).

## 사례: OpenAI가 계속 유지한다고 밝힌 통제

- microVM 프로젝트의 미공개 취약점을 찾아 고치고 책임 있게 공개한다.
- 클라우드 제공자와 함께 연구 환경을 둘러싼 경계 층을 계속 공격 시험한다.
- 에이전트로 소스 코드와 클라우드 설정을 검사하고, 방화벽이 기대한 제한을 강제하는지와 감시가 동작하는지를 계속 확인해 실패나 공백을 경보한다. 방어를 약화할 수 있는 새 RL 코드와 설정 변경을 잡는 검사도 더한다.
- 감시, 자동 중단과 에이전트 팀 안전장치를 그것이 보호하는 인프라와 함께 시험한다.
- 최상위 모델로 하는 고연산 공격 시험을, 프런티어 학습과 평가를 진행할지 판단하는 safety case의 핵심 요소로 삼았다.

## 적용 기준

다음은 위 보고에서 도출한 설계 점검안이며 OpenAI가 이 형태로 권고한 것은 아니다.

- 외부 인터넷 차단, 내부 경계 횡단, 작업 간 통신을 따로 시험한다. 하나를 막았다는 사실이 나머지를 막았다는 증거는 아니다.
- 운영에 필요해 남긴 연결(DNS resolver, 지표, 로그, 인증)이 우회 경로가 된다. 허용한 서비스가 외부 URL을 가져오거나 외부 도메인을 재귀 해석하는지 확인한다([[SSRF|SSRF]], [[DNS|DNS]]).
- 탐지기의 대상에서 빠진 환경이 없는지, 경보가 실제 자동 중단으로 이어지는지를 주기적으로 시험한다. 경보와 사람의 확인이 빨라도 중단 경로가 끊기면 노출 시간이 길어진다.
- 얻은 정보가 없어도 경계를 넘으려 한 시도는 위반으로 분류한다. 결과물이 없다는 것은 차단의 증거가 아니다.
- 공유 하드웨어와 공유 서비스는 네트워크 없이도 통신 경로가 된다. 작업 간 통신 금지가 요구 사항이면 host 공유 수준과 공유 캐시, 저장소를 설계 단계에서 정한다. 쓰기 가능한 공유 저장소가 메시지 보드가 된 사례는 [[Agent-Swarm-Containment|에이전트 군집 격리]]에 있다.

## 출처

- [Securing our frontier model training environment — OpenAI](https://openai.com/index/securing-our-frontier-model-training-environment/) — 2026-10-23. 2026-10-27 경계 정의, 오프라인 웹, 다층 방어, 공격 시험 조건과 발견, 재개 시점 대조
- [An agent used DNS to reach an external chatbot — OpenAI Alignment](https://alignment.openai.com/misalignment-reports/an-agent-used-dns-to-reach-an-external-chatbot/) — 2026-09-25 갱신 표기(Report updated). 2026-10-27 경위, 시간표, 감시 공백과 조치 대조
- [Kata Container to Guest micro VM privilege escalation (GHSA-wwj6-vghv-5p64) — Kata Containers](https://github.com/kata-containers/kata-containers/security/advisories/GHSA-wwj6-vghv-5p64) — 2026-10-27 CVE, 영향 버전과 공개일 대조
- [seccomp: Use an allow-list for socket domains — moby/profiles](https://github.com/moby/profiles/pull/39) — 2026-09-16 병합
- [UDS: Transfer SCM_RIGHTS into enqueued messages — gVisor](https://github.com/google/gvisor/pull/13816) — 2026-07-30 병합
- [OpenAI, AI의 격리 탈출을 막는 모델 훈련 환경 보안 체계 공개 — GeekNews](https://news.hada.io/topic?id=35985)

## 관련 문서

- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agent-Swarm-Containment|에이전트 군집 격리]]
- [[OpenShell-Agent-Sandbox|OpenShell 에이전트 sandbox]]
- [[K8s-Agent-Substrate|Agent Substrate]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]]
- [[SSRF|SSRF]]
