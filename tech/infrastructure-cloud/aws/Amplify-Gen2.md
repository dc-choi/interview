---
tags: [aws, amplify, serverless, authorization, cdk]
status: done
verified_at: 2026-10-26
category: "Infrastructure - AWS"
aliases: ["AWS Amplify Gen 2", "Amplify 백엔드와 샌드박스"]
---

# Amplify Gen 2: 백엔드 정의, 환경 격리와 파일 권한

Amplify Gen 2는 TypeScript로 백엔드 리소스를 정의하고 프론트엔드에서 연결하도록 돕는 개발 도구다. 리소스 정의, 클라이언트 연결 설정, 실제 접근 권한은 따로 확인한다.

## 백엔드와 프론트엔드의 연결

- `amplify/auth/resource.ts`, `amplify/data/resource.ts`처럼 기능별로 리소스를 정의하고 `amplify/backend.ts`의 `defineBackend`에서 묶는다. 저장소와 함수도 필요한 기능에 맞춰 추가한다.
- CLI가 만드는 `amplify_outputs.json`에는 Data 엔드포인트와 Auth 메타데이터 같은 클라이언트 연결 설정이 들어간다. 프론트엔드는 `Amplify.configure(outputs)`로 이 설정을 사용한다.
- sandbox 실행과 Amplify CI/CD에서 outputs가 생성된다. CI/CD에서는 앱 ID와 Git 브랜치에 맞는 설정을 만들므로 배포 대상과 연결할 백엔드를 함께 확인한다.
- 사용자 정의 출력은 `backend.addOutput`으로 추가할 수 있지만 Amplify가 관리하는 설정을 덮어쓰는 방식은 지원하지 않는다.
- 프론트엔드의 Data 요청은 `aws-amplify/data`의 `generateClient<Schema>()`로 만든 타입 지정 클라이언트로 보낸다. 기본 인가 모드는 배포 뒤 생성되는 `amplify_outputs.json`에 들어 있고, 다른 모드는 `generateClient({ authMode })`로 클라이언트를 따로 만들거나 요청마다 `authMode`를 지정한다.

설정 파일에 버킷 이름을 적는 것과 그 버킷에 접근 권한을 주는 것은 별개다. 연결 정보만 맞는데 요청이 실패하면 인증 주체와 리소스 권한을 확인한다.

## cloud sandbox는 실제 클라우드 개발 환경이다

`npx ampx sandbox`는 AWS 계정에 CloudFormation 스택과 리소스를 만들고 `amplify/` 변경을 감지해 갱신한다. 개발자별로 분리할 수 있지만 로컬 에뮬레이터나 운영 환경으로 취급하지 않는다.

| 구분 | 확인할 점 |
|---|---|
| 용도 | 개발과 실험용이며 운영 워크로드용이 아니다 |
| 빠른 갱신 | 지원되는 변경에는 CDK hot swap을 사용한다 |
| 데이터 손실 경계 | sandbox에서 DynamoDB GSI를 수정하거나 삭제하면 테이블을 재생성할 수 있다. Cognito의 지원되지 않는 변경도 User Pool 재생성을 일으킬 수 있다 |
| 종료와 삭제 | `Ctrl+C`는 세션 종료다. 2026-10-26 sandbox features 문서는 리소스 삭제 방법으로 `Ctrl+C` 뒤 삭제 선택, `npx ampx sandbox delete`, 콘솔 삭제를 든다. secrets and environment vars 문서에 따라 환경을 지울 때 등록한 비밀값은 따로 지운다 |

위 재생성 규칙은 sandbox 문서의 개발 환경 동작이다. 운영 환경의 스키마 변경과 데이터 보존 절차에 그대로 적용하지 않는다. 삭제 전에는 보존할 데이터와 대상 환경을 확인한다.

Amplify Hosting의 fullstack branch deployment는 브랜치별 환경을 구성하는 경로다. 개발자 개인 sandbox와 브랜치 배포 환경을 구분하고, 테스트 클라이언트가 운영 outputs를 읽지 않는지 확인한다.

