---
tags: [palantir, checkpoints, governance, audit]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Checkpoint scope와 justification 기록"]
---

# Checkpoint scope와 justification 근거

Checkpoint는 민감한 interaction에 사용자 목적/정당화 입력을 요구하고 이후 검토할 record를 남기는 기능이다. Configuration은 언제 누구에게 무엇을 묻는지 정하고 record는 실제 제시한 문구, 응답, 시각, 사용자와 연관 resource를 보존한다. 정당화를 입력한 사실은 활동의 적법성이나 조직 정책 준수를 자동 증명하지 않는다.

## Organization과 Space scope는 대상이 다르다

Organization scope는 그 조직 member에게 적용하며 guest는 제외한다. 설정에는 해당 organization의 Data governance officer가 필요하다. Space scope는 사용자의 조직과 무관하게 그 space의 resource interaction에 적용한다. Login처럼 resource space가 없는 유형에는 사용할 수 없다.

Space 설정은 Administer resource-scoped checkpoint configurations operation을 요구한다. Location matcher가 특정 resource를 가리키면 그 resource Owner 또는 scope Space Administrator, matcher가 없으면 Space Administrator가 필요하다. 단순 workspace viewer/editor와 구분한다.

유형을 여러 개 선택하면 공통으로 지원하는 condition만 쓸 수 있다. Location(resource/Project/space), 행위 사용자/group, 선택된 사용자/group, Marking, Action type과 object-set matcher를 조합한다. Object-set matcher는 type/type group/Ontology/datasource 위치/Marking/저장 exploration 또는 list를 기준으로 한다.

AND matcher는 범위를 좁히고 NOT exemption은 예외를 만든다. Matcher type당 하나를 지정하지만 exemption의 여러 대상은 허용한다. Acting user와 추가/삭제 대상으로 선택한 user/group을 혼동하지 않는다.

## Checkpoint type은 실제 entry point를 따른다

다운로드에는 Compass/frontend/object set, app-specific export, log/attachment/media/model/API metadata와 usage export 등이 별도로 있다. Contour pivot export는 Contour export가 아니라 frontend export다. Code Workspace로 data를 가져가는 Import dataset은 Export to Code Workspace이며 Save to dataset은 Import from Code Workspace다. 화면의 import/export 단어보다 데이터 이동 방향을 따른다.

관리 동작에는 membership/expiry, role/Marking/reference 변경, OAuth secret 회전, token 생성과 Cipher encrypt/decrypt가 있다. Build/merge/approval policy/deploy/schedule/retention 등도 개별 유형이며 app 활성화에 따라 제공 여부가 다르다. 한 export checkpoint가 모든 경로를 포괄한다고 가정하지 않는다.

Submit action은 Workshop/Object View/Explorer/Vertex 등 사용자의 UI 직접 제출에 적용한다. Automate 비동기 제출, API 또는 OSDK 적용에는 해당 checkpoint가 적용되지 않는다. Form이 있으면 required field로, inline edit처럼 form이 없으면 별도 dialog로 제시된다. 무인 실행의 권한/감사/승인은 별도 설계한다.

Login checkpoint는 Checkpoints Login AUM을 먼저 활성화해야 한다. Legacy source share, Hubble export와 package static dataset은 새 configuration을 만들 수 없는 범위다. 과거 record는 남고 Hubble export configuration은 Object set export로 이전되었다.

## 입력 형식과 재확인 빈도

Prompt title/prompt는 필수이며 description은 선택이다. Prompt/description은 Markdown을 지원한다. Configuration의 관리용 이름/설명은 사용자가 보는 문구와 다르다.

Acknowledgment checkbox, free text(regex validation), dropdown(단일/복수, 선택적/필수 free text), IdP reauthentication을 고를 수 있다. Regex가 없으면 free text는 임의 응답을 허용하므로 업무적으로 충분한 이유인지 검토는 남는다. Reauthentication은 Login/Scoped session select에 사용할 수 없다.

Response/Dropdown은 지난 한 달 같은 configuration의 최근 5개 free-text 이유를 자동 채울 수 있다. 과거 이유를 골랐다는 사실은 현재 목적도 같다는 보장이 아니다. Frequency 설정은 Login 유형에만 제공되며 나머지는 조건을 만족하는 매 interaction이 기본이다.

## Record는 당시 화면과 접근 범위를 보존한다

Record의 checkpoint language는 configuration 수정/삭제 뒤에도 당시 문구를 유지한다. Action type, 당시 Ontology version과 checkpoint/configuration RID로 활동을 연결한다. Space filter는 record 생성 당시 resource 위치를 따른다.

본인 record는 본인이 볼 수 있다. 타인 record는 resource의 Review records by resource operation, Space Administrator 또는 조직 Data governance officer 등의 경로를 따른다. Resource review operation은 기본 role set에 자동 부여되지 않으므로 custom role 구성이 필요할 수 있다.

연관 resource/user는 viewer 권한에 따라 redaction되고 발견할 수 없는 조직 사용자의 record는 표시되지 않는다. 빈 review 결과를 활동 없음으로 단정하지 않는다. Org/space/type/user/resource/time filter와 본인의 권한을 먼저 확인한다.

## Marketplace는 설치 scope로 재구성한다

Packaged configuration은 설치 위치의 Space scope와 installation input/포함 resource/Project location matcher로 제한된다. Space/location matcher를 지원하는 단일 checkpoint type이어야 한다. 특정 개인만 지정한 submitting-user condition, Marking matcher와 space를 직접 지정한 location matcher는 packaging할 수 없다. 원래 조직 scope가 설치 후에도 그대로 전파된다고 가정하지 않는다.

## 출처

- [Palantir, Checkpoints](https://www.palantir.com/docs/foundry/checkpoints)
- [Palantir, Checkpoint core concepts](https://www.palantir.com/docs/foundry/checkpoints/core-concepts)
- [Palantir, Checkpoint types](https://www.palantir.com/docs/foundry/checkpoints/checkpoint-types)
- [Palantir, Configure checkpoints](https://www.palantir.com/docs/foundry/checkpoints/configure-checkpoints)
- [Palantir, Review checkpoint records](https://www.palantir.com/docs/foundry/checkpoints/review-checkpoint-records)
- [Palantir, Checkpoints in Marketplace](https://www.palantir.com/docs/foundry/checkpoints/checkpoints-marketplace)

## 관련 문서

- [[Palantir-Approval-Request-Lifecycle|승인과 justification]]
- [[Palantir-Cipher-Channels-and-Licenses|Cipher와 checkpoint bypass]]
- [[Palantir-Automate-Identity-and-History|무인 실행 identity]]
