---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 관리 UI와 운영 증거

아래는 2026년 하반기 릴리스 당시 변경을 합성한 기록이다. 실제 enrollment 적용과 현재 지원 범위는 해당 기능 문서로 확인한다.

## Scope와 결정적 비교

Control Panel global extension의 scope picker는 10월5일 숨김 변경 뒤 10월14일 enrollment/Organization/space 선택을 다시 표시하도록 수정됐다. 같은 달의 앞선 release만 읽으면 실제 context 변경 가능성을 놓칠 수 있다. Enrollment/Organization extension의 하위 picker 숨김과 구분한다.

Video configuration history는 stream ID와 detection URI로 대상을 맞춘 결정적 before/after diff를 제공한다. Explain diff는 Language Model Service가 있을 때 추가하는 AI 설명이며 기본 diff는 모델 없이 작동한다.

## 시각적 결함과 데이터 변경

Artifacts Debugger, external connection,3D landing,map tiles,Chat Bridge/Chat,Geotime,Browser,Dossier와 여러 configuration dialog/그룹 header에 dark theme 수정이 있었다. YAML/JSON/GeoJSON editor는 theme 변경 때 미저장 내용을 유지하고 map tile/legend 및 branding 이미지의 고유 색은 보존하도록 안내됐다. 색상 수정 자체를 설정 값이나 데이터 변경으로 간주하지 않는다.

## 권한과 식별자

Primary key는 수정 불가이므로 property create/modify policy target에서 제외하지만 object create/delete와 조건식에는 남을 수 있다. New dataset 생성 wizard는 reserved primaryKey 대신 unique-id/Unique Id/uniqueId를 만들고 이름/타입 변경 후 mapping을 유지하도록 수정됐다.

Peer Manager object type mapping은 export object-set filter를 지원한다. Action type의 Apply scenario rule filter와 Compute Module deployment log 공간 개선은 실제 policy/실행 결과와 구분한다.

## 사용량과 재시도

Object edits history 비용은 10월14일 이후 Object type/project의 별도 source로 귀속한다. 과거 usage는 소급 변경하지 않으므로 시점 전후 비용선을 비교할 때 attribution 차이를 고려한다.

Automate manual retry의 Include canceled는 기본 선택이며 canceled batch를 실제 포함하도록 수정됐다. 재시도 대상에 들어가는 것과 중복 effect 안전성은 별도 계약이다. Approvals 검색은 최소3글자 안내를 표시하므로 짧은 검색의 안내를 요청 부재로 오해하지 않는다.

## 9월 접근 검증과 관측 범위

Global log search GA는 cloud enrollment를 대상으로 graph의 모든 supported resource 또는 선택 node를 검색한다. Across selected resources는 합집합, Within selected call chain은 선택 resource 안의 호출 연쇄로 좁힌다. Marking/role/retention은 계속 적용되며 non-cloud는 single-source-executor 경계를 유지한다. Trained model과 map/template node 추가, function last-modified를 최신 publish 시각으로 표시하는 변경도 함께 해석한다.

Peer Manager는 mapping status별 구형 경로에서 object/link/symbol별 경로와 URL tab으로 이동했다. Job ID 검색은 filter reset과 독립적으로 유지한다. Symbol compatibility mapping, export eligibility와 object-set export filter preview는 실제 export 결과의 전수 보장과 다르다. Manual realm mode를 벗어나면 그 draft를 버리며 duplicate-producer/preferred-stack 선택의 유효 조합을 검증한다. Import/export sharing toggle의 checked는 allow를 뜻한다.

Group manager 변경 checkpoint,Insight load/Object Explorer search checkpoint와 membership-expiry 유형은 해당 rule이 구성돼야 작동한다. Tag/category role을 부여할 수 있게 됐으며 object policy의 stale Organization bypass 제거는 모든 listed marking Use 권한이 있어야 원자적으로 수행한다.

Searchable interface는9월75개 구현 type,non-searchable은1000개로 안내됐다. 상속 interface link constraint는 전체 chain을 평가하도록 고쳤다. Fully edit-only type의 edit-only PK는 dataset column 없이 지정 가능하나 dataset-backed/direct datasource 계약은 다르다.

Portfolio object-type filter는 dataset lookup 실패 시 전체 목록으로 fallback하지 않고 오류를 보인다. Symbol parameter의 필수/삭제 property/타입/media binding 오류는 저장을 막는다. Ontology SQL source의 worksheet version link와 datasource replacement graph 표시 수정은 실제 정의/이력 추적의 증거를 개선한다.

Retention approval은 추가/삭제 scope를 granular diff로 검토한다. Resource Management grouped source filter와 capacity request 버튼은 소비량 분석/요청 경로이며 limit 증가 승인은 아니다. Passkey browser-side 취소/중복/기타 오류, recovery 비활성/IdP migration 중 support link 숨김을 구분한다. 문서 callout/anchor 수정도 기능 변경 없이 가독성과 참조 정확성을 높인 변경이다.

