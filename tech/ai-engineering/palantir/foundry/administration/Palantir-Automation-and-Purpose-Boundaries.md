---
tags: [palantir, automation, governance, scoped-session]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 자동화와 목적별 접근 경계"]
---

# 자동화와 목적별 접근의 경계

여러 데이터의 접근권과 특정 업무에서 데이터를 함께 쓸 수 있는 조건은 다르다. 자동화의 trigger, 실행 identity와 외부 효과, 목적별 session을 함께 설계한다. 아래 도입 사례는 2022~2023년 공지를 확인한 역사적 설명이다.

## Trigger의 데이터와 실행 방식

2023년 Object Monitoring은 저장된 검색과 객체의 데이터 변경에 맞춰 notification/Action을 실행하는 경로로 도입됐다. Pipeline이 Ontology를 갱신할 때 알리거나 이상 객체를 Action에 전달하는 업무에 적합하다. 같은 공지는 고정 schedule, 사용자 지정 평가 schedule과 time-series property 변화에 Pipeline Builder, Code Repository와 Foundry Rules를 구분했다.

Foundry Rules는 업무 전문가가 alerting, categorization과 task generation 논리를 관리하고 IT가 baseline과 배포 경계를 제공하는 방식이다. 탐색적 what-if 분석은 Quiver/Contour에서 수행한 후 반복 규칙으로 굳힐 수 있다. Streaming도 connector/push ingest, 변환, time-series/object modeling과 앱의 조합이다. 2023년 공지의 stateful function, external compute와 export 계획을 현재 제공 사실로 취급하지 않는다.

자동 Action은 Ontology뿐 아니라 webhook으로 외부 시스템을 바꿀 수 있다. 수신, 실행과 외부 변경 권한, 재시도/rollback 범위를 분리한다. Action Log는 여러 객체를 바꾼 한 submission에 하나의 log를 연결하고 선택한 unchanged property도 담을 수 있다. 2022년 도입 공지의 넓은 표현은 현재의 성공한 Action만 기록, backfill 부재와 metadata 제약을 없애지 않는다.

## Justification, session과 조직 범위

2023년 Checkpoint 확장은 group/marking membership, project role/reference와 allowed marking 변경 사유를 수집하도록 했다. 입력자는 변경을 실행한 관리자일 수 있다. 요청자의 의사와 승인자의 검토를 관리하는 Approval flow와 구분한다.

Scoped Session은 사용자가 가진 marking 중 현재 목적에 필요한 부분을 고르는 추가 제약이다. File system과 Ontology workspace 양쪽에서 작업 혼합을 줄이며 새 접근권을 주지 않는다. Organization 전체 로그인 경험과 banner에 영향을 줄 수 있어 당시 기본 disabled로 안내됐다.

Control Panel의 enrollment, organization와 user/group 제어도 범위를 구분한다. Enrollment 관리 권한은 특정 organization의 data access 권한과 같지 않다. Cross-organization collaboration은 user/group discovery도 포함한다.

## 개인 공간과 배포 대상

2022년 12월에는 다른 project가 개인 `Your files` dataset을 참조하는 경로를 제한했다. 계정 비활성화로 production pipeline이 깨지는 결합을 줄이는 경계다. 공용 pipeline의 owner/input을 개인 공간에 묶지 않는다. Namespace의 project default role은 새 project의 초기값이며 owner의 개별 override와 구분한다.

2023년 Slate public application은 Foundry account 없이 URL로 접근해 입력을 dataset에 받는 경로로 도입됐다. 인증 앱의 접근 전제를 재사용하지 않는다. 당시 personalized URI/metric tracking 미지원 조건이 있어 현재 기능은 전용 문서로 대조한다. Mobile Workshop도 IT의 browser access 설정이 필요하며 화면 제작만으로 device 접근이 허용되지는 않는다.