## 비밀값은 환경마다 따로 등록한다

2026-10-26 공식 문서 기준. 외부 로그인의 client ID와 client secret처럼 코드에 넣지 않을 값은 `secret('GOOGLE_CLIENT_ID')`처럼 이름으로 참조한다. sandbox features 문서는 `secret()`을 백엔드 정의의 특정 위치에서만 쓸 수 있다고 하고 외부 로그인 공급자 설정과 함수 비밀값을 예로 들며, `secret()`은 값을 읽어 오지 않고 값은 백엔드를 배포할 때 해석된다고 설명한다. 함수 비밀값은 함수 설정에 저장되지 않고 함수가 실행될 때 가져와 메모리로 제공된다(함수의 환경 변수와 비밀값 문서).

| 환경 | 등록 방법 | 저장 위치와 주의점 |
|---|---|---|
| cloud sandbox | `npx ampx sandbox secret set <이름>` | Parameter Store의 `/amplify` 아래에 저장되고 Amplify 콘솔에는 보이지 않는다. named sandbox는 `--identifier`로 지정한다 |
| 브랜치 배포 | Amplify 콘솔의 비밀값 관리 | 모든 브랜치 공용 값은 `/amplify/shared/<app-id>/<secret-key>`, 특정 브랜치 값은 `/amplify/<app-id>/<branchname>-branch-<unique-hash>/<secret-key>`에 저장된다 |

sandbox에 등록한 값이 있어도 브랜치 환경의 값은 콘솔에서 따로 만든다. Amplify 콘솔의 환경 변수 값은 빌드 산출물에 평문으로 남으므로 비밀값을 넣지 않는다.

## 인증을 운영에 올리기 전 바꿀 설정

외부 로그인의 공식 예시는 `callbackUrls`와 `logoutUrls`에 로컬 개발 주소와 배포 도메인을 함께 등록한다. 예시처럼 고정 배열로 두면 같은 코드를 배포하는 sandbox와 브랜치 환경에 같은 URL 목록이 배포되므로(분석), 운영 환경에 로컬 주소를 남길지는 따로 판단한다(운영 제안). 로그아웃 URL을 여러 개 등록했을 때 Amplify `signOut`의 `oauth.redirectUrl`을 넘기면 등록한 URL 중 하나와 맞아야 하고, 넘기지 않으면 현재 앱 도메인을 기준으로 고른다.

