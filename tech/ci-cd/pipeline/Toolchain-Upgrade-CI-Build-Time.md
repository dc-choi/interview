---
tags: [ci-cd, build-performance, rust, cargo]
status: done
verified_at: 2026-10-20
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Toolchain Upgrade CI Build Time", "툴체인 업그레이드 뒤 CI 빌드 시간", "Cargo CI incremental default", "Rust 1.99 Cargo CI 증분 컴파일"]
---

# 툴체인 업그레이드 뒤 CI 빌드 시간 비교

컴파일러나 런타임을 올린 뒤 CI 시간이 달라지면 코드보다 비교 조건과 도구 기본값을 먼저 확인한다. 같은 commit이라도 캐시 복원 여부, 실행한 명령과 package 범위, 도구가 CI 환경을 감지해 바꾸는 기본값이 다르면 전후 시간은 서로 다른 작업을 잰 값이 된다. Rust 1.99.0(2026-10-01)의 Cargo 변경이 이 점검의 구체적인 사례다.

## 비교 조건 맞추기

- **소스**: 같은 commit과 lock 파일에서 toolchain 버전만 바꾼다. Rust는 `rust-toolchain.toml`의 `[toolchain] channel`로 버전을 고정할 수 있지만 rustup은 `cargo +<toolchain>`과 `RUSTUP_TOOLCHAIN` 환경 변수를 이 파일보다 먼저 적용한다. `rustup override` 디렉터리 설정도 이 파일과 같은 디렉터리이거나 현재 디렉터리에 더 가까운 디렉터리에 있으면 먼저 적용된다. 실제로 쓴 버전은 job log에 `rustc --version`으로 남긴다.
- **작업**: 같은 명령, profile, package 선택(`-p`, `--workspace`), feature와 target으로 잰다.
- **캐시**: 전후 모두 복원 없이 시작한 실행끼리, 또는 같은 방식으로 복원한 실행끼리 비교하고 복원에 걸린 시간은 따로 기록한다. 컴파일러 버전이 cache key에 들어가는 구성에서는 업그레이드 뒤 첫 실행이 이전 key와 맞지 않는다. 예를 들어 `Swatinem/rust-cache`는 기본 설정에서 job id, rustc release, host와 hash, `RUSTFLAGS` 같은 컴파일러 관련 환경 변수, `Cargo.lock`과 `Cargo.toml` 해시, 저장소 루트의 `rust-toolchain`/`rust-toolchain.toml`과 `.cargo/config.toml` 해시로 key를 만든다(README 기준. job id는 `add-job-id-key`, 환경 변수와 파일 해시는 `add-rust-environment-hash-key`가 true일 때 들어가며 둘 다 기본값이 true다). 반대로 런타임 버전을 key에 넣지 않는 캐시는 업그레이드 뒤에도 복원될 수 있다(setup-node 사례는 [[GitHub-Actions#의존성 캐싱|GitHub Actions 의존성 캐싱]]).
- **기본값**: 릴리스 노트의 compatibility 항목과 도구 changelog에서 CI 감지, profile, lint 수준처럼 같은 명령의 동작을 바꾸는 기본값 변경을 먼저 찾는다.
- **측정**: 첫 실행과 반복 실행을 나눠 여러 번 재고 step별 시간을 비교한다. Cargo의 `--timings`는 unit별 컴파일 시간과 동시성 정보를 `target/cargo-timings/cargo-timing.html`에 남긴다. 사람이 읽는 보고서이며 기계 판독용 데이터는 제공하지 않는다. Cargo 1.99는 이 보고서가 실제로 실행한 unit만 보이도록 고쳤으므로 1.98 보고서와 unit 목록이 다를 수 있다.

## Cargo 1.99: CI에서 증분 컴파일 기본값 변경

증분 컴파일은 `rustc`가 재컴파일에 쓸 정보를 build directory의 `incremental/`에 추가로 저장해 다음 컴파일을 빠르게 하는 방식이다. Cargo는 workspace member와 path dependency에만 적용한다. profile 기본값은 `dev`가 `incremental = true`, `release`가 `false`이고 `test`는 `dev`를 상속한다.

Cargo 1.99부터 CI에서 실행하면 증분 컴파일이 기본으로 꺼진다. 릴리스 노트는 `CI` 환경 변수로 CI를 감지한다고 적는다. 1.99 소스의 감지 함수 `cargo_util::is_ci`는 `CI` 또는 `TF_BUILD`가 설정돼 있는지만 보고 값은 보지 않으므로 `CI=false`도 CI로 판정한다. GitHub Actions는 기본 환경 변수 `CI`를 `true`로 두어 workflow의 모든 step에 제공한다.

Cargo 1.99가 증분 여부를 정하는 순서는 다음과 같다(1.99 소스의 `Profiles::new`, `get_profile`과 Cargo Book config 기준).

1. `CARGO_INCREMENTAL` 환경 변수. 문서는 `1`이면 켜고 `0`이면 끈다고 설명하고, 소스는 `1`이 아닌 모든 값을 끄기로 처리한다.
2. `build.incremental` config(환경 변수 `CARGO_BUILD_INCREMENTAL`).
3. 둘 다 없고 CI로 감지되면 `false`.
4. 어느 것도 해당하지 않으면 profile의 `incremental` 값.

1~3에서 정한 값은 profile 값을 전역으로 덮어쓴다. 따라서 CI에서는 `Cargo.toml`이나 config의 `[profile.dev] incremental = true`만으로 증분 컴파일이 켜지지 않고 `CARGO_INCREMENTAL=1`이나 `build.incremental = true`가 필요하다. 이미 `CARGO_INCREMENTAL=0`을 둔 workflow는 1.99 전후의 증분 설정이 같다. `Swatinem/rust-cache`도 `CARGO_INCREMENTAL=0`을 자동으로 설정하고, 저장 전에 증분 산출물을 지우며 기본값(`cache-workspace-crates: false`)에서는 workspace crate 자체를 캐시하지 않는다(README 기준).

변경 PR(#17220)은 CI에서 증분 컴파일이 주는 손해를 두 가지로 든다. 캐시가 없거나 재사용이 낮으면 증분 상태를 직렬화해 디스크에 쓰고 관리하는 시간이 낭비된다. 캐시를 쓰면 증분 산출물이 캐시 크기를 크게 늘려 네트워크와 압축 비용이 빌드 단축 효과를 넘을 수 있다. 일반적인 CI action에는 이미 들어 있는 설정을 action 없이 돌리는 runner에도 기본값으로 적용해, CI action에 대한 의존을 줄일 수 있게 한 것이다.

이 변경이 시간에 주는 영향은 workflow 조건에 따라 다르다.

- 증분 설정 없이 매번 깨끗한 runner에서 빌드했다면 증분 정보를 만들고 쓰는 비용이 빠진다.
- target directory를 job 사이에 유지하는 self-hosted runner에서 증분 재사용에 기대 왔다면 1.99 뒤 재컴파일이 느려질 수 있다. 이때는 `CARGO_INCREMENTAL=1`이나 `build.incremental = true`를 명시하고 캐시 크기와 함께 측정해 판단한다. 이 값은 모든 profile에 적용되므로 release 빌드를 함께 하는 job에서는 dev 빌드 step에만 지정한다.
- `release` profile과 이를 상속하는 `bench`는 기본값이 `incremental = false`라, 이 값을 바꾸지 않았다면 release 빌드만 하는 job은 이 기본값 변경의 영향을 받지 않는다. `[profile.release] incremental = true`를 둔 프로젝트는 CI에서 이 값도 꺼진다.
- 감지는 Cargo 프로세스의 환경 변수만 본다. CI 변수를 넘기지 않는 컨테이너 같은 하위 환경에서 Cargo를 실행하면 CI 기본값이 적용되지 않는다.

## Cargo 1.99의 다른 변경과 빌드 범위

- **`debug` profile**: 새 built-in profile `debug`는 `inherits = "dev"`이고 1.99 기준 `dev`와 차이가 없다. `cargo build --profile debug`와 `cargo install --debug`(기본은 `release`)가 이 profile을 쓴다. changelog는 `dev`를 디버깅 용도에서 떼어 내 반복 개발에 맞는 기본값으로 옮기기 위한 준비라고 설명한다. 1.99의 시간 변화 원인으로 보지 않되, debuginfo에 기대는 job은 이후 릴리스에서 `dev` 기본값이 바뀌는지 확인한다.
- **workspace `default-features`**: edition 2024 이상 멤버는 상속한 workspace 의존성의 `default-features`를 덮어쓸 수 있다(`serde = { workspace = true, default-features = false }`, RFC 3945). 이전 edition에서는 workspace 정의가 default features를 켠 상태라면 같은 선언이 경고와 함께 무시된다. 1.99 이전 Cargo의 2024 edition 멤버에서는 이 조합이 오류였다. 멤버에서 feature를 줄였는데 빌드 범위가 그대로라면 그 멤버의 `edition`과 경고를 확인한다.
- **feature 통합**: 여러 멤버를 한 번에 빌드하면 feature가 통합되어, 한 멤버라도 default features를 켜면 그 의존성을 쓰는 모든 멤버에 켜진다. `-p`로 한 멤버만 빌드한 시간과 `--workspace` 빌드 시간은 컴파일하는 feature 집합이 다를 수 있어 서로 비교하지 않는다.

## 시간 비교 전에 볼 1.99 진단 변경

진단 변경은 job을 더 일찍 실패시키거나 실행하는 test 수를 바꿔 시간 비교를 흐릴 수 있다. 아래는 그런 변경의 예이며 전체 목록은 1.99 릴리스 노트에서 확인한다.

- `no_mangle_generic_items` lint가 hard error로 바뀌어 해당 코드는 컴파일에 실패한다.
- doc comment의 code block에서 아무 대상에도 적용되지 않는 attribute가 오류가 됐다. doctest를 실행하는 `cargo test`가 여기서 실패할 수 있다.
- rustdoc이 doctest를 거를 때 `doc(cfg(...))`를 `cfg`처럼 반영하던 동작을 멈췄다. 이전에 `doc(cfg(...))` 때문에 걸러지던 doctest가 수집 대상에 들어와 doctest 수와 시간이 달라지거나 새로 실패할 수 있다.
- expression 위치에서 호출한 macro 본문 끝의 세미콜론을 잡는 경고가 다른 crate의 macro에도 적용된다(`semicolon_in_expressions_from_non_local_macros`, warn-by-default, `future_incompatible` group). 경고는 macro를 호출한 crate의 위치에 표시되고, 릴리스 노트는 자기 crate에서 경고를 끄는 데 그치지 말고 macro를 제공한 crate에 알리라고 권한다. CI가 `-D warnings`로 `warnings` group을 deny하면 이 경고도 빌드 실패가 된다. Cargo는 path가 아닌 의존성(registry, git)을 컴파일할 때 `--cap-lints allow`(`-vv`에서는 `warn`)를 넘기므로, 이 경고로 인한 빌드 실패는 주로 workspace member나 path dependency에서 macro를 호출한 경우에 드러난다.

## 운영 체크포인트

- 업그레이드 PR에서 toolchain 외의 변경(lock 갱신, workflow 수정)을 분리해 시간 변화의 원인을 하나로 좁힌다.
- `CI`, `TF_BUILD`, `CARGO_INCREMENTAL`, `CARGO_BUILD_INCREMENTAL` 값을 job log에 남긴다. `cargo build -v`가 출력하는 rustc 명령에 `-C incremental=`가 있으면 증분 컴파일이 켜진 것이다.
- 진단 변경으로 실패한 step이 있으면 그 실행은 시간 비교에서 뺀다.
- 업그레이드 효과를 판단할 때는 같은 조건의 cold 실행과 warm 실행을 각각 비교하고, 캐시 크기와 복원 시간도 함께 본다.

## 출처

- [Announcing Rust 1.99.0 — Rust Blog](https://blog.rust-lang.org/2026/10/01/Rust-1.99.0/)
- [Rust 1.99.0 릴리스 노트 — Rust](https://doc.rust-lang.org/stable/releases.html#version-1990-2026-10-01)
- [Cargo 1.99 변경 기록 — Cargo](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html#cargo-199-2026-10-01)
- [feat(profile): Disable incremental compilation under CI by default — Cargo, PR #17220](https://github.com/rust-lang/cargo/pull/17220)
- [fix(timings): only report units the job queue actually ran — Cargo, PR #17238](https://github.com/rust-lang/cargo/pull/17238)
- [src/workspace/profiles.rs (rust-1.99.0) — Cargo](https://github.com/rust-lang/cargo/blob/rust-1.99.0/src/workspace/profiles.rs)
- [crates/cargo-util/src/lib.rs (rust-1.99.0) — Cargo](https://github.com/rust-lang/cargo/blob/rust-1.99.0/crates/cargo-util/src/lib.rs)
- [src/compiler/mod.rs (rust-1.99.0) — Cargo](https://github.com/rust-lang/cargo/blob/rust-1.99.0/src/compiler/mod.rs)
- [src/compiler/unit.rs (rust-1.99.0) — Cargo](https://github.com/rust-lang/cargo/blob/rust-1.99.0/src/compiler/unit.rs)
- [Do not take doc(cfg()) into account when filtering doctests — Rust, PR #159014](https://github.com/rust-lang/rust/pull/159014)
- [RFC: Inheriting of default-features in Cargo — Rust, RFC PR #3945](https://github.com/rust-lang/rfcs/pull/3945)
- [rust-cache — Swatinem](https://github.com/Swatinem/rust-cache)
- [Cargo Book, Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)
- [Cargo Book, Configuration](https://doc.rust-lang.org/cargo/reference/config.html)
- [Cargo Book, Environment Variables](https://doc.rust-lang.org/cargo/reference/environment-variables.html)
- [Cargo Book, Specifying Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)
- [Cargo Book, Build Cache](https://doc.rust-lang.org/cargo/reference/build-cache.html)
- [Cargo Book, cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html)
- [Cargo Book, cargo install](https://doc.rust-lang.org/cargo/commands/cargo-install.html)
- [Rust Edition Guide, Cargo: Reject unused inherited default-features](https://doc.rust-lang.org/edition-guide/rust-2024/cargo-inherited-default-features.html)
- [The rustc book, Warn-by-default Lints](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html)
- [The rustc book, Lint Levels](https://doc.rust-lang.org/rustc/lints/levels.html)
- [The rustup book, Overrides](https://rust-lang.github.io/rustup/overrides.html)
- [GitHub Docs, Variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)

## 관련 문서

- [[GitHub-Actions|GitHub Actions (의존성 캐시와 속도 측정)]]
- [[Monorepo-CICD|모노레포 CI/CD (캐시 무효화 전파)]]
- [[Dependency-Management|의존성 관리 (lock 파일과 toolchain 고정)]]
- [[React-Native-Build-Speed|React Native 네이티브 빌드 시간 (첫 실행과 반복 실행 측정)]]
