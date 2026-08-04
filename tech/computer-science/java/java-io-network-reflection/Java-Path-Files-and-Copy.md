---
tags: [java, file, path, nio, security]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Path Files", "Java Path와 Files"]
---

# Java Path, Files와 file copy

`File`과 `Path`는 file content가 아니라 file system의 위치를 표현한다. `Files`는 생성, 삭제, 이동, attribute, stream과 copy operation을 제공한다. 새 code에서는 보통 `Path`/`Files`가 오류 원인과 기능을 더 명확히 드러낸다.

## `File`과 `Path`의 관계

| API | 성격 | 선택 기준 |
|---|---|---|
| `java.io.File` | 오래된 abstract pathname API | legacy API와의 interop |
| `java.nio.file.Path` | file system 안의 계층적 path | 새 code의 위치 표현 |
| `java.nio.file.Files` | `Path` 대상 static operation | metadata, traversal, copy, channel/stream open |

`File`은 deprecated가 아니며 `toPath()`로 전환할 수 있다. `Path`도 실제 file이 존재한다는 보장은 없고 relative path의 의미는 기준 directory에 따라 달라진다.

## normalize와 real path를 구분한다

- `normalize()`는 `.`과 `..`를 lexical하게 정리하며 file system에 접근하지 않는다.
- `toAbsolutePath()`는 absolute 표현을 만들지만 symlink를 해석해 canonical ownership을 보장하지 않는다.
- `toRealPath()`는 실제 file system을 조회해 존재하는 path와 symlink를 해석한다.

upload filename을 `root.resolve(input).normalize()`로 확인하는 것만으로 symlink race가 모두 해결되지는 않는다. 허용 root, file open 방식, symlink policy, 권한과 생성 후 검증을 함께 설계한다.

## text file API의 memory와 수명

| API | 특징 |
|---|---|
| `Files.readString` | 전체 text를 memory에 올림 |
| `Files.readAllLines` | 전체 line을 `List`로 올림 |
| `Files.lines` | lazy `Stream<String>`, 반환 stream을 닫아야 함 |
| `Files.newBufferedReader` | explicit iteration과 자원 수명 제어 |

`Files.lines(path)`와 parameter 없는 `newBufferedReader(path)`는 UTF-8을 사용하지만 외부 format contract가 다르면 charset overload를 쓴다.

## copy의 정확성부터 정의한다

```java
Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
```

`Files.copy`가 모든 환경에서 항상 가장 빠르거나 zero-copy라는 보장은 없다. provider와 OS가 구현을 선택하며, 성능은 file size, cache와 storage에 따라 달라진다.

- replace 여부, symbolic link, attribute 복사와 existing target 정책을 정한다.
- copy 성공을 durable commit과 동일시하지 않는다.
- publish가 원자적이어야 하면 같은 file system의 temp path에 쓴 뒤 `ATOMIC_MOVE` 지원 여부를 확인한다.
- `InputStream.transferTo()`도 memory 전체 적재를 피하는 편의 API지만 cancellation, rate limit과 progress가 필요하면 explicit loop가 낫다.
- directory stream, `Files.list`, `Files.walk`도 열린 자원을 가지므로 try-with-resources로 닫는다.

## Node.js로 옮길 때

Node.js `fs/promises`도 path normalization만으로 authorization을 해결하지 못한다. tenant root와 실제 file ownership을 검증하고, 사용자 file name을 application path에 직접 결합하지 않는다. 큰 file은 `readFile`보다 stream 또는 platform copy API를 검토한다.

## 점검 질문

- relative path의 기준 directory가 명확한가?
- path traversal과 symlink 경계를 함께 검증하는가?
- 전체 file을 memory에 올리는 API에 크기 상한이 있는가?
- copy completion, atomic visibility와 durability를 구분하는가?
- `Files.lines`, `list`, `walk`의 stream을 닫는가?

## 출처

- [Java SE 26, File](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/File.html)
- [Java SE 26, Path](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/nio/file/Path.html)
- [Java SE 26, Files](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/nio/file/Files.html)
- 김영한 강사, [File](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244441), [Files](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244442), [path 표현](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244443)
- 김영한 강사, [Files text 읽기](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244444), [file copy 최적화](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244445), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244446)

## 관련 문서

- [[Linux-File-System|Linux File System]]
- [[File-System|Node.js File System]]
- [[Java-Byte-and-Character-Streams|Java byte stream과 character stream]]