Use Case 앱은 관련 dataset, object/action type과 production 준비를 묶는 탐색 경계이며 실제 보안을 대체하지 않는다. Training badge의 과정 완료와 certification 평가도 다른 증거다. 과거 시험 시간/문항/통과율은 현재 시험 조건으로 복사하지 않는다.

## 권한과 발견, 검토와 생성의 구분

2023년 4월 Monitor subscription 확장은 다른 사용자/group을 구독시켜도 원본 resource 접근권이 없으면 alert를 보지 못한다고 명시했다. Org-level OAuth consent도 사용자의 반복 동의를 대신할 수 있지만 data permission을 새로 주는 설정은 아니다. Resource Management의 currency 표시는 비교 단위이며 접근에는 별도 viewer role이 필요하고 모든 enrollment의 availability가 같지 않다.

2023년 5월 Approvals는 한 request의 여러 task가 모두 승인되면 변경을 자동 적용하는 흐름으로 도입됐다. Builder branch protection은 proposal에 기여하지 않은 editor의 승인을 요구했다. 제안 작성, 승인과 변경 적용을 같은 행위로 압축하지 않는다. Quicksearch의 discoverable resource는 access request로 이어질 수 있으며 jump-to title 검색과 full-results metadata 검색도 범위가 다르다. Consumer-only navigation은 명시적으로 허용한 앱에 집중시키는 경험이며 underlying API 보안은 전용 permission 계약으로 판단한다.

REST API source의 2023년 도입 범위는 webhook이었다. Direct cloud에는 egress 관리가 필요하고 agent/chained request도 별도 설정이었다. 같은 시점 Internet sync/export는 External Transform, on-premise는 legacy adapter로 구분했다. 현재 connector를 고를 때 이 역사적 제한을 무조건 적용하지 않는다.

OSv2의 2023년 GA는 incremental indexing, edit schema migration과 multi-datasource property permission을 도입했다. 당시의 Action 10,000객체, paging과 indexing 규모 설명은 현재 enrollment limit을 대신하지 않는다. OSv1이 당시 즉시 제거된 것도 아니므로 GA 발표와 강제 이전을 구분한다.

Cipher는 기본 at-rest/in-transit encryption 위에 선택적 cell/column 노출, decrypt rate limit과 사유 기록을 더하는 계층이다. Marking/Restricted View를 대체하지 않는다. 2023년 AIP Assist의 data/metadata 미접근 설명은 당시 documentation support 도구의 범위다. 이를 이후의 모든 AIP agent/tool이 데이터에 접근하지 않는다는 보장으로 확대하지 않는다. OSDK의 당시 TypeScript beta와 Python/자동 업데이트 roadmap도 현재 지원 판단의 근거와 분리한다.

## 초기 제품의 제약을 후속 제품에 그대로 적용하지 않는다

2023년 11월 Object Monitoring은 Automate로 바뀌며 기존 monitor를 호환 이전하고 시간 조건, 객체 수정과 time/object 결합 조건을 추가했다. Batch/per-object/per-group 실행도 구분했다. 따라서 초기 공지의 schedule 제약을 현재 Automate의 미지원 사실로 유지하지 않는다. Live Patch의 Action 변경 반영과 streaming object 지원 roadmap도 서로 다른 범위였다.

Automate notification은 property-backed recipient, function rendering과 Notepad/template PDF 첨부를 지원하도록 확장됐다. Dynamic Object Set parameter도 고정 객체 목록과 다른 평가 의미를 갖는다. Never-expire automation은 credential과 input data의 영구 유효성을 뜻하지 않는다.

2023년 11월 Control Panel ingress change는 security officer만 요청하고 기본 self-approval, 일부 enrollment는 두 번째 officer를 요구하도록 안내했다. Approval이 존재한다는 것과 독립적인 두 사람의 검토는 다르다. Control Panel role로의 permission 이전도 기존 role에 권한이 추가되는 단계가 있어 단순 UI 이동으로 취급하지 않는다. Organization administrator가 marking의 Expand access를 관리할 수 있는 것과 자신이 이를 자동으로 받는 것도 다르다.

