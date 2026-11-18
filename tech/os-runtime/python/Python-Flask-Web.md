---
tags: [python, flask, jinja, web, template, session, csrf]
status: done
verified_at: 2026-11-18
category: "OS & Runtime"
aliases: ["Python Flask Web", "Flask", "Jinja 템플릿", "Flask 웹 애플리케이션"]
---

# Python Flask 웹 애플리케이션

Flask는 Python으로 WSGI 웹 애플리케이션을 만드는 마이크로 프레임워크다. 요청 파싱과 라우팅은 Werkzeug, HTML 생성은 Jinja 템플릿 엔진이 맡는다. DB 연결, 폼 검증, CSRF 방어와 서버 측 세션 저장소는 기본으로 들어 있지 않아 확장이나 라이브러리를 골라 붙인다. 프레임워크는 코드 묶음과 함께 파일 위치와 함수 등록 방식 같은 관례를 정하므로, 관례를 따르면 설정 없이 동작한다.

버전 기준은 Flask 3.1.3, Jinja2 3.1.6, Werkzeug 3.1.9다(2026-11-18 PyPI 최신, Flask는 Python 3.9 이상). 요청 처리, 템플릿, 세션, CSRF 토큰과 오류 응답은 이 조합에 Flask-Session 0.8.0, Flask-WTF 1.3.0을 더해 test client와 개발 서버로 실행해 확인했고, 나머지는 공식 문서와 대조했다.

## 구조와 실행

