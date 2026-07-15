enum Permission {
    None,      // 0000
    Read,      // 0001
    Write,     // 0010
    Execute,   // 0011
    Delete     // 0100
}

// 비트 연산으로 권한 조합
const none = Permission.None | Permission.None; // number로 추론
const readWrite = Permission.Read | Permission.Write; // number로 추론
const allPermissions = Permission.None | Permission.Read | Permission.Write | Permission.Execute | Permission.Delete; // number로 추론

type NoneType = typeof Permission.None;
type ReadType = typeof Permission.Read;
type WriteType = typeof Permission.Write;
type ExecuteType = typeof Permission.Execute;
type DeleteType = typeof Permission.Delete;

type ReadWriteType = ReadType | WriteType;
type AllPermissionsType = NoneType | ReadType | WriteType | ExecuteType | DeleteType;

console.log(none); // 0
console.log(readWrite); // 3
console.log(allPermissions); // 7

// 특정 권한 확인
const hasRead = (readWrite & Permission.Read) !== 0;
const hasExecute = (readWrite & Permission.Execute) !== 0;

console.log(hasRead); // true
console.log(hasExecute); // true