기본 상태의 Cognito 메일과 SMS 발송은 운영 부하를 처리하도록 만든 구성이 아니다. 운영 전에 `defineAuth`의 `senders.email.fromEmail`에 Amazon SES에서 검증한 발신 주소를 지정하고, SMS로 인증 코드를 보내면 origination number를 요청하며 계정이 SMS sandbox에 있으면 수신 번호도 등록한다. 기본 발송 한도와 SES sandbox 해제는 [[Cognito#운영 설정 — 가입 공개, 메일 발송, 앱 클라이언트|Cognito의 메일 발송 경로]]를 따른다.

## Storage 권한은 경로와 주체를 함께 정한다

`defineStorage`의 `access`에서 허용하지 않은 경로는 기본적으로 접근을 거부한다. 게스트가 기본으로 읽을 수 있는 것은 아니다.

| 권한 대상 | 의미와 주의점 |
|---|---|
| `allow.guest` | 로그인하지 않은 사용자에게 명시적으로 허용할 작업 |
| `allow.authenticated` | 인증된 사용자에게 허용할 작업. 로그인만으로 파일 소유자를 구분하지 않는다 |
| `allow.groups` | 지정 그룹의 권한. 그룹 역할을 쓰는 사용자는 authenticated 역할 권한이 그대로 적용된다고 가정하지 않는다 |
| `allow.entity('identity')` | `{entity_id}` 경로와 Identity Pool 식별자를 연결해 사용자별 파일 접근을 제한한다 |
| `allow.resource` | 이미지 처리 같은 백엔드 함수에 파일 접근을 허용한다 |

`media/{entity_id}/*`에 소유자 권한을 주는 규칙과 같은 경로에 guest 또는 authenticated 규칙을 주는 경우를 구분한다. 후자의 규칙에서는 `{entity_id}`가 와일드카드로 취급되어 다른 사용자의 파일에도 해당 작업을 허용할 수 있다. 읽기 공개와 쓰기, 삭제 권한을 각각 검토한다.

검증 예시는 다른 사용자 파일에 대한 읽기, 쓰기와 삭제 요청이다. UI에서 버튼을 숨기는 것만으로 권한 검증을 끝내지 않는다.

## Data 권한은 로그인 여부와 소유권을 나눈다

2026-10-23 공식 Data 권한 문서 기준. `.authorization()`에서 허용하지 않은 접근은 기본 거부한다. `allow.authenticated()`는 로그인한 사용자에게 접근을 허용하며, `allow.owner()`처럼 레코드 소유자로 범위를 좁히지 않는다. `allow.publicApiKey()`도 사용자별 소유권 검증이 아니다.

여러 규칙은 OR로 결합한다. 소유자 규칙 옆에 모든 로그인 사용자의 쓰기를 허용하면 소유자 제한이 강화되는 것이 아니다. 공개 읽기와 소유자 쓰기를 조합하려면 공개 규칙의 작업을 `.to(['read'])`처럼 제한한다.

공개 데이터 경로는 둘이다. `allow.publicApiKey()`는 AppSync API 키를 가진 누구에게나 접근을 허용하고(`authMode: 'apiKey'`), `allow.guest()`는 Cognito Identity Pool의 미인증 역할로 접근을 허용한다(`authMode: 'identityPool'`). 2026-10-26 확인한 공식 권한 문서는 운영 환경의 공개 데이터 접근에 `guest`를 권장하며, 클라이언트는 규칙에 대응하는 인가 모드로 요청해야 한다. API 키는 클라이언트 설정인 `amplify_outputs.json`에 담겨 배포되므로 접근 경계로 보지 않고 사실상 공개 경로로 다룬다(분석).

2026-10-26 확인한 Public data access 문서 기준, API 키의 만료일은 앱을 배포한 날로부터 `apiKeyAuthorizationMode.expiresInDays`일 뒤로 정해지고, 만료 전에 다시 배포하면 연장된다. 배포 간격이 만료 기간보다 길 수 있으면 만료일을 운영 일정에 넣는다(운영 제안). 만료되거나 노출되거나 삭제된 키는 `amplify/backend.ts`에서 API 키 리소스의 logical ID를 덮어써 배포한 뒤, 덮어쓰기를 지우고 다시 배포하는 두 번의 배포로 새 키를 만든다.

필드에 별도 권한을 정의하면 그 필드는 모델 권한을 상속하지 않고 필드 규칙을 적용한다. 같은 모델에서 일반 필드는 공개하되 민감 필드는 소유자에게만 허용하는 구성이 가능하다. custom query나 mutation 같은 non-model 타입에는 동적 owner 규칙을 그대로 적용할 수 없다.

운영 검증에서는 다른 사용자의 레코드 수정, 민감 필드 조회와 각 `authMode`를 따로 시험한다. 이 규칙 검토와 별도로 관리자 또는 기계 간 접근을 허용하는 IAM 정책도 확인한다. Amplify Gen 2 Data는 IAM 인가를 활성화하므로 클라이언트의 owner 규칙만 보고 모든 접근 경로를 판단하지 않는다.

## CDK로 확장하거나 덮어쓸 때의 경계

2026-10-26 공식 문서 기준. Amplify 앱에 사용자 정의 AWS 리소스를 더할 때는 AWS CDK construct를 쓴다. `backend.createStack('MyCustomResources')`는 그 리소스를 둘 CloudFormation 스택을 새로 만들고, CDK로 정의한 인프라는 Amplify 백엔드와 함께 배포된다. 추가한 리소스의 보안과 모범 사례 준수, Amplify가 만든 리소스와 함께 동작하게 하는 일은 사용자 책임이다.

Amplify가 만든 리소스는 `amplify/backend.ts`의 `defineBackend` 호출 뒤에 `backend.auth.resources.userPool` 같은 L2 construct나 `resources.cfnResources`의 L1 construct로 덮어쓸 수 있다. 공식 문서는 덮어쓰기로 Amplify 라이브러리나 클라이언트 설정이 제대로 해석하지 못하는 백엔드가 생길 수 있다고 경고하고 staging 환경에서 먼저 시험하라고 안내한다. construct 수준별 검토 대상은 [[CDK-vs-Terraform#Construct 수준과 검증 범위|CDK construct 수준]]을 따른다.

## 과거 Pinpoint 예제의 적용 범위

2026-10-23 확인 기준, AWS는 Pinpoint의 endpoints, segments, campaigns, journeys와 analytics dashboard 같은 engagement 기능의 지원 종료일을 2026-10-30으로 안내한다. 과거 Analytics나 인앱 메시징 예제를 새 설계에 적용하기 전 전환 경로를 확인한다.

메시지 전송 기능 전체가 같은 날 사라진다는 뜻은 아니다. AWS End User Messaging으로 이어지는 채널과 계정별로 남는 API가 있으므로 기능별 지원표를 확인한다. 이벤트 수집과 모바일 분석에는 Kinesis, 이메일 전송에는 SES가 안내된다.

## 적용 판단

인증, 데이터와 파일 저장을 빠르게 연결해야 할 때 리소스 정의와 배포 구성을 함께 검토할 수 있다. 채택 여부는 기존 백엔드와의 책임 분담, 권한 모델, 환경별 비용과 데이터 보존 요구로 판단한다. 코드 작성량이 줄어도 접근 제어와 운영 검증은 남는다.

## 출처

- [AWS Amplify, Project structure](https://docs.amplify.aws/react/reference/project-structure/)
- [AWS Amplify, About amplify_outputs.json](https://docs.amplify.aws/react/reference/amplify_outputs/)
- [AWS Amplify, Use cloud sandbox in dev environment](https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/setup/)
- [AWS Amplify, Fullstack branch deployments](https://docs.amplify.aws/react/deploy-and-host/amplify-hosting/branch-deployments/)
- [AWS Amplify, Customize authorization rules](https://docs.amplify.aws/react/build-a-backend/storage/authorization/)
- [AWS Amplify, Customize your auth rules](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/)
- [AWS Amplify, Connect your app code to API](https://docs.amplify.aws/react/build-a-backend/data/connect-to-API/)
- [AWS Amplify, Public data access](https://docs.amplify.aws/react/build-a-backend/data/customize-authz/public-data-access/)
- [AWS Amplify, Sandbox features](https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/features/)
- [AWS Amplify, Secrets and environment vars](https://docs.amplify.aws/react/deploy-and-host/amplify-hosting/secrets-and-vars/)
- [AWS Amplify, Environment variables and secrets](https://docs.amplify.aws/react/build-a-backend/functions/environment-variables-and-secrets/)
- [AWS Amplify, External identity providers](https://docs.amplify.aws/react/build-a-backend/auth/concepts/external-identity-providers/)
- [AWS Amplify, Moving to production](https://docs.amplify.aws/react/build-a-backend/auth/moving-to-production/)
- [AWS Amplify, Custom resources](https://docs.amplify.aws/react/build-a-backend/add-aws-services/custom-resources/)
- [AWS Amplify, Overriding resources](https://docs.amplify.aws/react/build-a-backend/add-aws-services/overriding-resources/)
- [AWS, Amazon Pinpoint end of support](https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html)

## 관련 문서

- [[Cognito|Cognito 인증과 자격 증명]]
- [[S3-File-Upload|S3 파일 업로드와 권한]]
- [[CloudFormation|CloudFormation 스택 관리]]
- [[AWS-Lambda|Lambda 실행과 운영]]
- [[CDK-vs-Terraform|CDK vs Terraform]]