관례상 `app.py`에 라우트를 두고, `templates/`에 `render_template()`이 찾는 Jinja 템플릿을, `static/`에 `/static/<경로>`로 제공할 이미지, CSS와 JavaScript를 둔다. 의존 패키지는 `requirements.txt`에 한 줄씩 적고 가상 환경에서 `pip install -r requirements.txt`로 설치한다([[Python-Modules-and-File-IO#가상 환경에 설치한다|가상 환경과 pip]]).

- `flask run`은 `--app`이나 `FLASK_APP`이 없으면 현재 폴더의 `wsgi.py`나 `app.py`를 찾고 127.0.0.1:5000에서 연다. 등록된 경로와 허용 메서드는 `flask routes`로 본다.
- `flask run --debug`는 코드가 바뀌면 다시 시작하는 reloader와 브라우저 debugger를 켠다. 처리되지 않은 예외가 나면 debug를 끈 상태의 브라우저는 `500 Internal Server Error`만 받고 traceback은 서버 터미널 로그에 남는다. debug를 켜면 traceback 페이지가 브라우저로 나가고, debugger는 PIN으로 보호되지만 브라우저에서 임의의 Python 코드를 실행할 수 있다.
- 개발 서버와 debugger는 운영에 쓰지 않는다. Flask 문서는 운영을 개발이 아닌 모든 실행으로 보고 Gunicorn, Waitress 같은 WSGI 서버나 호스팅 플랫폼을 쓰게 한다.
- 템플릿 파일이 없으면 `jinja2.exceptions.TemplateNotFound`, 닫지 않은 따옴표나 `{% body block %}` 같은 태그 오타는 `TemplateSyntaxError`가 서버 로그에 원인으로 찍힌다.
- 템플릿에서 정적 파일 경로는 `{{ url_for('static', filename='cat.jpg') }}`로 만든다. 앱을 하위 경로에 배포해도 맞는 URL이 나온다. `render_template`은 `templates/`를 알아서 찾으므로 템플릿 이름에 폴더를 붙이지 않는다.

## 라우트와 요청 데이터

`@app.route("/greet")`는 바로 아래 함수를 그 경로의 처리 함수로 등록하는 데코레이터다. 반환한 문자열은 `text/html` 200 응답이 되고, `(본문, 상태 코드)` 튜플로 상태 코드를 바꾼다.

- 기본 허용 메서드는 GET이고 HEAD와 OPTIONS는 자동으로 붙는다. 폼을 POST로 바꾸고 `methods=["GET", "POST"]`를 빠뜨리면 `405 Method Not Allowed`가 돌아오고 `Allow` 헤더에 GET, HEAD, OPTIONS가 실린다(나열 순서는 고정이 아니다). 등록하지 않은 경로는 404다.
- URL 쿼리 문자열은 `request.args`, 폼 본문은 `request.form`에 들어간다. 값이 실린 위치로 나뉘므로 `method="get"` 폼의 값은 args, `method="post"` 폼의 값은 form에서 읽는다.
- 둘 다 Werkzeug `MultiDict`다. `request.form["name"]`처럼 없는 키를 읽으면 `KeyError`이면서 `BadRequest`인 예외가 나 400이 된다. `.get("name", "world")`는 키가 없을 때만 기본값을 쓴다. `?name=`처럼 키가 있고 값이 비면 빈 문자열을 돌려주므로 빈 값 검사는 따로 한다.
- 같은 이름이 여러 번 오면(체크박스, `?tag=a&tag=b`) `.get`은 첫 값, `.getlist`는 전체 목록을 준다. 키가 없으면 `getlist`는 빈 목록이다. `.get("id", type=int)`는 변환에 실패하면 기본값 `None`을 돌려준다.
- `methods=["GET", "POST"]`를 준 함수 하나에서 `request.method`로 나누면 폼 표시와 제출 처리를 한 경로에 둔다. 폼마다 표시용과 처리용 경로를 따로 만들지 않아도 된다.

## Jinja 템플릿

`render_template("greet.html", name=name)`의 키워드 인자가 템플릿 변수가 된다. `name=name`의 왼쪽은 템플릿 안의 이름, 오른쪽은 Python 값이다. `{{ 식 }}`은 값을 출력하고, `{% 문 %}`은 `if`, `for`, `block` 같은 제어를 쓰며 `{% endif %}`, `{% endfor %}`, `{% endblock %}`으로 닫는다. `{# 주석 #}`은 출력에 남지 않는다.

- 상속: 공통 골격인 `layout.html`에 `<body>{% block body %}{% endblock %}</body>`처럼 이름 붙은 block을 비워 두고, 자식 템플릿은 첫 태그로 `{% extends "layout.html" %}`을 쓴 뒤 같은 이름의 block만 채운다. 부모 block의 내용을 이어 쓰려면 `{{ super() }}`를 부른다.
- `for`는 select의 option이나 table의 행을 서버에서 반복 생성한다. 목록이 비면 `{% else %}` 구간을 렌더링하고, `loop.index`는 1부터 센 순번이다.
- `row.name`은 속성을 먼저 찾고 없으면 `row["name"]`을 찾는다. 그래서 dict와 `sqlite3.Row`를 같은 문법으로 읽는다.

```html
{% extends "layout.html" %}
{% block body %}
  <form action="/" method="post">
    <input name="name" placeholder="Name" autocomplete="off" autofocus>
    {% for sport in sports %}
      <label><input name="sport" type="checkbox" value="{{ sport }}"> {{ sport }}</label>
    {% endfor %}
    <button type="submit">Register</button>
  </form>
{% endblock %}
```

### 자동 이스케이프와 남는 구멍

`render_template`은 `.html`, `.htm`, `.xml`, `.xhtml`, `.svg` 템플릿에서 `&`, `<`, `>`, `"`, `'`를 엔티티로 바꾼다. `<script>alert('x')</script>`를 이름으로 내면 `&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;`로 나가 실행되지 않는다. 탈출구는 Python의 `Markup`, 템플릿의 `|safe` 필터와 `{% autoescape false %}` 블록이며 사용자 입력에는 쓰지 않는다. 자동 이스케이프가 켜져 있어도 다음 경로는 남는다([[XSS]]).

- 따옴표 없는 속성: `<input value={{ value }}>`에는 `onmouseover=...` 같은 속성을 주입할 수 있다. Jinja 식이 들어가는 속성값은 항상 따옴표로 감싼다.
- `<a href="{{ url }}">`의 `javascript:` URL은 이스케이프로 막히지 않는다. 스킴을 검사하고 Content-Security-Policy를 둔다.
- Jinja를 거치지 않고 Python 문자열로 만든 HTML, 업로드 파일을 HTML로 내보내는 응답.

## 폼 처리: 서버 검증, 저장, PRG

```python
import sqlite3

from flask import Flask, g, redirect, render_template, request, url_for

app = Flask(__name__)
SPORTS = ["Basketball", "Soccer", "Ultimate Frisbee"]

def get_db():
    if "db" not in g:  # 앱 컨텍스트(요청)마다 연결 하나
        g.db = sqlite3.connect("froshims.db")
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template("index.html", sports=SPORTS)
    name = request.form.get("name", "").strip()
    sports = request.form.getlist("sport")  # 체크박스 여러 개
    if not name:
        return render_template("error.html", message="Missing name"), 400
    if not sports or any(sport not in SPORTS for sport in sports):
        return render_template("error.html", message="Invalid sport"), 400
    with get_db() as db:  # 성공하면 commit, 예외면 rollback
        db.executemany("INSERT INTO registrants (name, sport) VALUES (?, ?)",
                       [(name, sport) for sport in sports])
    return redirect(url_for("registrants"), code=303)

@app.route("/registrants")
def registrants():
    rows = get_db().execute("SELECT id, name, sport FROM registrants").fetchall()
    return render_template("registrants.html", registrants=rows)

@app.route("/api/registrants")
def registrants_api():
    rows = get_db().execute("SELECT id, name, sport FROM registrants").fetchall()
    return [dict(row) for row in rows]  # sqlite3.Row는 JSON 직렬화가 안 된다
```

- select 목록, `required`, hidden 값 같은 브라우저 쪽 제약은 개발자 도구로 HTML을 고치거나 요청을 직접 만들면 우회된다. 서버가 허용 목록 `SPORTS`로 다시 검증하고, 같은 목록을 템플릿에 넘겨 선택지를 만들면 화면과 검증 기준을 한 곳에서 관리한다. 실패는 원인별 메시지와 400으로 알린다.
- 저장에 성공하면 결과 화면을 바로 렌더링하지 않고 redirect한다. POST 응답 화면에서 새로고침하면 브라우저가 폼 재전송을 묻고, 승인하면 같은 등록이 반복된다. `redirect()`의 기본 코드는 302이므로 POST 뒤 GET 조회라는 의도는 303으로 드러낸다([[HTTP-Status-Code#Redirect 코드 고르기|PRG와 redirect 코드]]). 중복 제출 자체는 DB 제약과 멱등성으로도 막는다.
- 전역 dict에 저장하면 프로세스가 끝나거나 `--debug` reloader가 코드 변경으로 다시 시작할 때 사라지고, worker 프로세스를 여럿 띄우면 프로세스마다 따로 갖는다. 영속 데이터는 DB에 둔다.
- `sqlite3` 연결은 기본값 `check_same_thread=True`에서 만든 스레드 밖에서 쓰면 `ProgrammingError`가 난다. `flask run`은 요청을 스레드로 처리하는 것이 기본이므로 모듈 전역 연결 하나를 공유하지 않고 위처럼 `g`에 요청별 연결을 두고 `teardown_appcontext`에서 닫는다. `with db:`는 commit과 rollback만 하고 연결을 닫지 않는다.
- 값은 `?` placeholder로 바인딩한다. LIKE 검색도 `"%" + q + "%"`를 값으로 만들어 넘기고 SQL 문자열에 끼워 넣지 않는다([[SQL-Injection]]).
- 등록 해제 같은 행 단위 버튼은 이름 대신 primary key를 hidden input으로 보낸다. 이름으로 지우면 동명이인의 행까지 함께 지운다.

## GET과 POST의 선택

- GET 폼은 값을 URL에 싣는다. URL은 공유를 전제로 하고 서버, 프록시와 브라우저가 대상 URI를 기록하거나 표시하므로 비밀번호, 카드 번호와 개인정보를 넣지 않는다(RFC 9110 §17.9). 검색처럼 링크로 공유하고 다시 열 조회에는 GET이 맞다. 같은 절은 POST가 캐시를 막고 안전한 조회에 비안전 메서드를 쓰는 대가도 있다고 짚는다.
- POST는 값을 URL 대신 본문에 둘 뿐 암호화하지 않는다. 브라우저 개발자 도구 Network 패널의 Payload에서 그대로 보이며, 전송 구간 보호는 HTTPS가 맡는다.
- 삭제와 등록 해제처럼 서버 상태를 바꾸는 요청은 GET으로 받지 않는다. GET 경로는 메일 속 링크 클릭이나 `<img>`만으로 실행된다([[Idempotency#메서드별 멱등성|안전한 메서드]]). POST로 바꿔도 공격 페이지가 숨긴 폼을 자동 제출하면 요청이 간다. Flask는 CSRF 방어를 내장하지 않으므로 Flask-WTF의 `CSRFProtect(app)`을 등록한다. POST, PUT, PATCH, DELETE 요청에서 토큰을 검사하고, WTForms를 쓰지 않는 폼에는 `<input type="hidden" name="csrf_token" value="{{ csrf_token() }}">`를 넣는다. 토큰이 없으면 400이다([[CSRF]]).

## 세션: 서명 쿠키와 서버 저장소

`session`은 사용자마다 따로 보이는 dict처럼 쓰지만, Flask 기본 구현은 서버 저장소가 아니라 내용을 직렬화해 서명한 쿠키다.

| 항목 | Flask 기본 `session` | Flask-Session 확장 |
|---|---|---|
| 쿠키 값 | 직렬화한 내용, 타임스탬프와 서명 | session id |
| 내용의 비밀성 | base64를 풀면 사용자가 읽는다. 서명 키 없이는 고치지 못한다 | 서버 저장소에 있다 |
| 필요한 설정 | `SECRET_KEY`. 없으면 세션에 쓸 때 `RuntimeError` | 저장소 설정. `SESSION_TYPE="filesystem"`은 0.7.0부터 폐기 예정(1.0.0에서 제거)이고 `cachelib` 백엔드에 `FileSystemCache`를 넘긴다 |
| 로그아웃 | `session.clear()`는 쿠키 삭제를 응답할 뿐, 미리 복사한 쿠키는 서명 유효기간(`PERMANENT_SESSION_LIFETIME`, 기본 31일) 안에서 계속 통한다 | 저장소의 세션을 지우면 남은 id가 무효가 된다 |

- 기본 `session`은 dict 자체의 변경만 추적한다. 세션에 넣은 리스트에 `append`만 하면 `modified`가 켜지지 않아, `session.permanent`를 켜지 않은 세션에서는 다음 요청에 사라진다. `session.permanent = True`인 세션은 `SESSION_REFRESH_EACH_REQUEST`(기본 True) 때문에 응답마다 쿠키를 다시 써서 값이 남았고, 이 설정을 끄자 사라졌다(실측). `session["cart"] = [*session.get("cart", []), book_id]`처럼 새 값을 대입하거나 `session.modified = True`를 둔다. Flask-Session 0.8.0은 `SESSION_REFRESH_EACH_REQUEST`(Flask 기본값 True)이면 매 요청 저장소에 다시 써서 `append`만 한 코드도 동작했지만, 이 설정을 끄자 변경이 사라졌다. 저장 방식에 기대지 말고 변경을 명시한다.
- 서명 키는 `app.secret_key = os.environ["SECRET_KEY"]`처럼 코드 밖에서 주입한다. 키가 새면 누구나 유효한 세션 쿠키를 만들 수 있다([[Signed-Payload-Deserialization|서명 키 재사용 사례]]).
- 세션 쿠키의 기본 속성은 `HttpOnly`만 켜져 있다(`SESSION_COOKIE_SECURE=False`, `SESSION_COOKIE_SAMESITE=None`). Flask 문서의 권장은 `Secure`, `HttpOnly`, `SameSite=Lax`다. `session.permanent`를 켜지 않은 세션 쿠키는 만료 속성이 없어 브라우저를 닫으면 지워진다.
- 로그인은 비밀번호를 해시로 검증한 뒤([[Password-Hashing]]) `session.clear()`로 이전 상태를 비우고 사용자 id만 넣는다. 비밀번호 원문은 세션에 넣지 않는다. 쿠키와 세션 일반은 [[Cookie]]와 [[Session]], 서명 쿠키 세션과 서버 세션의 비교는 [[Express-Cookies-and-Sessions]]를 본다.

## JSON API와 부분 갱신

뷰가 dict나 list를 반환하면 `jsonify()`를 거쳐 `application/json` 응답이 된다(dict는 1.1, list는 2.2부터). `sqlite3.Row`는 JSON으로 직렬화되지 않아 위 `registrants_api`처럼 `dict(row)`로 바꾼다. 바꾸지 않으면 `TypeError`가 나고 응답은 500이다.

검색 자동완성처럼 페이지 일부만 바꾸는 요청(보내는 쪽 `fetch`는 [[Browser-Fetch-and-XHR]])에 서버가 돌려줄 형식은 둘이다.

| 형식 | 장점 | 비용 |
|---|---|---|
| HTML 조각(`<li>` 목록) | 같은 템플릿과 자동 이스케이프를 재사용한다 | 소비자가 서버의 마크업에 묶인다([[Frontend-Rendering-Models#htmx: 서버가 반환한 HTML로 갱신|htmx 방식]]) |
| JSON | 웹, 앱과 외부 서비스가 같은 데이터를 쓰는 API가 된다 | 클라이언트가 DOM을 만들며, 값은 `innerHTML` 대신 `textContent`로 넣는다([[Browser-DOM-Manipulation-and-Safety]]) |

## MVC로 보기

라우트 함수가 입력을 검증하고 데이터를 불러 어떤 템플릿을 그릴지 정하는 Controller, `templates/`가 View, DB와 그 접근 코드가 Model이다. 템플릿에도 `if`와 `for`가 들어가 경계가 엄격하지는 않지만, 허용 종목 검증이나 권한 판단 같은 업무 규칙은 템플릿에 두지 않는다. 다른 프레임워크의 MVC 구조는 [[Web-MVC-and-Front-Controller-Evolution]]에서 비교한다.

## 점검 질문

1. `?name=`인 요청과 name이 없는 요청에서 `request.args.get("name", "world")`의 결과가 다른 이유와, 폼을 POST로 바꾼 뒤 405가 날 때 고칠 곳은?
2. `session.permanent`를 켜지 않은 기본 `session`의 리스트에 `append`한 값이 다음 요청에 사라지는 이유와, 로그아웃한 뒤에도 복사해 둔 기본 세션 쿠키가 통하는 이유는?
3. 자동 이스케이프가 켜진 템플릿에 남는 XSS 경로와, 상태 변경을 POST로 바꿔도 CSRF 토큰이 필요한 이유는?

## 출처

- [Flask 3.1.x, Quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)
- [Flask 3.1.x, Templates](https://flask.palletsprojects.com/en/stable/templating/)
- [Flask 3.1.x, API (redirect, make_response, SecureCookieSession)](https://flask.palletsprojects.com/en/stable/api/)
- [Flask 3.1.x, Security Considerations](https://flask.palletsprojects.com/en/stable/web-security/)
- [Flask 3.1.x, Deploying to Production](https://flask.palletsprojects.com/en/stable/deploying/)
- [Flask 3.1.x, Using SQLite 3 with Flask](https://flask.palletsprojects.com/en/stable/patterns/sqlite3/)
- [Jinja 3.1.x, Template Designer Documentation](https://jinja.palletsprojects.com/en/stable/templates/)
- [Werkzeug 3.1.x, Data Structures](https://werkzeug.palletsprojects.com/en/stable/datastructures/)
- [Python 3, sqlite3](https://docs.python.org/3/library/sqlite3.html)
- [Flask-Session, Configuration](https://flask-session.readthedocs.io/en/latest/config.html)
- [Flask-WTF 1.3.x, CSRF Protection](https://flask-wtf.readthedocs.io/en/latest/csrf/)
- [IETF, RFC 9110: HTTP Semantics, §17.9](https://www.rfc-editor.org/rfc/rfc9110.html#section-17.9)
- [PyPI, Flask](https://pypi.org/project/Flask/)
- [YouTube, Harvard CS50 (2026), Lecture 9: Flask](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=76459s)

## 관련 문서

- [[Web-Service-Structure|웹 서비스의 구조 (정적과 동적, 상태 저장 위치)]]
- [[Java-Web-JSP-and-SSR|JSP와 서버 렌더링]]
- [[HTTP-Status-Code|HTTP 상태 코드와 PRG]]
- [[Cookie|Cookie]]
- [[Session|세션]]
- [[CSRF|CSRF]]
- [[XSS|XSS]]
- [[SQL-Injection|SQL Injection]]
- [[Python-Iteration-and-Functions|Python 반복문과 함수]]
