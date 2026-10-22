---
tags: [aws, amplify, serverless, authorization]
status: done
verified_at: 2026-10-23
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

설정 파일에 버킷 이름을 적는 것과 그 버킷에 접근 권한을 주는 것은 별개다. 연결 정보만 맞는데 요청이 실패하면 인증 주체와 리소스 권한을 확인한다.

## cloud sandbox는 실제 클라우드 개발 환경이다

`npx ampx sandbox`는 AWS 계정에 CloudFormation 스택과 리소스를 만들고 `amplify/` 변경을 감지해 갱신한다. 개발자별로 분리할 수 있지만 로컬 에뮬레이터나 운영 환경으로 취급하지 않는다.

| 구분 | 확인할 점 |
|---|---|
| 용도 | 개발과 실험용이며 운영 워크로드용이 아니다 |
| 빠른 갱신 | 지원되는 변경에는 CDK hot swap을 사용한다 |
| 데이터 손실 경계 | sandbox에서 DynamoDB GSI를 수정하거나 삭제하면 테이블을 재생성할 수 있다. Cognito의 지원되지 않는 변경도 User Pool 재생성을 일으킬 수 있다 |
| 종료와 삭제 | `Ctrl+C`는 세션 종료다. 리소스 제거는 `npx ampx sandbox delete`로 별도 수행한다 |

위 재생성 규칙은 sandbox 문서의 개발 환경 동작이다. 운영 환경의 스키마 변경과 데이터 보존 절차에 그대로 적용하지 않는다. 삭제 전에는 보존할 데이터와 대상 환경을 확인한다.

Amplify Hosting의 fullstack branch deployment는 브랜치별 환경을 구성하는 경로다. 개발자 개인 sandbox와 브랜치 배포 환경을 구분하고, 테스트 클라이언트가 운영 outputs를 읽지 않는지 확인한다.

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

필드에 별도 권한을 정의하면 그 필드는 모델 권한을 상속하지 않고 필드 규칙을 적용한다. 같은 모델에서 일반 필드는 공개하되 민감 필드는 소유자에게만 허용하는 구성이 가능하다. custom query나 mutation 같은 non-model 타입에는 동적 owner 규칙을 그대로 적용할 수 없다.

운영 검증에서는 다른 사용자의 레코드 수정, 민감 필드 조회와 각 `authMode`를 따로 시험한다. 이 규칙 검토와 별도로 관리자 또는 기계 간 접근을 허용하는 IAM 정책도 확인한다. Amplify Gen 2 Data는 IAM 인가를 활성화하므로 클라이언트의 owner 규칙만 보고 모든 접근 경로를 판단하지 않는다.

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
- [AWS, Amazon Pinpoint end of support](https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html)

## 관련 문서

- [[Cognito|Cognito 인증과 자격 증명]]
- [[S3-File-Upload|S3 파일 업로드와 권한]]
- [[CloudFormation|CloudFormation 스택 관리]]
- [[AWS-Lambda|Lambda 실행과 운영]]
