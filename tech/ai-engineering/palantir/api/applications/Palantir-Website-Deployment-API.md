---
tags: [palantir, foundry, api, osdk, deployment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Website 배포 API"]
---

# Website 버전 업로드와 배포 상태

Developer Console 애플리케이션의 Website 배포는 artifact version 관리와 현재 제공 중인 버전 변경을 구분한다. ZIP 업로드 성공이 서비스 중인 Website의 전환을 의미하지 않는다.

## 자원과 공통 scope

모든 endpoint는 thirdPartyApplicationRid로 대상 앱을 지정한다. 여기서 version은 Website의 semantic version 문자열이다. 아래 일곱 endpoint는 조회도 포함해 OAuth2 scope `third-party-application:deploy-application-website`를 명시한다. 조회용 scope가 별도로 있을 것이라고 이름만으로 추정하지 않는다. 실제 접근 권한과 앱의 자원 제한도 적용한다.

경로의 공통 prefix는 `/api/v2/thirdPartyApplications/{thirdPartyApplicationRid}/website`다.

| 작업 | Method와 나머지 경로 | 입력과 반환 |
|---|---|---|
| 버전 업로드 | POST `/versions/upload` | 필수 version query와 ZIP binary body, version 객체 반환 |
| 버전 조회 | GET `/versions/{versionVersion}` | 버전 문자열을 path로 지정, version 객체 반환 |
| 버전 목록 | GET `/versions` | pageSize/pageToken, version 목록과 nextPageToken 반환 |
| 버전 삭제 | DELETE `/versions/{versionVersion}` | 해당 version 지정, response body 없음 |
| 배포 | POST `/deploy` | JSON body의 필수 version, Website 상태 반환 |
| 현재 Website 조회 | GET prefix 자체 | Website 상태 반환 |
| 배포 해제 | POST `/undeploy` | request body 없음, Website 상태 반환 |

업로드 body는 애플리케이션 내용을 담은 ZIP 파일이며 JSON 문자열로 감싸는 요청이 아니다. 버전 업로드의 version은 query parameter, 배포할 version은 JSON body field이므로 두 호출의 입력 위치를 구분한다.

## 업로드, 활성화와 제거의 경계

업로드/버전 조회의 응답은 version 문자열을 담는다. 이 계약만으로 artifact checksum, 파일 내용의 검증이나 런타임 동작을 증명하지 않는다.

Website 응답은 선택적 `deployedVersion`과 `subdomains`를 담는다. 배포 요청이 반환한 version과 실제 제공되는 subdomain을 후속 조회로 함께 확인하는 방식으로 운영 상태를 점검할 수 있다. 이는 API 계약을 적용한 점검이며 배포 완료의 외부 가용성을 자동으로 시험해 준다는 뜻은 아니다.

`undeploy`는 현재 제공 중인 배포를 제거하는 작업이다. `deleteVersion`은 보관된 version을 대상으로 하는 별도 작업이다. 배포 해제가 버전 목록 전체 삭제까지 수행한다고 해석하지 않는다. 배포된 version의 삭제 허용 여부나 rollback 원자성은 이 endpoint 설명만으로 확정할 수 없다.

## 페이지와 오류

버전 목록은 실제 반환 크기가 요청 pageSize와 다를 수 있다. nextPageToken이 있으면 이어가며 없으면 종료한다. 일반 인증, token 수명, throttling과 버전 계약은 [[Palantir-API-Client-Contract]]를 따른다.

- VersionNotFound는 앱 RID와 versionVersion 문맥을 제공한다.
- WebsiteNotFound는 앱 RID 문맥을 제공한다.
- UploadVersion, DeleteVersion, DeployWebsite와 UndeployWebsite의 PermissionDenied를 작업별로 구분한다.
- 명세의 errorResponses 목록이 비어 있다는 사실을 해당 요청이 실패하지 않는다는 보장으로 취급하지 않는다.

이 문서는 공식 일곱 endpoint의 전체 요청/응답과 오류 schema를 대조한 기록이다. 실제 ZIP 업로드, 배포 전환, 해제와 삭제는 수행하지 않았다.

## 출처

- [Palantir, version-basics](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/versions/version-basics)

- [Palantir, website-basics](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/websites/website-basics)

- [Palantir, Upload Version](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/versions/upload-version)
- [Palantir, Get Version](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/versions/get-version)
- [Palantir, List Versions](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/versions/list-versions)
- [Palantir, Delete Version](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/versions/delete-version)
- [Palantir, Deploy Website](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/websites/deploy-website)
- [Palantir, Get Website](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/websites/get-website)
- [Palantir, Undeploy Website](https://www.palantir.com/docs/foundry/api/third-party-applications-v2-resources/websites/undeploy-website)

## 관련 문서

- [[Palantir-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-SDK-and-Agent-Tools]]