2023년 10월 Application access 이전은 이전 설정을 유지하되 lifecycle 변경 시 대체로 enablement를 유지하고 deprecated면 disabled로 바꾸는 경로였다. Category는 분류이며 개별 app 권한 설정을 대신하지 않았다. Newsletter opt-in과 관리자의 service/security contact 등록도 목적과 발송 범위가 다른 설정이다.

2024년 OpenAPI export는 resource name/description을 포함하지만 object instance data는 포함하지 않는다. Application 변경 후 새 spec을 생성해야 하며 export Checkpoint를 둘 수 있다. Metadata export도 별도 정책 대상일 수 있다. Static website hosting beta는 uploaded asset의 preview/publish, domain 승인과 CSP를 나눴다. Editor/owner의 site 설정과 enrollment officer의 subdomain 승인은 다른 권한이다.

Time-constrained group membership은 직접 grant와 Approval 요청 모두의 기간을 제한하는 경로였다. Checkpoint reauthentication은 IdP에 다시 인증한 기록을 남기며 Login/Scoped Session Select type은 제외했다. Data Lineage에서 다른 사용자의 권한을 확인하려면 사용자뿐 아니라 object/action/backing dataset을 볼 수 있어야 한다. 진단 화면의 부재를 접근권 부재의 단독 증거로 쓰지 않는다.

Sensitive Data Scanner는 OCR text가 Ontology/LLM으로 가기 전 탐지하는 위치에도 사용할 수 있다. 주기적 scan은 그 주기 사이 노출을 없애는 동기적 gate와 다르다. AWS email suppression 화면의 empty는 BYOSMTP/PCloud/non-AWS 전달 성공을 입증하지 않는다. SMB connector는 mount-directory pattern의 plaintext credential/server restart 문제를 줄이는 대안으로 소개됐지만 network/source permission은 별도로 남는다.

2024년 Spaces 관리의 Control Panel 이동은 tab을 모두에게 보여도 개별 space role/access requirement를 유지했다. Egress suggestion도 ISO의 승인/거부와 ISO 자신의 제안 auto-approval을 구분한다. Object type group의 새 primitive는 Ontology viewer에게 discoverable해졌지만 안전하게 이전하지 못한 legacy group은 type-class metadata에 이름을 남기고 operational UI에서는 숨겼다. 그룹 taxonomy와 보안 group membership은 다른 개념이다.

Model family 활성화는 법적 terms와 provider/hosting별 조건을 enrollment에서 수락하는 경로다. Disable은 그 family의 native Assist와 custom workflow를 깨뜨릴 수 있다. Model Catalog sandbox의 시험 성공은 다른 geography/provider에서의 availability를 보장하지 않는다. Static website GA 당시 customer-managed domain은 별도 roadmap이었다.

Solution Designer의 platform-aware node/resource 연결은 아키텍처 합의를 돕지만 실제 bootstrapping/deployment 상태를 증명하지 않는다. Build with AIP reference product 설치와 사용자 숙련도도 구분한다. 공개 Developer Community는 자발적 응답이며 계약상 지원 요청/비공개 문의와 다른 경로다. Assist가 커뮤니티를 제안하더라도 기밀 데이터를 그대로 게시하는 권한이 생기지 않는다.

2024년 7월 Application access는 명시적으로 제한하지 않은 app의 GA 시점 자동 공개와 deprecated 시 접근 상실을 예외로 명확히 했다. Experimental/beta에서 명시한 제한은 GA에도 유지하고 sunset은 기존 접근을 유지했다. 2023년 UI 이전 설명만으로 GA enablement를 판단하지 않는다. 8월 조직 권한 이전 2단계는 필요 시 custom role로 기존 권한을 보존하는 방식을 안내했으며, 1단계의 일부 default role 확대와 구분한다.

