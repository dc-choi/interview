---
tags: [cicd, git, hash, compatibility]
status: done
verified_at: 2026-10-07
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git 객체 형식", "Git SHA-256 전환"]
---

# Git 객체 형식과 SHA-256 호환성

Git 객체 ID는 저장소의 객체 해시 형식에 따라 달라진다. 전체 ID의 16진수 길이는 SHA-1이면 40자, SHA-256이면 64자다. 화면에 보이는 짧은 커밋 ID와 전체 ID를 구분해야 한다.

## 객체 ID는 파일 체크섬과 다르다

객체 해시는 객체의 종류, 길이, 구분자와 내용을 대상으로 계산한다. 같은 파일에 일반 SHA-256 체크섬 도구를 실행한 결과가 Git blob ID와 같다고 가정하지 않는다. tree와 commit은 다른 객체의 ID도 포함하므로 해시 형식을 바꾸는 일은 표시 문자열을 늘리는 작업보다 범위가 크다.

객체 주소의 충돌 저항성과 작성자의 신뢰는 별개다. 더 강한 해시는 서로 다른 내용을 같은 ID로 만드는 공격에 대응하는 데 필요하지만, 저장소 접근 제어와 서명 검증을 대신하지 않는다.

## 현재 동작과 전환 설계의 경계

2026-10-07 확인한 `git-init` 매뉴얼은 `sha1`을 기본값으로 안내한다. SHA-256을 지원하는 빌드에서는 새 저장소를 만들 때 `--object-format=sha256`을 지정할 수 있다. `init.defaultObjectFormat`과 `GIT_DEFAULT_HASH`도 초기화 형식 선택에 관여하므로 설치 버전만으로 새 저장소 형식을 추정하지 않는다.

같은 매뉴얼은 SHA-1과 SHA-256 저장소 사이의 상호운용이 현재 제공되지 않는다고 명시한다. 해시 전환 설계 문서의 매핑과 호환성 목표를 모든 배포 버전에서 사용할 수 있는 기능으로 읽지 않는다. 새 저장소의 기본값 변경과 기존 저장소의 객체 변환도 별개다.

Git 3.0의 Rust 빌드 필수화는 공식 `BreakingChanges` 문서에 있는 계획이다. 그 문서에는 배포판 영향을 평가해 후속 minor release로 미룰 수 있다는 조건도 있다. 빌드 도구 의존성 계획만으로 SHA-256 기본값 전환이나 기존 저장소의 자동 변환을 확정하지 않는다.

## 자동화에서 확인할 경계

| 대상 | 확인할 것 |
|---|---|
| 정규식과 DB 필드 | 전체 객체 ID를 40자로만 제한하거나 40자에서 잘라 저장하는지 |
| 로그와 UI | 축약 ID를 영구 식별자로 저장하지 않고 필요할 때 전체 ID로 해석하는지 |
| 캐시와 외부 API | 저장소, 객체 형식과 전체 ID를 구분하고 소비자의 입력 계약을 확인했는지 |
| 호스팅과 CI 도구 | 사용 중인 서버, Git 라이브러리와 action이 해당 객체 형식을 지원하는지 |
| submodule | 상위 저장소와 하위 저장소의 형식 및 사용 버전의 조합을 별도로 검증했는지 |

위 표는 호환성 점검 기준이다. 특정 호스팅 서비스나 submodule 조합의 지원 여부를 확인했다는 뜻은 아니다.

현재 저장소의 형식은 지원되는 Git 버전에서 다음 읽기 전용 명령으로 확인한다.

```bash
git rev-parse --show-object-format=storage
git rev-parse --verify 'HEAD^{commit}'
```

두 번째 명령은 HEAD가 가리키는 커밋을 확인하며, 아직 커밋이 없는 저장소에서는 실패할 수 있다. 명령 출력을 단순히 40자 문자열로만 검사하지 않는다. 이 문서는 실제 저장소의 형식이나 설정을 변경하는 절차가 아니다.

## 이해 확인

1. 64자 ID를 허용하도록 DB 필드를 늘리면 SHA-1과 SHA-256 저장소의 상호운용까지 해결되는가?
2. Git 버전을 올리는 것, 새 저장소의 기본 객체 형식을 바꾸는 것과 기존 이력을 변환하는 것은 어떻게 다른가?

## 출처

- [Git, git-init](https://git-scm.com/docs/git-init)
- [Git, Hash function transition](https://git-scm.com/docs/hash-function-transition)
- [Git, git-rev-parse](https://git-scm.com/docs/git-rev-parse)
- [BreakingChanges — Git 공식 저장소](https://github.com/git/git/blob/master/Documentation/BreakingChanges.adoc)

## 관련 문서

- [[Git-Mental-Model|Git 객체와 커밋 그래프]]
- [[Git-History-Debugging|Git 히스토리 분석]]
- [[Checksum-and-Hash|체크섬과 해시]]
