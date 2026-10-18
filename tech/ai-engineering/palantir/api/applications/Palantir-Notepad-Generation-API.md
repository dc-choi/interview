---
tags: [palantir, foundry, api, notepad, template, asynchronous]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Notepad 생성과 Export API"]
---

# Notepad 생성, 저장과 Export의 비동기 수명주기

Template은 content를 생성하는 자원이고 GenerationJob은 그 생성 실행이다. 생성 성공 후 새 Document로 저장하거나 ExportJob을 만들어 File로 받을 수 있다. 각각의 성공 단계와 임시 자원의 만료를 나누어 추적한다.

## 기본 실행 흐름

1. Template에 parameter를 적용해 GenerationJob RID를 받는다.
2. GenerationJob을 조회해 running/failed/succeeded를 확인한다.
3. 성공한 결과를 새 Document로 저장하거나 ExportJob의 source로 사용한다.
4. ExportJob을 조회해 성공하면 fileRid를 얻는다.
5. 별도 content endpoint로 binary 파일을 내려받는다.

기존 Document를 export할 때는 생성 단계를 생략한다. job 생성 요청의 성공이나 RID 획득은 생성/파일 export 완료와 다르다.

## Endpoint와 scope

모든 아래 endpoint는 Preview이며 `preview=true`가 필요하다. 공통 prefix는 `/api/v2/notepad`다.

| 작업 | Method와 나머지 경로 | operation scope |
|---|---|---|
| 생성 시작 | POST `/templates/{templateRid}/generate` | `api:notepad-write` |
| 생성 상태 조회 | GET `/templates/{templateRid}/generationJobs/{generationJobRid}` | `api:notepad-write` |
| 새 Document 저장 | POST `/templates/{templateRid}/generationJobs/{generationJobRid}/saveDocument` | `api:notepad-write` |
| Export 시작 | POST `/exportJobs/create` | `api:notepad-export` |
| Export 상태 조회 | GET `/exportJobs/{exportJobRid}` | `api:notepad-export` |
| 파일 다운로드 | GET `/files/{fileRid}/content` | `api:notepad-export` |

GenerationJob과 ExportJob은 생성한 사용자만 접근할 수 있다. ExportJob을 만들려면 source에 대한 export 권한도 필요하다. 다른 사용자 token으로 후속 polling을 인계하면 같은 scope만으로 접근할 수 있다고 가정하지 않는다.

## Template 버전과 parameter encoding

생성 요청에서 templateVersion을 생략하면 최신 published version을 사용한다. 지정한 버전이 없거나 published version이 전혀 없으면 InvalidGenerationJobTemplateVersion이다. 재현성이 필요하면 사용할 published version을 기록하는 방식을 검토한다.

parameter는 이름에서 tagged value로 매핑한다. 지원 variant는 objectSetRid, date, dateTime, string, double과 objectRid다. 일반 JSON scalar를 그대로 넘기는 것과 구조가 다르다.

- date는 date 문자열이다.
- dateTime은 Unix epoch 이후 millisecond의 timestamp와 IANA timezone을 함께 받는다.
- objectRid와 objectSetRid는 각 자원의 RID다.
- string/double은 각각 해당 variant의 value를 담는다.

dateTime timestamp와 templateVersion은 Long 문자열 형식의 schema다. 같은 페이지 예제는 templateVersion을 숫자로 표시하므로 wire 형식을 예제만으로 확정하지 않는다. IANA timezone은 Area/Location 형식이며 잘못된 zone은 InvalidTimezone이다. 필수 parameter 누락과 잘못된 parameter 타입은 서로 다른 오류다.

## 생성 성공과 영구 Document 저장

GenerationJob status는 running, failed와 succeeded union이다. 실패 variant에는 errorMessage가 있다. generation 성공 자체는 새 Document를 저장했다는 뜻이 아니다.

saveDocument는 성공한 GenerationJob에만 가능하고 parentFolderRid가 필수다. documentName을 생략하면 이름을 생성한다. 성공하면 새 documentRid를 반환한다.

running/failed job은 FailedPrecondition 오류로 저장/후속 export가 거부될 수 있다. 같은 폴더의 이름 충돌, FolderNotFound/InvalidFolder와 저장 권한 거부를 구분한다. 표시 이름은 `.` 또는 `..` 자체가 아니어야 하고 `/`를 포함할 수 없으며 최대 700자다.

## PDF Export와 binary 다운로드

CreateExportJob의 source는 기존 documentRid 또는 성공한 GenerationJob의 templateRid/generationJobRid다. 확인일 target union은 PDF를 제공한다. userLocale과 userTimezone을 지정해 export의 날짜/시간 표현을 결정한다. locale 검증 실패와 timezone 검증 실패는 따로 반환된다.

ExportJob은 RID와 status를 반환한다. running에서 polling을 이어가고 failed이면 errorMessage와 선택적 errorCode/errorInstanceId를 확인한다. succeeded이면 fileRid로 content를 내려받는다. 파일 content는 binary format이며 JSON 응답으로 강제 처리하지 않는다.

## 만료와 재시도 경계

GenerationJob은 생성 후 **1시간 이내**, ExportJob과 File은 **7일 이내** 사용해야 하는 임시 자원이다. 이후 NotFound는 자동 삭제 때문일 수 있다. 모든 job이 정확히 만료 시점까지 유지되거나 그 순간 즉시 삭제된다는 더 강한 보장은 이 설명에서 도출하지 않는다.

비동기 결과를 나중에 보관해야 한다면 성공한 content를 새 Document로 저장하거나 파일을 제때 내려받아야 한다. job RID만 장기 보관하는 것은 결과 보관과 다르다. 생성/Export 요청을 다시 보내면 같은 job을 재사용한다는 idempotency 보장이 이 명세에는 없으므로 상태 확인과 신규 job 생성을 구분한다.

공식 전체 schema와 기본 수명주기를 대조했으며 실제 생성, PDF 서식/시간대, 사용자 간 접근과 만료 처리는 시험하지 않았다.

## 출처

- [Palantir, Template basics](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/templates/template-basics)
- [Palantir, Generation Job basics](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/generation-jobs/generation-job-basics)
- [Palantir, Generate Template](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/templates/generate-template)
- [Palantir, Get Generation Job](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/generation-jobs/get-generation-job)
- [Palantir, Save Document Generation Job](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/generation-jobs/save-document-generation-job)
- [Palantir, Export Job basics](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/export-jobs/export-job-basics)
- [Palantir, Create Export Job](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/export-jobs/create-export-job)
- [Palantir, Get Export Job](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/export-jobs/get-export-job)
- [Palantir, File basics](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/files/file-basics)
- [Palantir, Content File](https://www.palantir.com/docs/foundry/api/notepad-v2-resources/files/content-file)

## 관련 문서

- [[Palantir-Application-APIs]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Website-Deployment-API]]
