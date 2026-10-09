---
tags: [observability, runbook, incident, on-call, sre, operations]
status: done
verified_at: 2026-10-10
category: "관측가능성(Observability)"
aliases: ["Incident Runbook", "런북", "Runbook", "대응 절차서"]
---

# Incident Runbook

런북은 **특정 알람/장애가 떴을 때 무엇을 어떤 순서로 확인하고 조치하는지** 적은 절차서다. 새벽 3시에 깬 당직자가 기억에만 의존하지 않도록 판단과 실행을 돕는다. 문서가 있어도 현재 환경에 맞는 절차, 훈련과 실행 권한이 필요하다. [[RCA-Postmortem]]

AWS는 알려진 결과를 달성하는 절차를 runbook, 문제를 조사하는 절차를 playbook으로 구분한다. 이 문서는 알람 조사와 완화 절차를 함께 연결하는 운영 문서라는 넓은 의미로 런북을 사용한다.

## 왜 필요한가

- **MTTR 단축**: 진단 경로를 미리 정해두면 헤매는 시간이 준다. [[Incident-Detection-Logging]]
- **속인성 완화**: 특정 시니어만 아는 지식을 문서로 옮겨 훈련과 권한을 갖춘 당직자가 1차 대응할 수 있게 한다.
- **스트레스 하 일관성**: 압박 상황에서 빠지기 쉬운 단계를 확인하게 한다.

## 무엇을 담나

- **트리거**: 어떤 알람/증상에서 이 런북을 펴는가.
- **영향/긴급도**: 사용자 영향과 에스컬레이션 기준.
- **실행 전제**: 대상 계정, 리전, 클러스터와 환경, 현재 배포 버전, 필요한 도구와 권한, 승인 또는 사전 승인 범위. 명령의 입력값과 예상 결과를 함께 적는다.
- **진단 단계**: 무엇을 어떤 대시보드/쿼리로 확인하는지(순서대로). 대시보드/로그 링크 직접 첨부.
- **완화 조치**: 롤백, 스케일업, 기능 플래그 off, 트래픽 차단 중 현재 피해를 줄이고 데이터와 의존 시스템에 안전한 수단을 고른다. 가역성만으로 우선순위를 정하지 않는다. [[Rollback]]
- **중단 조건**: 예상과 다른 결과, 영향 확대나 확인되지 않은 호환성이 있으면 맹목적으로 다음 명령을 실행하지 않고 재평가와 에스컬레이션으로 전환한다.
- **에스컬레이션**: 안 풀리면 누구를 언제 부르는가.
- **검증**: 조치 후 실제 사용자 여정, 오류율과 지연, 데이터 정합성과 남은 처리 작업을 어떻게 확인하는가.
- **기록**: 관측 시각, 실행 역할, 변경 전후 상태, 실행한 조치와 결과, 판단 근거를 사건 기록에 남긴다.

## 알람과 묶는다

런북은 **알람에서 한 번에 닿아야** 가치가 있다. 알람 메시지에 런북 URL을 박아 [[Alert-Fatigue|받는 즉시 행동]]으로 잇는다. 런북 없는 알람은 "받았는데 뭘 하지"가 된다.

## 최소 진단으로 완화하고, 근본 원인은 복구 후 조사한다

큰 장애에서는 근본 원인을 끝까지 규명하느라 사용자 피해를 방치하지 않는다. 다만 빠른 완화도 영향 범위, 최근 변경, 조치의 적용 조건을 확인하는 최소 진단이 필요하다. 배포 변경이 의심되고 이전 버전이 현재 데이터와 호환된다면 롤백을 우선 검토한다. 원인이 다르거나 롤백이 위험하면 기능 격리, 트래픽 제어와 다른 복구 수단을 비교한다. [[Hotfix-Decision-Loop|핫픽스 판단과 학습 루프]]

