console.log('hello' === new String('hello')) // false
console.log(new String('hello') === new String('hello')) // false

console.log('hello' === String('hello')) // true
console.log(String('hello') === String('hello')) // true