Linter의 주기적 sweep은 정의된 rule에 맞는 resource를 찾아 opinionated recommendation을 낸다. 날짜에 따라 rule과 결과가 변할 수 있으므로 권고를 곧바로 결함이나 비용 절감의 확정치로 취급하지 않는다. Fix Assistant와 impact tracking도 수정 전후의 실제 correctness/usage 대조를 대신하지 않는다. Live Build log viewer의 Pause는 화면의 feed를 멈추며 실행 job 중단과 구분한다.

2024년 Portfolios는 한 project가 최대 한 portfolio에 속하는 space 내 탐색 구조였다. Space viewer가 portfolio를 보더라도 내부 project 권한은 별도로 필요하다. Discoverable project cover page도 marking이 있는 project의 파일 접근과 분리해 공개할 수 있으므로 cover의 내용 자체를 검토한다. Project template은 space owner가 신규 project에 role/group/marking/constraint guardrail을 적용하는 단위다.

Intake form의 사용자 입력 attribute는 승인 후 부여되며 첫 로그인 접근 gate와 자동 group assignment에 연결할 수 있다. 임의 자기신고를 곧바로 신뢰 attribute로 쓰는 흐름과 다르다. Support team의 org→enrollment 설정 이동은 모든 reporter org의 issue status automation으로 범위를 넓혔다. 단순 UI 이전으로 보지 않는다.

Code Repositories local clone/VS Code extension 설정과 local dataset preview는 별개다. 2024년 local preview는 데이터 일부를 local disk에 일시 저장하므로 기본 disabled로 안내됐다. Remote workspace 연결이 허용됐다고 로컬 데이터 복제도 허용됐다고 가정하지 않는다.

Cipher visual obfuscation은 RGB pixel을 가리는 가역 연산이다. Channel/license, decrypt 빈도와 justification을 제어하고 PNG를 권장했다. 되돌릴 수 없는 redaction과 같지 않으며 난독화한 image의 새 sensitivity/공유 범위는 별도로 판단한다. Time-series alert automation의 2024년 GA는 첫 실행 전체, 이후 증분 평가이지만 stream archive를 사용해 최소 10분 추가 지연이 있었다. Stream을 input으로 삼는다고 real-time trigger인 것은 아니다.

Monitoring View의 Slack/webhook/PagerDuty는 지정 severity와 일치할 때 trigger되는 integration이었다. 모든 alert가 모든 channel로 전송된다고 가정하지 않는다. Approval subtask Revert와 다른 eligible reviewer의 override도 기존 결정의 수정 기능이며 과거에 노출된 데이터까지 회수하는 기능은 아니다.

2025년 space 생성은 여러 organization 중 하나의 access requirement 충족과 모든 deletion-policy organization이 삭제된 뒤 지워지는 last-out 조건을 구분했다. File system은 설정 후 변경할 수 없고 usage account default는 project override가 가능했다. Custom role set을 쓰면 space role의 project 상속이 달라지므로 조직별 경계를 확인한다.

Project request form에서 group을 제외하는 것은 해당 form의 선택지를 숨긴다. 다른 project에서 같은 group 가입이 승인되면 그 group이 role을 가진 모든 project에 접근할 수 있다. Per-project form 설정을 group 권한 차단과 혼동하지 않는다. Restricted View 정책도 Builder 설정 후 main deploy해야 적용되는 계약이었다.

Kiosk는 allowlisted Workshop module과 허용된 group이 여는 장기 read-only session이다. Module에서 직접 접근하는 entity로 scope를 줄이고 active/historical session을 관리한다. 일반 개인 session timeout 연장과 다르다. Priority resource queue는 project에 vCPU/선택적 vGPU, 기존 branch 하나에 별도 queue를 할당하는 경로이며 이름만으로 모든 workload의 우선 처리 보장을 뜻하지 않는다.