완화를 지연하지 않는 범위에서 관련 로그와 변경 이력을 보존하고 조치 결과를 기록한다. 명령 성공이나 알람 해제만으로 복구를 선언하지 않고 실제 사용자 요청과 핵심 여정이 회복됐는지 확인한다. 이미 발생한 데이터 손상이나 외부 부수효과는 코드 롤백으로 사라지지 않으므로 별도 복구 상태를 추적한다. 근본 원인과 재발 방지 조치는 [[RCA-Postmortem|포스트모템]]으로 연결한다.

## 외부 장애 지원과 내부 당직을 함께 연결한다

2026-10-10 AWS Incident Detection and Response(IDR) 공식 문서 기준, 온보딩 때 감시할 알람을 선택하고 애플리케이션과 런북에 연결한다. 런북에는 최초 연락 대상, 공동 대응 채널과 미응답 시 에스컬레이션 순서 및 대기 간격을 정한다.

IDR에 연결하는 중요 알람은 즉각 대응할 업무 영향이 있을 때 발생하도록 구성한다. 같은 알람으로 내부 해결 담당자도 AWS와 동시에 또는 먼저 호출해야 한다. AWS Incident Manager는 내부 담당자와 함께 완화에 참여하며, 먼저 혼자 대응한 뒤 고객에게 넘기는 1차 당직을 대신하지 않는다.

이 계약에서 도출한 운영 점검은 알람 전달, 내부 담당자 호출, 공동 대응 채널 합류를 각각 시험하는 것이다. 외부 지원에 등록했다는 사실만으로 전체 워크로드가 감시되거나 내부 대응 책임이 이전됐다고 보지 않는다. 실제 연락처와 회의 접근 정보는 접근 통제된 운영 런북에서 관리한다.

### 외부 APM의 이벤트 경로와 수동 호출을 따로 확인한다

2026-10-10 IDR 공식 가이드의 외부 APM 연동 예시는 API Gateway/SNS 또는 partner EventBridge event bus에서 받은 알람을 Transform Lambda로 변환해 custom EventBridge event bus에 전달한다. IDR의 managed rule은 이 custom bus에 설치되며, SaaS의 partner bus 자체에 설치되는 것이 아니다. 따라서 partner 연동 성공만으로 IDR 알람 수신을 확인했다고 볼 수 없다.

운영 점검에서는 알람 발생, payload 변환, custom bus 전달과 IDR 수신을 나누어 확인한다. 제공된 CloudFormation 템플릿도 연동 유형에 맞는 수정이 필요하다. 실제 계정의 이벤트 전달과 대응 개시는 별도 시험 대상이다.

감시 알람이 잡지 못한 실제 장애에는 IDR에 구독된 워크로드의 수동 지원 요청 경로를 둔다. 공식 안내는 `Service: Incident Detection and Response`, `Category: Active Incident`, `Severity: Business-critical system down`으로 접수한 사건에 5분 안의 접수 확인과 전문가 연결을 설명한다. 이 시간은 복구 완료 시간의 보장이 아니므로 런북의 복구 목표와 분리한다.

## 살아있게 유지하기

- **장애 때마다 갱신**: 포스트모템 액션 아이템으로 런북을 보강.
- **드릴/게임데이**: 주기적으로 실제로 돌려봐 낡은 절차를 걸러낸다. 안 돌려본 런북은 [[DR-Strategy|DR 드릴]]처럼 정작 필요할 때 틀어진다.
- **코드 근처에 보관**: 위키 깊숙이 두지 말고 알람/저장소에서 바로 닿게.

## 저빈도 기능은 전용 합성 점검으로 본다

서비스 전체 오류율 알람은 traffic 비중이 작은 기능의 전면 장애에도 정상으로 보일 수 있다. 전역 알람은 guardrail로 유지하고, 중요한 저빈도 여정에는 실제 요청을 주기적으로 보내는 합성 점검을 둔다.

최소 probe는 HTTP status뿐 아니라 timeout, 응답 shape, 부분 실패, root `null`과 예상치 못한 빈 결과를 확인한다. Pagination이 계약의 일부라면 다음 page의 연속성과 중복도 검증한다. 읽기 전용 요청을 우선하고, 쓰기 여정은 전용 합성 계정과 격리된 test data, idempotency, cleanup과 외부 부수효과 차단이 있을 때만 실행한다. Monitor에는 안정적인 golden input, 실행 주기, 연속 실패 임계값, 담당자, 알림 채널과 이 런북을 연결하고 test alert로 전달 경로까지 확인한다.

