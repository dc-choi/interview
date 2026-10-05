---
tags: [cs, c, stdio, scanf, file-io, magic-number]
status: done
verified_at: 2026-10-05
category: "CS - C"
aliases: ["C Standard I/O and Files", "C 표준 입출력과 파일", "scanf와 fgets", "fopen fread fprintf", "파일 시그니처", "Magic Number"]
---

# C 표준 입출력과 파일

`<stdio.h>`는 키보드, 화면과 파일을 모두 `FILE *` 스트림으로 다룬다. `printf`와 `scanf`는 표준 출력과 표준 입력을, `fprintf`, `fread`와 `fclose`는 지정한 스트림을 쓴다. 입력 크기 제한과 실패 처리는 호출자가 직접 해야 한다.

## printf와 scanf의 지정자 차이

| 대상 | `printf` | `scanf`와 인자 |
|---|---|---|
| `int` | `%d`, `%i` | `%d`는 10진수만, `%i`는 `0x`(16진)와 `0`(8진) 접두사도 해석한다. 인자는 `int *` |
| `long` | `%ld` | `%ld`, `long *` |
| `float` | `%f`(`double`로 승격) | `%f`, `float *` |
| `double` | `%f`, `%lf` | `%lf`, `double *` |
| 문자열 | `%s`, `char *` | `%4s`처럼 폭을 준 `%s`, `char` 배열 |