Machinery는 state 중심 process, Action transition과 filter, value type/submission criteria, Automate와 Logic을 연결하고 Workshop Express를 생성하는 도구다. External event log에서 process를 mining한 결과와 실제 state transition을 인가하는 규칙은 다르다. 생성 앱을 배포한 것으로 업무 절차의 conformance가 자동 검증되지는 않는다.

2025년 4월 mandatory control property는 같은 datasource의 다른 property 값을 object의 marking/classification/organization 값으로 제한하는 경로였다. 일부 property만 보호하려면 같은 source에 모으는 방식과 허용 marking/최대 classification constraint를 맞춘다. Export dataset에는 허용된 marking/최대 classification이 적용되는 조건도 있어 UI에서 보이는 한 row의 값만으로 export 권한을 판단하지 않는다.

Source-based 외부 code의 **enable exports**는 destination egress, **allow code imports**는 source property와 secret 접근을 연다. Credential rotation/config 공유를 code 변경 없이 할 수 있어도 source importer 권한은 강력하다. Secret 사용과 data exportable marking 정책, agent proxy 접근을 각각 검토한다.

2025년 Project usage는 project Owner가 기본으로 접근하되 compute/storage dimension만 보여주고 cost/billing insight는 제공하지 않는 화면이었다. 전체 Resource Management currency 화면과 같지 않다. Workflow Lineage의 bulk Ontology role grant는 확인 뒤 즉시 적용하고 자동 Undo가 없는 경로였으므로 share 범위와 Ontology Viewer/Discoverer 기본값을 적용 전에 대조한다.

Custom enrollment role은 domain 관리 등 필요한 workflow만 분리해 주는 수단이며 ingress/egress 전체 권한이 필요하지 않은 역할을 좁힐 수 있다. Machinery의 subprocess/parallel process와 mining frequency filter는 탐색 구조이며 낮은 빈도의 예외가 중요하지 않다는 결론을 자동으로 주지는 않는다.

2025년 7월 model family organization enablement는 project의 모든 organization이 해당 family를 허용해야 사용할 수 있는 조건이었다. 여러 org 중 하나만 허용한 것으로 충분하지 않다. Guest membership UI 이동도 이제 viewing에 Organization settings viewer, management에 administrator를 요구해 과거 모든 org member의 조회와 차이가 있었다.

Sensitive Data Scanner의 daily/weekly/monthly schedule과 resource update마다 실행하는 continuous scan은 비용/지연이 다른 선택이다. Scheduled scan을 도입해도 continuous가 제거된 것은 아니다. Media scanning availability는 별도 beta/GA를 확인한다.

Media set scanning은 기존 scan에서 resource type을 별도로 선택하고 OCR 또는 audio transcription으로 text를 얻어 regex match를 평가한다. 2025년 9월 GA 안내는 비용 때문에 one-time 또는 daily/weekly/monthly recurring을 권장했다. 추출/인식 누락 가능성과 탐지 뒤 marking/Cipher 적용을 별도로 확인한다. Scan 결과 자체가 sensitive media의 접근권을 자동 수정하는 계약은 아니다.

Peer Manager는 Control Panel에서 만든 enrollment 간 peer 관계 아래 connection/job health와 object property mapping을 관리하는 UI다. 2025년 9월 beta는 object와 Object Explorer object set을 다뤘고 Artifact peering 설정은 후속 계획이었다. 관계 생성, resource/property 선택과 실제 peering job 성공은 각각 확인한다.

Machinery widget는 parent root object에서 configured link를 따라 subprocess set을 만들고 current/historical count/duration을 비교한다. 2025년 11월 v2는 non-conforming object를 기본 분석에서 제거할 수 있어 deviation을 명시적으로 포함/격리해야 전체 입력의 문제를 볼 수 있었다. Path frequency와 duration bucket의 output Object Set은 탐색 조건이며 metric 변화 자체가 process 개선의 인과 증거는 아니다.

