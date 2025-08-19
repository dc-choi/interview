// @Controller('users')
// export class UserController {
//     #userService: UserService
//
//     constructor(userService: UserService) {
//         this.#userService = userService
//     }
//
//     get userService() {
//         return this.#userService;
//     }
//
//     @Get()
//     findAll(@Query() query: any) {
//         return this.userService.findAll(query);
//     }
// }