Compass project/folder의 Cmd/Ctrl+I는 자원을 Workflow Lineage로 열어 탐색을 연결한다. Video stream의 Geotime integration은 space와 stream ID로 찾고, Action type class 변경은 저장 전 local draft로 남는다.

## 8월 관측, identity와 승인

Workflow Lineage execution count는 완료 실행 수이며 failure rate와 같은 time window를 공유한다. 8월 failure-rate mode는 기본4시간/최대1일,visible tab에서 약1분 갱신으로 발표됐고 No runs/No permission을 구분한다. 이후 더 넓은 metrics history와 혼용하지 않는다. Unsupported/nonexecuting node는 failure 색 대상이 아니다.

Object timeline의 total runtime은 첫 실행부터 마지막 실행까지의 경과이고 task time 합계가 아니다. 기다린 사람 입력과 agentic coverage,Action edit를 실행에 연결한다. Object Explorer 진입에는 edit history가 필요하다. 실패율과 automation coverage만으로 자동화의 업무 품질을 판단하지 않는다.

Peer file의 security code로 requirement별 access를 확인하고 local/remote granular policy를 나란히 비교한다. AI 설명은 결정적 diff를 대체하지 않는다. Checkpoint는principal/interaction RID filter와group/user 구분을 개선했다. SDS resource 제외는 configuration으로 이동해 staged 상태를 만들 뿐 저장 전 적용되지 않는다.

Authentication provider의 email domain matching은 어떤 IdP를 제시할지 정하는 옵션이며 platform access 거부 규칙이 아니다. 실제 제한은 Organization assignment rules로 구성한다. CSR의 incomplete certificate chain 오류와 일반 validation 실패를 구분한다.

Edit-only beta badge는 legacy user-input type에 붙지 않으며 direct datasource struct mapping의 valid type 변경과 실제 classification violation을 구분한다. Maximum classification 없는 project의 잘못된 차단은 고쳤지만 metadata/query 실패는 계속 차단한다. Symbol source 추가/link constraint navigation과 enum paste의 빈값/중복 제거도 입력 검토를 돕는다.

Compass bulk resource 열기는 unsupported 자원을 graph에서 제외한다. Bulk move는 이동/skip preview의 이유를 검토한다. Vertex 지원,Iceberg maintenance operation tag와 resource-access 색상은 실제 자원/작업 범위를 드러내며 documentation sample/editorial 수정은 runtime 변화와 구분한다.

## 7월 감사와 실패의 가시성

Observability Chart는 Action/function count/P95와 Compute Module replica CPU/memory를30일 범위로 조합한다. 실행 data가 없으면 empty이며 shared start/end variable로 chart를 함께 조정한다. Graph dashboard는 Data Health threshold/alert를 대체하지 않는다.

Autopilot resource Activity는 edit-history object의 create/delete/modify,property,user/execution을 연결한다. WFL permission debugging은 Action type 보기와 submission criteria,matching object policy를 조사한다. 시각적으로 일치하는 policy가 모든 사용자/parameter의 실행 권한을 증명하지는 않는다.

Peer unconditional deletion export는 삭제 후 granular security를 판단할 수 없을 때 쓰되 PK가 항상 안전하다는 전제가 필요하다. Producer override,realm/inverted remote mapping과 local type 생성은 상대의 schema/security를 검토한다. Export/import offset과 acknowledgement를 나눠 pending/failure/gap을 보고 reset/resend의 중복 영향을 평가한다.

Peer job은 직접 export,remote pull용 local staging,manual download용 local 저장을 구분한다. Payload/ack,sequential/concurrent,time filter로 조사하며 local 저장을 상대 적용 완료로 보지 않는다. Model live-deployment env 설정도 배포 상태와 별도로 확인한다.

Unsaved object type의 property-security test는 저장 전 차단하고 project-permission migration의 일부 folder marking 실패는 error로 표시하도록 고쳤다. Shared-property visibility는 underlying shared type이 소유해 interface inline edit에서 읽기 전용이다.

Folder lineage는 trashed resource를 제외하지만 기존 graph의 trashed node는 이름과 trash styling을 보일 수 있다. Cross-Ontology color/RID 검색,monitor/alert 진입과 Logic-backed node 변환은 탐색을 개선한다. Checkpoint language/text direction은 정책의 승인 의미를 바꾸지 않는다.

7월 Automate dataset condition과 Contour notification attachment는 별도 feature enable 없이 기본 제공으로 바뀌었다. Shared Property Types 이름 정렬은 display 편의이며 backing schema/권한을 바꾸지 않는다. Action isolated submission test는 Ontology를 바꾸지 않고 변경/side-effect 예정/읽는 자원과 시간을 보여 주는 진단이다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-H2-Platform-Evolution]]
