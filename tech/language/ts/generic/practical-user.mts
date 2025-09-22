/**
 * 제네릭의 활용 예시로 유저 관리 시스템 구현
 */

interface Student {
    type: "student";
    school: string;
}

interface Developer {
    type: "developer";
    skill: string;
}

interface User<T = Student | Developer> {
    name: string;
    profile: T;
}

const user: User = {
    name: "Alice",
    profile: {
        type: "developer",
        skill: "TypeScript"
    }
};

const user2: User = {
    name: "Bob",
    profile: {
        type: "student",
        school: "XYZ University"
    }
};

const gotoSchool = (user: User): string => {
    if (user.profile.type === "student") {
        return `${user.name} goes to ${user.profile.school}`;
    }
    return `${user.name} is not a student`;
};

console.log(gotoSchool(user));  // Alice is not a student
console.log(gotoSchool(user2)); // Bob goes to XYZ University