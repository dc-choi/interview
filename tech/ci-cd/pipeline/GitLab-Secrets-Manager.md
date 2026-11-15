---
tags: [cicd, gitlab, secrets, security, openbao]
status: done
verified_at: 2026-11-15
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitLab Secrets Manager", "GitLab 시크릿 매니저", "gitlab_secrets_manager"]
---

# GitLab Secrets Manager

GitLab Secrets Manager는 CI/CD job이 쓰는 시크릿을 GitLab 안에 저장하고, job이 명시적으로 요청할 때만 꺼내 주는 기능이다. 저장소는 OpenBao이며 GitLab의 역할과 감사 체계 위에 시크릿별 권한 규칙을 둔다. 아래 상태, 등급, 한도와 권한은 2026-11-15에 확인한 GitLab 공식 문서 기준이다. 기본 브랜치 문서에는 확인일 기준 출시 전(Upcoming release)인 19.6 변경분이 섞여 있으므로, 19.5 버전 문서와 다른 항목은 버전을 함께 적었다. 19.6 서술은 출시 전에 바뀔 수 있다.

## 상태와 도입 조건

- 19.5에서 GA가 됐다. 18.3에 feature flag 뒤에서 처음 들어왔고, 18.8 closed beta, 18.10 그룹 시크릿 추가, 19.0 public beta, 19.3 GitLab.com limited availability를 거쳤다. `secrets_manager`와 `group_secrets_manager` feature flag는 19.5에서 제거됐다.
- Premium과 Ultimate 등급에서 GitLab.com과 Self-Managed로 제공된다. 문서의 제공 형태 목록에 Dedicated는 없다.
- GitLab Credits를 소비한다. GitLab.com에서는 최상위 그룹 Owner가 GitLab Credits나 30일 trial로 켜면 하위 그룹과 프로젝트가 모두 쓸 수 있다. Self-Managed에서는 OpenBao를 먼저 설치하고 구성한 뒤 관리자가 인스턴스 단위로 켠다. 오프라인 인스턴스는 trial과 Credits 활성화를 쓸 수 없고, 라이선스에 Secrets Manager가 포함되어야 켤 수 있다.
- GA 범위는 CI/CD job의 시크릿 사용이다. Kubernetes나 Terraform 같은 외부 도구가 Secrets Manager API로 값을 읽는 경로는 Beta이며, 19.2에 기본 비활성 feature flag(`secrets_manager_api_access`)로 들어왔고 값 조회 권한을 요구한다.
- job을 실행하는 GitLab Runner는 19.0 이상이어야 한다.

## CI/CD 변수와 무엇이 다른가

CI/CD 변수는 기본적으로 모든 job에 노출되지만, Secrets Manager의 시크릿은 job이 `secrets` 키워드로 요청해야만 받는다. 시크릿이 필요한 job만 그 값을 갖게 되므로 노출 범위가 job 단위로 좁아진다. 마스킹 변수와 달리 공백과 줄바꿈이 있는 값도 저장할 수 있어 인증서나 키 파일을 그대로 넣을 수 있다.

```yaml
job:
  secrets:
    KUBE_CA_PEM:
      gitlab_secrets_manager:
        name: kube_cert
  script:
    - kubectl config set-cluster e2e --server="https://example.com" --certificate-authority="$KUBE_CA_PEM"
```

- 기본 전달 방식은 파일이다. 변수에는 값이 아니라 파일 경로가 들어간다. 값 자체를 변수로 받으려면 `file: false`를 준다.
- 그룹 시크릿은 `gitlab_secrets_manager` 아래 `source: group/<그룹 경로>`를 더해 가리킨다.
- job 로그에 값이 출력되면 `[MASKED]`로 가려진다. 마스킹은 로그 출력에 대한 보호일 뿐, 스크립트가 값을 외부로 보내거나 다른 산출물에 쓰는 것까지 막지는 않는다(설계 판단).

## 접근 범위

- 프로젝트 시크릿은 같은 프로젝트의 파이프라인만, 그룹 시크릿은 그 그룹 바로 아래나 하위 그룹 계층의 프로젝트 파이프라인만 읽을 수 있다.
- 환경 범위는 기본값이 전체(`*`)이고, 특정 환경이나 와일드카드 환경으로 좁힐 수 있다.
- 브랜치 범위는 프로젝트 시크릿에서만 정하며 특정 브랜치나 `*`를 포함한 와일드카드를 쓴다.
- 보호 브랜치 한정은 그룹 시크릿의 선택 옵션이며, 켜면 보호 브랜치에서 도는 파이프라인에만 시크릿을 내보낸다.
- 출시 전 19.6 문서 기준, job이 가리킨 `source` 그룹이 프로젝트의 그룹이나 그 상위 그룹이 아니면 그 시크릿을 쓰는 job만 실패하고 파이프라인은 그대로 만들어진다. 다른 그룹에 속한 fork의 파이프라인이 대표 사례다. 문서의 대응은 `source`를 바꾸거나 `rules`로 시크릿을 읽을 수 있는 프로젝트에서만 그 job을 실행하는 것이다. 외부 기여 MR에서는 배포 시크릿이 필요한 job을 원본 프로젝트 파이프라인에서만 돌도록 나누는 구성을 검토한다(설계 제안).

운영 환경 배포 키는 환경 범위를 운영 환경으로, 그룹 공용 키는 보호 브랜치 한정으로 좁혀야 범위 설정의 이점이 생긴다. 기본값인 전체 환경으로 두면 모든 환경의 job이 같은 시크릿을 요청할 수 있다(설계 제안).

## 권한과 감사