- 인자 타입이 지정자와 맞지 않으면 UB다. 컴파일러 경고로 잡는다([[C-Build-and-Debugging#경고, 표준과 디버그 정보|경고 옵션]]).
- 타입별 `printf` 지정자 전체는 [[C-Types-Control-Flow-and-Functions#기본 자료형|기본 자료형]]에 있다.

## scanf로 입력 받기

```c
int x;
if (scanf("%d", &x) != 1)
{
    return 1;  // 숫자가 아닌 입력이나 EOF
}

char s[5];
if (scanf("%4s", s) == 1)  // NUL 자리를 남긴 폭 4
{
    printf("%s\n", s);
}
```

- 값을 저장할 위치의 주소를 넘기면 `scanf`가 그 주소에 값을 쓴다. 배열은 첫 원소의 주소로 변환되므로 `&` 없이 넘긴다.
- `%s`는 공백 전까지 읽고 NUL을 덧붙인다. 폭이 없으면 입력이 배열보다 길 때 배열 밖에 쓰므로 `gets`만큼 위험하다. 배열 크기가 n이면 폭은 n - 1이다.
- 반환값은 대입에 성공한 항목 수이고, 첫 대입 전에 입력이 끝나면 `EOF`다. 형식이 맞지 않는 입력은 소비하지 않고 남기므로, 반환값을 보지 않고 반복하면 같은 입력에서 끝없이 실패한다([[Cpp-Coding-Test-Workflow-IO-and-Strings#입력|입력 끝까지 읽기]]).
- 줄 단위 입력은 `fgets(buf, sizeof buf, stdin)`가 안전하다. 최대 `sizeof buf - 1`문자를 읽고, 줄바꿈을 만나면 그것까지 담고, 뒤에 NUL을 붙인다. 아무것도 읽지 못한 채 EOF를 만나면 NULL을 돌려준다. 읽은 줄은 `sscanf`나 `strtol`로 해석한다.
- 길이 제한 없이 한 줄을 받으려면 버퍼를 키워 가며 다시 할당해야 한다. POSIX `getline`은 `*lineptr`가 NULL이면 버퍼를 할당하고 부족하면 `realloc`으로 늘리며, 그 버퍼는 호출자가 `free`한다.

## 파일 쓰기

```c
FILE *file = fopen("phonebook.csv", "a");
if (file == NULL)
{
    perror("phonebook.csv");
    return 1;
}
fprintf(file, "%s,%s\n", name, number);
if (fclose(file) != 0)
{
    return 1;
}
```

| 모드 | 파일이 있으면 | 없으면 |
|---|---|---|
| `"r"` | 처음부터 읽기 | 실패 |
| `"w"` | 내용을 지우고 쓰기 | 새로 만듦 |
| `"a"` | 끝에 이어 쓰기 | 새로 만듦 |

- `+`를 붙이면 읽기와 쓰기를 함께 한다. C11부터 `"wx"`는 파일이 이미 있으면 덮어쓰지 않고 실패한다.
- `fopen`은 실패하면 NULL을 돌려주고 POSIX는 이때 `errno`를 설정한다. `perror`는 넘긴 문자열 뒤에 `errno`의 설명을 붙여 표준 오류로 출력한다.
- `fprintf`는 출력 대상이 스트림인 `printf`다. 출력은 버퍼에 모였다가 OS로 넘어가므로 `fflush`나 `fclose` 전에는 파일에 아직 쓰이지 않았을 수 있다. `fclose`는 성공하면 0, 실패하면 `EOF`를 돌려주고, 닫은 스트림을 다시 쓰면 UB다.
- `main`에서 반환하거나 `exit`를 부르면 열린 스트림이 모두 비워지고 닫힌다. `_exit`처럼 이 정리를 건너뛰는 종료에서는 버퍼에 남은 내용이 파일에 쓰이지 않는다.
- CSV 값에 쉼표, 큰따옴표나 줄바꿈이 있으면 필드를 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓴다(RFC 4180). 위의 단순한 `"%s,%s\n"`은 이런 값에서 열이 어긋난다.

## 파일 읽기와 매직 넘버

파일 형식은 시작 부분에 정해진 바이트(매직 넘버, 파일 시그니처)를 두는 경우가 많다. 이 값을 읽으면 확장자 없이도 형식을 추정할 수 있다.

```c
int main(int argc, char *argv[])
{
    if (argc != 2)
    {
        return 1;
    }
    FILE *file = fopen(argv[1], "rb");
    if (file == NULL)
    {
        return 1;
    }
    unsigned char bytes[3];
    size_t n = fread(bytes, 1, 3, file);
    fclose(file);
    if (n == 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff)
    {
        printf("Maybe\n");
    }
    else
    {
        printf("No\n");
    }
}
```

- `fread(buffer, size, count, stream)`는 `size`바이트 객체를 최대 `count`개 읽고 온전히 읽은 객체 수를 돌려준다. EOF와 오류를 구분하지 않으므로 필요하면 `feof`, `ferror`로 확인한다.
- 같은 3바이트라도 `fread(bytes, 3, 1, file)`은 3바이트 객체 1개를 읽어 성공하면 1, 파일이 3바이트보다 짧으면 0을 돌려준다. `fread(bytes, 1, 3, file)`은 읽은 바이트 수를 돌려주므로 2바이트 파일에서 2가 된다. 반환값을 확인하지 않으면 채워지지 않은 원소를 비교하게 된다.
- 바이트는 `unsigned char`로 담는다. plain `char`의 부호는 구현 정의라 signed인 환경에서는 `0xFF` 바이트가 -1이 되어 `== 0xff`(255)가 거짓이 된다.
- `"b"` 플래그는 POSIX에서는 효과가 없지만 Windows에서는 `'\n'`과 `'\x1A'`의 특수 처리를 끈다. 바이너리 파일은 `"rb"`, `"wb"`로 연다.
- JPEG 압축 데이터는 SOI 마커 `FF D8`로 시작하고 모든 마커가 `FF`로 시작하므로 처음 세 바이트가 `FF D8 FF`다. PNG는 처음 8바이트가 언제나 `89 50 4E 47 0D 0A 1A 0A`다.
- 시그니처 일치는 필요조건일 뿐이다. 우연히 같은 바이트로 시작하는 다른 파일일 수 있어 결과를 Maybe로 둔다. 업로드 검증에서 시그니처만 믿지 않는 이유는 [[File-Upload-Security|파일 업로드 보안]]에 있다.
- 종료 상태 0과 `EXIT_SUCCESS`는 성공, `EXIT_FAILURE`는 실패를 뜻하며 관례상 실패에는 0이 아닌 값을 돌려준다. 셸과 다른 프로그램은 이 값으로 성공 여부를 판단한다. 사용법과 오류 메시지는 표준 출력의 결과와 섞이지 않도록 `stderr`로 보낸다.

## 점검 질문

- `scanf("%d", &x)`에는 `&`가 필요하고 `scanf("%4s", s)`에는 필요 없는 이유는?
- `%s`에 폭을 주지 않으면 무엇이 위험한가?
- `fread`의 반환값은 무엇을 세는가? `fread(b, 3, 1, f)`와 `fread(b, 1, 3, f)`의 차이는?
- 바이트를 `char`가 아니라 `unsigned char`로 담는 이유는?
- 시그니처가 맞아도 Maybe로 판단하는 이유는?

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 파일 쓰기](https://www.boostcourse.org/cs112/lecture/119034)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 파일 읽기](https://www.boostcourse.org/cs112/lecture/119035)
- [cppreference, scanf, fscanf, sscanf](https://en.cppreference.com/w/c/io/fscanf)
- [cppreference, fgets](https://en.cppreference.com/w/c/io/fgets)
- [cppreference, fopen](https://en.cppreference.com/w/c/io/fopen)
- [cppreference, fclose](https://en.cppreference.com/w/c/io/fclose)
- [cppreference, fread](https://en.cppreference.com/w/c/io/fread)
- [cppreference, perror](https://en.cppreference.com/w/c/io/perror)
- [cppreference, Main function](https://en.cppreference.com/w/c/language/main_function)
- [Linux, getline(3)](https://man7.org/linux/man-pages/man3/getline.3.html)
- [POSIX.1-2024, _Exit, _exit](https://pubs.opengroup.org/onlinepubs/9799919799/functions/_exit.html)
- [RFC 4180, Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180)
- [ITU-T, T.81 Digital compression and coding of continuous-tone still images](https://www.w3.org/Graphics/JPEG/itu-t81.pdf)
- [W3C, Portable Network Graphics (PNG) Specification (Third Edition)](https://www.w3.org/TR/png-3/)

## 관련 문서

- [[C언어(C)|C 인덱스]]
- [[C-Arrays-and-Strings|C 배열과 문자열 (명령행 인자)]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]
- [[Cpp-Coding-Test-Workflow-IO-and-Strings|C++ 입출력과 문자열]]
- [[File-Upload-Security|파일 업로드 보안]]
