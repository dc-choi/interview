---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Secret 수명주기와 소비

## secret 값과 metadata의 경계

Apollo secret은 하나 이상의 key/value를 가진다. Environment editor가 만들고 고치고 지울 수 있으며 Entity를 볼 수 있는 사용자는 이름, description과 key를 볼 수 있다. 민감하게 취급하는 것은 값이므로 key나 이름에 비밀을 넣지 않는다.

값은 제출 즉시 암호화되고 환경 안에서만 복호화할 수 있다. Hub에서는 권한과 무관하게 값을 다시 읽을 수 없다는 계약이다. 이를 위해 Hub가 실행 agent의 public key를 알고 있어야 하며 아직 모르면 생성/수정 요청이 실패할 수 있다.

secret 작업은 실제 환경의 Plan으로 실행하므로 maintenance window와 실행 진행을 확인한다. Entity command에도 pending secret 작업이 포함될 수 있다. 요청이 성공했다는 사실과 Pod에서 쓸 수 있는 상태가 되었는지는 다르다.

## 생성, 갱신과 삭제

Entity의 Kubernetes namespace에 secret을 만들고 이름은 Entity name과 Apollo secret name을 hyphen으로 연결한다. 값 편집 화면에는 기존 key만 보인다. 그대로 둔 key/value는 유지하고 변경한 값만 다시 보낼 수 있다.

key를 실수로 삭제했다면 Update 이전에는 Cancel로 되돌릴 수 있다. 업데이트 이후에는 원래 값을 다시 입력해 추가해야 하며 re-add Plan 성공 전에는 해당 key가 없는 구간이 있다. 이 기능은 managed Entity의 secret을 대상으로 한다.

사용 중 secret을 지우면 서비스가 깨질 수 있고 현재 configuration schema로는 모든 사용 여부를 찾아낼 수 없다고 명시한다. 삭제 전 chart template, runtime reference와 실제 소비자를 함께 확인한다. metadata나 dry-run만으로 미사용을 단정하지 않는다.

## chart는 Kubernetes secret 이름을 참조한다

Entity config에서 `{{ preprocess .Values.apollo.secrets.<apollo-secret-name>.k8sSecretName }}`으로 실제 Kubernetes Secret 이름을 얻는다. 여기의 key는 Apollo에서 정의한 secret name이고 반환값이 Kubernetes 자원 이름이다. chart values는 기존 secret 이름과 내부 key를 각각 설정해 volume mount, 환경변수 또는 응용 소비에 연결한다.

Module secretRequirements는 필요한 이름/key의 존재를 설치/upgrade 전에 확인하도록 안내한다. 값은 Module 정의나 Git config에 하드코딩하지 않고 설치 과정에서 채운다. 이 문서는 값 생성이나 실제 secret을 조회/변경한 결과가 아니다.

## 출처

- [Palantir, managing-secrets](https://www.palantir.com/docs/apollo/managing-secrets) — secret 부모 경로의 생성/참조 workflow.
- [Palantir, add-edit-delete-secrets](https://www.palantir.com/docs/apollo/managing-secrets/add-edit-delete-secrets) — 즉시 암호화, public key, 편집 보존과 삭제 위험.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-secrets/overview) — key-value secret 개념.
- [Palantir, reference-and-use-secrets](https://www.palantir.com/docs/apollo/managing-secrets/reference-and-use-secrets) — Apollo name에서 Kubernetes 이름을 해석해 chart에 전달.

## 관련 문서

- [[Apollo-Modules-and-Configuration-Ownership]]
- [[Apollo-CLI-Resources-and-Changes]]