Peer Manager의 2025년 11월 GA는 object/link 동기화와 connection 생성/관측을 확장했다. 9월 beta의 Control Panel 중심 설정과 UI가 달라도 export/import property, peer job health와 target 접근을 따로 확인하는 경계는 유지한다. Artifact 설정은 당시에도 후속 계획이었다.

Checkpoint record의 combined/multi-select filter를 URL로 공유해도 해당 record의 열람권이 부여되지는 않는다. 2025년 12월에는 time을 제외한 multi-select와 모든 filter 조합을 제공했고 SDK 조회는 후속 계획이었다. Workflow Lineage의 bulk submission criteria 변경은 여러 Action의 실행 인가를 실제로 바꾸므로 그래프의 시각적 탐색과 구분해 변경 대상을 검토한다.

SDS의 Obfuscate Data match action은 Cipher channel과 Admin license로 encrypt/hash한 **새 output dataset**을 만든다. 2026년 2월에는 AES-SIV deterministic, AES-GCM-SIV probabilistic와 SHA256/SHA512를 지원하고 기본 전체 column, 전체 row, matched cell 또는 matched segment를 선택했다. 새 output 생성은 원 source 삭제와 다르며 encryption과 hashing의 복원/연결 가능성도 다르다. Key/license와 output 접근을 함께 검토한다.

Promoted resource는 search/picker에서 강조하는 발견 상태다. 2026년 2월 기본 Editor가 지정하되 space에서 Resource Curator를 제한하면 Editor와 Curator가 모두 필요했다. 중요도를 높이는 상태와 데이터 품질 인증, 접근권 부여는 다르다.

SDS language-model match condition은 content/column name, AND/OR 조합과 positive/counterexample로 분류 기준을 구성한다. 2026년 9월 media는 vision model의 image 직접 분류와 text model의 추출문 분류를 구분했다. Regex로 표현하기 어려운 탐지 경로지만 model 판정을 완전한 누락 방지로 취급하지 않고 대표 오류와 후속 Match Action을 평가한다.

2026년 9월 certification 체계는 Foundation/Associate의 timed multiple-choice와 Specialist의 실제 환경 hands-on을 구분했다. Associate의 2년 validity와 AI Engineer의 specialist escalation 인지 범위는 해당 공지 시점 조건이다. Course 완료, exam 통과와 특정 production 업무의 숙련/권한은 각각 다른 증거다.

## 출처

- [Palantir, October 2022 announcements](https://www.palantir.com/docs/foundry/announcements/2022-10)
- [Palantir, December 2022 announcements](https://www.palantir.com/docs/foundry/announcements/2022-12)
- [Palantir, January 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-01)
- [Palantir, February 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-02)
- [Palantir, March 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-03)
- [Palantir, April 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-04)
- [Palantir, May 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-05)
- [Palantir, June 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-06)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10)
- [Palantir, November 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-11)
- [Palantir, December 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-12)
- [Palantir, January 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-01)
- [Palantir, February 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-02)
- [Palantir, March 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-03)
- [Palantir, April 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-04)
- [Palantir, May 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-05)
- [Palantir, June 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-06)
- [Palantir, July 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-07)
- [Palantir, August 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-08)
- [Palantir, September 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-09)
- [Palantir, October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10)
- [Palantir, November 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-11)
- [Palantir, December 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-12)
- [Palantir, January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04)
- [Palantir, May 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-05)
- [Palantir, June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06)
- [Palantir, July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, December 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-12)
- [Palantir, February 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-02)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)

## 관련 문서

- [[Palantir-Organization-and-Session-Controls|현재 session과 조직 설정]]
- [[Palantir-Action-Observability-and-Recovery|Action 기록과 복구]]
- [[Palantir-Action-External-Effects|외부 효과]]
- [[Palantir-Analytics-Reuse-and-Migration|분석 재사용과 이전]]
