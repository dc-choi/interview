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

### 대시보드는 고객 영향에서 상세 진단으로 연결한다

알람의 진입 화면에는 서비스 건강 상태와 고객 영향 범위를 두고, 그 아래에서 API 요청, 처리와 응답 지표 및 개별 서비스의 상세 지표로 이동하게 한다. CPU와 메모리 수치만으로 고객 피해의 유무를 판단하지 않는다. 상위 화면에는 판단에 필요한 지표를 추리고 세부 분석은 연결된 화면으로 넘긴다.

그래프에는 지표의 의미, 정상 범위와 알람 임계값을 설명하고 런북, 상세 대시보드와 배포 이력을 연결한다. 자동 완화가 시작됐어도 담당자가 실행 중인 조치와 고객 영향의 변화를 확인할 수 있어야 한다. 이는 2026-10-16 AWS Builders' Library의 대시보드 설계 원칙을 대조한 내용이며, 개별 서비스의 임계값과 실제 대응 시간은 검증한 것이 아니다.

### 전화 알림은 발신, 담당자 확인과 복구 상태를 나눈다

부분 검증(2026-10-16): Amazon Connect의 `StartOutboundVoiceContact` 성공 응답은 `ContactId`를 반환한다. 이 응답만으로 담당자가 전화를 받거나 장애 대응을 맡았다고 판단하지 않는다. Contact event의 `CONNECTED_TO_SYSTEM`도 사람뿐 아니라 음성사서함 연결을 포함하므로 담당자 확인의 증거로 쓰기에는 부족하다.

- **발신 요청:** 목적지 번호는 E.164 형식으로 전달한다. 동일 발신 요청을 재시도할 때는 `ClientToken`을 보존한다. 토큰은 생성 후 7일간 유효하며 이미 시작한 contact가 있으면 그 ID를 반환한다.
- **대응 상태:** 사건 상태와 개별 발신 시도를 따로 관리한다(설계 제안). 같은 API 요청의 재시도와 의도한 다음 발신을 구분하고, 담당자 확인, 일정 시간 알림 보류, 다음 담당자 호출과 사건 종료의 전환 조건을 명시한다.
- **복구 판정:** 담당자의 확인과 전화 종료는 서비스 복구와 별개다. 미응답과 음성사서함 연결, 명시적 확인, 보류 후 재호출을 각각 시험하고, 사건 종료에는 앞서 정의한 사용자 여정과 데이터 정합성 확인을 적용한다(운영 점검 제안).

실제 발신과 재시도 시험은 수행하지 않았다. 번호와 연락 대상은 접근 통제된 운영 설정에 두며, 기존 절 전체의 `verified_at`은 유지한다.

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

## AI로 보강한 런북의 변경 권한과 실행 증거

AI가 만든 절차와 실제로 실행해도 되는 절차를 구분한다. 다음은 2026-10-16 Cutover AI Assistant와 AWS Systems Manager 문서에서 확인한 기능 경계다.

- **내용 검토와 변경 권한:** Cutover AI Assistant는 작업의 의존관계, 계획 및 실제 소요 시간과 실행 기록을 분석한다. 기존 사용자 권한을 높이지 않으며 읽기 전용 사용자는 조회와 요약만 할 수 있다. 응답에는 오류나 누락이 있을 수 있어 운영 판단 전에 검토해야 한다.
- **승인 범위:** Cutover는 개별 요청, 세션의 같은 도구 유형, 세션 전체 동작에 대한 승인을 구분한다. 세션 승인을 켜면 후속 호출이 자동 승인될 수 있으므로 승인 UI의 존재를 매 변경의 수동 검토로 간주하지 않는다.
- **대화와 감사 기록:** Cutover의 변경은 변경 내용, 시각과 요청자를 포함하는 감사 로그에 남는다. AI 대화는 서버에 저장되지 않고 현재 세션의 브라우저 로컬 저장소에 보관되므로 대화 기록과 변경 이력의 보존 범위를 구분한다.
- **실행 중 승인 단계:** Systems Manager Automation의 `aws:approve`는 지정한 주체의 승인 또는 거절을 기다리며 필요한 승인 수가 채워지면 진행한다. 이 action은 다중 계정 및 리전 자동화를 지원하지 않는다. 승인 대기 시간과 실패 시 중단 경로를 실행 환경에 맞게 정한다.

설계 점검 제안: 초안의 입력 자료, 작업 순서와 의존관계, 실행 권한 및 승인 범위를 먼저 확인하고 격리된 환경에서 절차를 연습한다. 단계별 실제 시작과 종료, 승인, 실패 및 재개 기록으로 다음 초안을 보강한다. 생성 속도나 제안 채택률만으로 복구 효과를 판단하지 않고 실제 서비스 회복 시간과 오류를 확인한다.

이 절은 제품 문서의 권한, 승인과 기록 경계를 대조한 부분 검증이다. 실제 계정의 자동화 실행, 복구 성능과 기존 IDR 설정은 재검증하지 않아 문서의 기존 `verified_at`은 유지한다.

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

- [AWS 공식 문서, StartOutboundVoiceContact](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartOutboundVoiceContact.html)
- [AWS 공식 문서, Contact events](https://docs.aws.amazon.com/connect/latest/adminguide/contact-events.html)
- [Building dashboards for operational visibility — AWS Builders' Library](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/builders-library/approved/images/building-dashboards.pdf)
- [Cutover Help Center, AI Assistant](https://help.cutover.com/en/articles/13621942-ai-assistant)
- [AWS 공식 문서, aws:approve – Pause an automation for manual approval](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-approve.html)

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
