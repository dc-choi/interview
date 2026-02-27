/**
 * 클래스
 *
 * 같은 객체를 쉽게 생성하기 위해 사용하는 문법
 */

class Student {
    // 속성 (property)
    name;
    age;
    grade;

    // 생성자 (constructor)
    constructor(name, age, grade) {
        this.name = name;
        this.age = age;
        this.grade = grade;
    }

    // 메서드 (method)
    introduce() {
        console.log(`안녕하세요, 저는 ${this.name}이고, 나이는 ${this.age}살이며, 학년은 ${this.grade}입니다.`);
    }

    study(subject) {
        console.log(`${this.name}이(가) ${subject}을(를) 공부합니다.`);
    }
}

// 인스턴스 (instance)
let student = new Student("홍길동", 20, "A");
student.introduce();
student.study("수학");

console.log();

// 상속 (inheritance)
class StudentDeveloper extends Student {
    favoriteLanguage;

    constructor(name, age, grade, favoriteLanguage) {
        super(name, age, grade);
        this.favoriteLanguage = favoriteLanguage;
    }

    programming() {
        console.log(`${this.name}이(가) ${this.favoriteLanguage}로 코딩합니다.`);
    }
}

let dev = new StudentDeveloper("김코더", 22, "A+", "JavaScript");
dev.introduce();
dev.study("프로그래밍");
dev.programming();