- 권한 규칙에서 고르는 범위는 메타데이터 조회, 값 조회, 쓰기, 삭제다. 19.5에서는 쓰기가 생성과 수정을 함께 묶은 하나의 범위이고, 출시 전 19.6 문서에서는 생성과 수정이 분리되어 수정 범위를 주려면 생성 범위도 함께 줘야 한다. 19.5에서도 Developer의 기본 권한은 메타데이터 조회와 생성이며 수정은 포함하지 않는다.
- 프로젝트 시크릿 권한은 Owner만 바꿀 수 있다. 그룹 시크릿의 권한 변경도 그룹 Owner 전용이며, 생성, 수정, 삭제는 Owner 기본값이고 Owner가 다른 역할이나 사용자에게 줄 수 있다. 값 조회는 어느 역할에도 기본으로 주어지지 않는다.
- 19.4부터 권한을 받는 주체로 그룹(`GROUP` 주체 유형)을 쓸 수 없고 사용자나 역할에 부여한다.
- UI에서 저장된 값을 다시 읽을 수 없다. 편집은 새 값으로 덮어쓰는 것만 가능하다.
- 시크릿의 생성, 수정, 삭제 감사 이벤트는 DB에 저장된다. 조회 이벤트는 CI/CD job이나 다른 워크로드가 OpenBao에서 값을 읽을 때 생기지만 DB에 저장되지 않으므로, 어떤 job이 읽었는지 남기려면 Ultimate 등급의 감사 이벤트 스트리밍으로 외부 저장소에 보내야 한다. Premium에서 조회 기록이 남는다고 가정하지 않는다.

역할별 기본 권한은 버전마다 바뀌었다. 도입할 인스턴스 버전의 권한 문서로 Developer와 Maintainer의 기본 범위를 다시 확인한다.

## 한도와 수명 주기

| 항목 | 기준 |
| --- | --- |
| 개수 | 프로젝트당 100개, 그룹당 500개(기본값). 하위 그룹과 프로젝트의 시크릿은 상위 그룹 한도에 포함되지 않는다 |
| 이름 | 범위 안에서 유일, 255자 이하, 영문자, 숫자와 밑줄만, 생성 뒤 변경 불가 |
| 값 | 10,000바이트 이하 |
| 교체 알림 | 선택, 최소 7일, 프로젝트 시크릿은 프로젝트 Owner에게 발송(그룹 시크릿의 수신자는 문서에 없음) |

- 프로젝트나 그룹을 삭제하거나 다른 네임스페이스로 이전하면 시크릿은 따라가지 않고 영구 삭제된다. 이전 전에 시크릿 목록과 원본 값을 다른 경로로 확보해 둔다.
- 기능을 끄면 시크릿은 남지만 시크릿을 요청하는 job은 실패한다.
- 이름을 바꿀 수 없으므로 이름에 환경이나 용도를 넣는 규칙을 처음에 정한다.

## 도입 판단

| 조건 | 선택 |
| --- | --- |
| GitLab만 쓰고 시크릿이 CI/CD job에서만 필요하다 | Secrets Manager로 job 단위 요청과 감사를 얻는다 |
| 런타임 애플리케이션, Kubernetes와 여러 CI 도구가 같은 시크릿을 쓴다 | 외부 도구 API 접근이 Beta이고 기본 비활성이므로, Vault나 클라우드 시크릿 저장소를 정본으로 두는 [[Secret-Management|중앙 시크릿 관리]]를 함께 검토한다 |
| Free 등급이나 Dedicated를 쓴다 | 확인일 기준 제공 대상이 아니므로 CI/CD 변수 보호 설정이나 외부 저장소를 쓴다 |

기존 CI/CD 변수에서 옮길 때는 시크릿으로 보이는 변수를 찾아 옮기고, job마다 `secrets` 요청을 더한 뒤 원래 변수를 지운다. 변수를 남겨 두면 모든 job에 노출되는 경로가 그대로 남는다(설계 제안, 공식 문서에는 이전 절차가 없고 커뮤니티 점검 도구만 연결되어 있다).

## 체크포인트

- 시크릿이 필요한 job만 `secrets`로 요청하는가
- 운영 시크릿의 환경 범위와 보호 브랜치 한정을 기본값에서 좁혔는가
- 다른 그룹에 속한 fork의 파이프라인에서 그룹 시크릿을 쓰는 job이 실행되지 않도록 `rules`를 두었는가
- 조회 감사가 필요하면 감사 이벤트 스트리밍을 설정했는가
- 프로젝트 이전 전에 시크릿을 따로 확보하는 절차가 있는가
- 마스킹을 유출 방지 수단 전체로 보고 있지 않은가

## 출처

- [GitLab Docs, GitLab Secrets Manager](https://docs.gitlab.com/ci/secrets/secrets_manager/)
- [GitLab Docs 19.5, GitLab Secrets Manager](https://docs.gitlab.com/19.5/ci/secrets/secrets_manager/)
- [GitLab Docs, Access secrets from external tools](https://docs.gitlab.com/ci/secrets/secrets_manager/external-tools/)
- [GitLab Docs, Roles and permissions](https://docs.gitlab.com/user/permissions/)
- [GitLab Docs, Audit event types](https://docs.gitlab.com/user/compliance/audit_event_types/)

## 관련 문서

- [[Secret-Management|시크릿 관리]]
- [[GitLab-Duo-Agent-Platform|GitLab Duo Agent Platform]]
- [[GitLab-Security-Policies|GitLab 보안 정책]]
- [[CICD-Pipeline|CI 파이프라인 구현]]