## 흔한 함정

- 런북이 오래돼 명령어/대시보드 링크가 깨짐 → 더 헷갈림
- 완화보다 원인 분석을 먼저 시켜 출혈이 길어짐
- 알람에 런북이 연결 안 됨 → 존재해도 안 펴봄
- 너무 추상적("상황을 확인한다") → 따라갈 수 없음
- 반복 절차를 계속 수동으로 처리함. 적용 조건, 실패 처리와 중단 수단을 검증한 뒤 자동화한다. 자동화 자체가 조치의 안전성을 보장하지 않는다.

## 면접 체크포인트

- 런북이 MTTR/속인성/일관성에 기여하는 방식
- 담아야 할 항목(트리거, 진단 순서, 완화, 에스컬레이션, 검증)
- 알람-런북 연결의 중요성([[Alert-Fatigue]])
- 근본 원인 조사와 완화를 고르기 위한 최소 진단을 구분하는가
- 드릴/포스트모템으로 런북을 살아있게 유지하는 법

## 출처

2026-10-10에는 IDR의 선택 알람, 내부 담당자 동시 호출과 에스컬레이션 계약, 외부 APM의 이벤트 경로와 수동 장애 요청을 대조했다. 실제 계정의 온보딩과 알림 전달은 시험하지 않았다.

2026-10-03에 최소 진단과 피해 완화의 구분, 실행 전제와 예외 처리, 롤백의 호환성 조건을 아래 공식 자료와 대조했다. 개별 서비스의 명령, 권한, 복구 시간과 합성 점검의 실제 구현은 검증하지 않았다.

- [Being On-Call — Google SRE Book](https://sre.google/sre-book/being-on-call/)
- [AWS 공식 문서, AWS Incident Detection and Response monitoring and observability](https://docs.aws.amazon.com/IDR/latest/userguide/observe-idr.html)
- [AWS 공식 문서, Ingesting Third Party Application Performance Monitoring Alarms](https://docs.aws.amazon.com/IDR/latest/userguide/idr-gs-ingest-apm-alarms.html)
- [AWS 공식 문서, Request an Incident Response](https://docs.aws.amazon.com/IDR/latest/userguide/inbound-incident-idr.html)
- [AWS 공식 문서, Workload onboarding questionnaire in Incident Detection and Response](https://docs.aws.amazon.com/IDR/latest/userguide/idr-gs-questionnaire.html)
- [AWS 공식 문서, Develop runbooks and response plans for responding to an incident in Incident Detection and Response](https://docs.aws.amazon.com/IDR/latest/userguide/idr-workloads-dev-runbook.html)
- [Effective Troubleshooting — Google SRE Book](https://sre.google/sre-book/effective-troubleshooting/)
- [Emergency Response — Google SRE Book](https://sre.google/sre-book/emergency-response/)
- [AWS 공식 문서, OPS07-BP03 Use runbooks to perform procedures](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/ops_ready_to_support_use_runbooks.html)
- [AWS 공식 문서, OPS07-BP04 Use playbooks to investigate issues](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/ops_ready_to_support_use_playbooks.html)
- [Ensuring rollback safety during deployments — AWS Builders' Library](https://d1.awsstatic.com/builderslibrary/pdfs/ensuring-rollback-safety-during-deployments.pdf)
- [PagerDuty — Runbook documentation](https://www.pagerduty.com/resources/learn/what-is-a-runbook/)

## 관련 문서

- [[RCA-Postmortem|RCA / Postmortem (런북 보강)]]
- [[Alert-Fatigue|Alert fatigue (알람-런북 연결)]]
- [[Incident-Detection-Logging|장애 감지와 로깅]]
- [[DR-Strategy|DR 전략 (드릴)]]
- [[SLI-SLO|SLI/SLO]]
- [[Rollback|롤백 전략]]
- [[Hotfix-Decision-Loop|핫픽스 판단과 학습 루프]]
