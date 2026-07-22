# NestJS Code Standards and Best Practices

This document outlines the code standards and best practices for the NestJS backend codebase. All pull requests must adhere to these standards.

## Table of Contents

1. [Proper Title and Description](#1-proper-title-and-description)
2. [Single Responsibility](#2-single-responsibility)
3. [Readme File](#3-readme-file)
4. [Environment Variables](#4-environment-variables)
5. [Module Architecture](#5-module-architecture)
6. [Shy Code - Function Length](#6-shy-code---function-length)
7. [SOLID Principle](#7-solid-principle)
8. [DRY Principle](#8-dry-principle)
9. [Naming Conventions](#9-naming-conventions)
10. [Comments and Documentation](#10-comments-and-documentation)
11. [Unnecessary Code and Imports](#11-unnecessary-code-and-imports)
12. [Proper Error Handling](#12-proper-error-handling)
13. [DTOs and Validation](#13-dtos-and-validation)
14. [Guards and Interceptors](#14-guards-and-interceptors)
15. [Database Patterns](#15-database-patterns)
16. [Security Best Practices](#16-security-best-practices)
17. [Testing](#17-testing)

---

## 1. Proper Title and Description

**Weight: 5.00%**

### Requirements

-   **Title**: Make a self-explanatory title describing what the pull request does
-   **Description**: Should be detailed with:
    -   **What** was changed
    -   **Why** it was changed
    -   **How** it was changed

### Example

```markdown
Title: Add user authentication with JWT strategy

Description:
- What: Added authentication module with JWT and Local passport strategies, signup/login endpoints, and password reset functionality
- Why: Users need to authenticate before accessing protected routes and resources
- How: Created AuthModule with AuthService, AuthController, JWT and Local strategies, and integrated with UsersModule
```

---

## 2. Single Responsibility

**Weight: 5.00%**

### Requirements

-   PR should be single responsible, targeting a single feature
-   Multiple features in a single PR increase complexity and reduce code quality

### Guidelines

-   One feature per PR
-   If a feature has multiple sub-features, break them into separate PRs
-   Related bug fixes can be included if they're part of the same feature
-   Each module should have a single, well-defined purpose

### Example

```typescript
// ❌ Bad - Multiple features in one PR
// PR includes: User authentication, Email service, File upload, Payment integration

// ✅ Good - Single feature per PR
// PR 1: User authentication with JWT
// PR 2: Email service integration
// PR 3: File upload functionality
// PR 4: Payment integration
```

---

## 3. Readme File

**Weight: 4.00%**

### Requirements

-   README file should be updated with the new feature
-   Document new modules, services, controllers, DTOs, or configuration changes

### Guidelines

-   Update README.md when adding:
    -   New NestJS modules
    -   New services or controllers
    -   New DTOs or schemas
    -   New environment variables
    -   New dependencies
    -   New features that require documentation
    -   Changes to setup/installation process
    -   New API endpoints
    -   Database schema changes

### Example

```markdown
## Authentication Module

The authentication module provides JWT-based authentication for the application.

### Endpoints

- `POST /api/v1/auth/signup` - Register a new user
- `POST /api/v1/auth/login` - Login with email and password
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `POST /api/v1/auth/change-password` - Change password (authenticated)

### Environment Variables

- `JWT_SECRET` - Secret key for super-admin JWT signing (`accessToken`) and org-admin `cloud_auth_token`
- `JWT_EXPIRES_IN` - Super-admin `accessToken` expiration only (e.g., "7d"); core org/user/router JWTs do not use this
- `ROUTER_JWT_SECRET` - Secret for router `router_auth_token` (Router → Cloud sync)
```

---

## 4. Environment Variables

**Weight: 5.00%**

### Requirements

-   Every configuration value should be in environment or config files
-   No code changes required when configuration changes
-   Use `@nestjs/config` for configuration management

### Guidelines

-   Store all configuration in:
    -   `.env` file for environment-specific values
    -   `.env.example` for documentation
    -   `config/` directory for configuration modules
-   Never hardcode:
    -   API endpoints
    -   API keys or secrets
    -   Database connection strings
    -   JWT secrets
    -   URLs
    -   Feature flags
    -   Any value that might change between environments

### Example

```typescript
// ❌ Bad
@Module({
  imports: [
    JwtModule.register({
      secret: 'hardcoded-secret-key',
      signOptions: { expiresIn: '1d' }
    })
  ]
})

// ✅ Good
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN')
        }
      }),
      inject: [ConfigService]
    })
  ]
})
```

---

## 5. Module Architecture

**Weight: 4.00%**

### Requirements

-   Follow NestJS module structure (Module, Controller, Service pattern)
-   Proper separation of concerns between modules
-   Use dependency injection correctly with `@Injectable()` decorator

### Architecture in NestJS

```
Module → Controller → Service → Repository/Model
```

### Guidelines

-   **Module**: Organize related functionality, import dependencies, export providers
-   **Controller**: Handle HTTP requests/responses, route definitions, use DTOs
-   **Service**: Business logic, data processing, external API calls
-   **Repository/Model**: Database operations, data access layer

### Example

```typescript
// users.module.ts
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService] // Export for use in other modules
})
export class UsersModule {}

// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }
}
```

---

## 6. Shy Code - Function Length

**Weight: 5.00%**

### Requirements

-   Code should be loosely coupled with other code
-   Maximum 50 lines are allowed in a function (as per ESLint config)
-   Functions should have single responsibility

### Guidelines

-   Keep functions small and focused
-   Extract complex logic into separate functions
-   Reduce dependencies between modules
-   Use dependency injection where possible
-   Prefer composition over inheritance

### Example

```typescript
// ❌ Bad - Too long and tightly coupled
async signup(signupDto: SignupDto): Promise<object> {
  const existingUser = await this.usersService.findByEmail(signupDto.email);
  if (existingUser) {
    throw new BadRequestException('Email already registered');
  }
  const user = await this.usersService.create(signupDto);
  const token = this.jwtUtilityService.generateToken(
    (user as any)._id.toString(),
    user.email
  );
  const sanitizedUser = this.sanitizeUser(user);
  return {
    user: sanitizedUser,
    accessToken: token
  };
}

// ✅ Good - Split into smaller functions
async signup(signupDto: SignupDto): Promise<object> {
  await this.validateEmailNotExists(signupDto.email);
  const user = await this.createUser(signupDto);
  const token = this.generateUserToken(user);
  return this.buildAuthResponse(user, token);
}

private async validateEmailNotExists(email: string): Promise<void> {
  const existingUser = await this.usersService.findByEmail(email);
  if (existingUser) {
    throw new BadRequestException('Email already registered');
  }
}

private async createUser(signupDto: SignupDto): Promise<User> {
  return this.usersService.create(signupDto);
}

private generateUserToken(user: User): string {
  return this.jwtUtilityService.generateToken(
    (user as any)._id.toString(),
    user.email
  );
}

private buildAuthResponse(user: User, token: string): object {
  return {
    user: this.sanitizeUser(user),
    accessToken: token
  };
}
```

---

## 7. SOLID Principle

**Weight: 5.00%**

### Requirements

-   Each service, controller, or module should handle only one feature
-   If there is any new feature, move it to a new service or module
-   Follow dependency inversion principle with dependency injection

### SOLID Principles in NestJS

1. **Single Responsibility**: One class = one reason to change
2. **Open/Closed**: Open for extension, closed for modification (use composition)
3. **Liskov Substitution**: Services should be substitutable
4. **Interface Segregation**: Prefer specific interfaces over generic ones
5. **Dependency Inversion**: Depend on abstractions (interfaces), not concretions

### Example

```typescript
// ❌ Bad - Multiple responsibilities
@Injectable()
export class UserService {
  async createUser(dto: CreateUserDto) { /* ... */ }
  async sendEmail(email: string) { /* ... */ }
  async uploadFile(file: File) { /* ... */ }
  async processPayment(amount: number) { /* ... */ }
}

// ✅ Good - Single responsibility
@Injectable()
export class UsersService {
  async create(dto: CreateUserDto): Promise<User> { /* ... */ }
  async findOne(id: string): Promise<User> { /* ... */ }
}

@Injectable()
export class EmailService {
  async sendEmail(email: string): Promise<void> { /* ... */ }
}

@Injectable()
export class FileService {
  async uploadFile(file: File): Promise<string> { /* ... */ }
}

@Injectable()
export class PaymentService {
  async processPayment(amount: number): Promise<void> { /* ... */ }
}
```

---

## 8. DRY Principle

**Weight: 5.00%**

### Requirements

-   Don't repeat yourself
-   Write code efficiently so that you can reuse your own logic
-   Extract common functionality into shared services or utilities

### Guidelines

-   Extract common logic into reusable services
-   Create utility functions for repeated operations
-   Use shared modules for cross-cutting concerns
-   Create base classes or interfaces for common patterns
-   Avoid copy-pasting code

### Example

```typescript
// ❌ Bad - Repeated code
@Injectable()
export class UsersService {
  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }
}

// ✅ Good - Reusable method
@Injectable()
export class UsersService {
  async findOne(id: string): Promise<User> {
    return this.findUserOrThrow(() => this.userModel.findById(id));
  }

  async findOneByEmail(email: string): Promise<User> {
    return this.findUserOrThrow(() => this.userModel.findOne({ email }));
  }

  private async findUserOrThrow(
    queryFn: () => Promise<User | null>
  ): Promise<User> {
    const user = await queryFn().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
```

---

## 9. Naming Conventions

**Weight: 5.00%**

### Requirements

-   Follow NestJS and TypeScript naming conventions
-   Names should be self-explanatory

### NestJS Naming Conventions

-   **Classes**: `PascalCase`

    ```typescript
    class UserService {}
    class AuthController {}
    class JwtStrategy {}
    ```

-   **Files**: `kebab-case` for modules

    ```typescript
    // user.service.ts
    // auth.controller.ts
    // jwt.strategy.ts
    // login.dto.ts
    ```

-   **Variables & Functions**: `camelCase`

    ```typescript
    const userName = 'John';
    const getUserById = async (id: string) => {
        /* ... */
    };
    ```

-   **Constants**: `UPPER_SNAKE_CASE`

    ```typescript
    const MAX_RETRY_ATTEMPTS = 3;
    const API_BASE_URL = 'https://api.example.com';
    ```

-   **Interfaces**: `PascalCase` (often prefixed with `I`)

    ```typescript
    interface IUserRepository {}
    interface IEmailService {}
    ```

-   **Enums**: `PascalCase` with `UPPER_SNAKE_CASE` values

    ```typescript
    enum UserRole {
      ADMIN = 'ADMIN',
      USER = 'USER',
      MODERATOR = 'MODERATOR'
    }
    ```

---

## 10. Comments and Documentation

**Weight: 4.00%**

### Requirements

-   Use TODO comments for remaining tasks in a feature
-   Write JSDoc comments before each class, method, and function
-   Document DTOs, interfaces, and complex logic

### Guidelines

-   JSDoc comments should explain:
    -   What the class/method does
    -   Parameters and their types
    -   Return value and type
    -   Any side effects
    -   Exceptions that might be thrown

### Example

```typescript
/**
 * Authentication Service
 * Handles user authentication, JWT generation, and password management
 */
@Injectable()
export class AuthService {
  /**
   * User signup/registration
   * @param {SignupDto} signupDto - Signup data containing email, password, and user details
   * @returns {Promise<object>} User object and access token
   * @throws {BadRequestException} If email already exists
   */
  async signup(signupDto: SignupDto): Promise<object> {
    // TODO: Add email verification step
    // ...
  }

  /**
   * Login DTO
   * Data transfer object for user login
   */
  export class LoginDto {
    /**
     * User's email address
     * @example "user@example.com"
     */
    @IsEmail()
    email!: string;

    /**
     * User's password
     * @example "SecurePassword123!"
     */
    @IsString()
    @MinLength(8)
    password!: string;
  }
}
```

---

## 11. Unnecessary Code and Imports

**Weight: 4.00%**

### Requirements

-   Remove unused code and commented code before PR
-   Remove any test console.log statements
-   Remove unused imports (ESLint should catch these)

### Guidelines

-   Before committing:
    -   Remove all `console.log()` statements
    -   Remove commented-out code blocks
    -   Remove unused imports
    -   Remove dead code paths
    -   Use ESLint to detect unused imports and variables

### Example

```typescript
// ❌ Bad
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config'; // Commented import
// const oldFunction = () => { /* ... */ }; // Commented code
console.log('Debug:', user); // Test log

// ✅ Good
import { Injectable, NotFoundException } from '@nestjs/common';
```

---

## 12. Proper Error Handling

**Weight: 4.00%**

### Requirements

-   Use NestJS built-in exceptions (NotFoundException, BadRequestException, etc.)
-   Proper exception filters for global error handling
-   Complete error messages for user feedback
-   Handle async operations with proper try-catch blocks

### Guidelines

-   Use appropriate HTTP exceptions:
    -   `BadRequestException` (400) - Invalid request data
    -   `UnauthorizedException` (401) - Authentication required
    -   `ForbiddenException` (403) - Insufficient permissions
    -   `NotFoundException` (404) - Resource not found
    -   `ConflictException` (409) - Resource conflict
    -   `InternalServerErrorException` (500) - Server errors
-   Create custom exception filters for specific error handling
-   Always provide meaningful error messages
-   Log errors appropriately

### Example

```typescript
// ❌ Bad
async findOne(id: string): Promise<User> {
  const user = await this.userModel.findById(id).exec();
  return user; // Returns null if not found, no error handling
}

// ✅ Good
async findOne(id: string): Promise<User> {
  const user = await this.userModel.findById(id).exec();
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }
  return user;
}

// ✅ Good - With try-catch for database errors
async create(createUserDto: CreateUserDto): Promise<User> {
  try {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error
      throw new ConflictException('Email already exists');
    }
    throw new InternalServerErrorException('Failed to create user');
  }
}
```

---

## 13. DTOs and Validation

**Weight: 5.00%**

### Requirements

-   All endpoints should use DTOs for request/response validation
-   Use class-validator decorators (@IsEmail, @IsString, @MinLength, etc.)
-   Use class-transformer for data transformation
-   Validate all inputs at the controller level

### Guidelines

-   Create separate DTOs for:
    -   Request bodies (CreateUserDto, UpdateUserDto)
    -   Query parameters (QueryDto)
    -   Path parameters (ParamDto)
    -   Response objects (ResponseDto)
-   Use validation decorators:
    -   `@IsString()`, `@IsEmail()`, `@IsNumber()`, `@IsBoolean()`
    -   `@MinLength()`, `@MaxLength()`, `@Min()`, `@Max()`
    -   `@IsOptional()`, `@IsNotEmpty()`, `@IsEnum()`
    -   `@IsArray()`, `@ValidateNested()`
-   Enable global validation pipe in `main.ts`

### Example

```typescript
// ❌ Bad - No validation
@Post()
async create(@Body() body: any): Promise<User> {
  return this.usersService.create(body);
}

// ✅ Good - Proper DTO with validation
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number'
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

@Post()
async create(@Body() createUserDto: CreateUserDto): Promise<User> {
  return this.usersService.create(createUserDto);
}

// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip non-whitelisted properties
    forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
    transform: true, // Transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true
    }
  })
);
    ```

---

## 14. Guards and Interceptors

**Weight: 5.00%**

### Requirements

-   Use guards for authentication and authorization
-   Use interceptors for cross-cutting concerns (logging, transformation)
-   Proper use of `@UseGuards()` and `@UseInterceptors()` decorators
-   Custom guards should extend NestJS guard interfaces

### Guidelines

-   **Guards**: Determine if a request should be handled by the route handler
    -   Authentication guards (JWT, Local)
    -   Authorization guards (Role-based)
    -   Custom guards for specific business logic
-   **Interceptors**: Transform responses, add extra logic, handle exceptions
    -   Logging interceptors
    -   Transformation interceptors
    -   Timeout interceptors
    -   Cache interceptors

### Example

```typescript
// JWT Auth Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);
    if (!isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}

// Role Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}

// Usage in Controller
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }
}

// Logging Interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        console.log(`${method} ${url} ${response.statusCode} - ${delay}ms`);
      })
    );
  }
}
    ```

---

## 15. Database Patterns

**Weight: 5.00%**

### Requirements

-   Use Mongoose schemas with proper validation
-   Implement pre-save hooks for password hashing and other transformations
-   Use proper query methods (findOne, findById, etc.)
-   Handle database errors appropriately

### Guidelines

-   **Schemas**: Define data structure, validation, and indexes
-   **Hooks**: Use pre-save, post-save, pre-remove hooks for business logic
-   **Queries**: Use Mongoose query methods appropriately
-   **Transactions**: Use transactions for multi-step operations
-   **Indexes**: Add indexes for frequently queried fields

### Example

```typescript
// User Schema with pre-save hook
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook for password hashing
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method for password comparison
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Service with proper error handling
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const createdUser = new this.userModel(createUserDto);
      return createdUser.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
    ```

---

## 16. Security Best Practices

**Weight: 5.00%**

### Requirements

-   Never expose sensitive data (passwords, tokens) in responses
-   Use environment variables for secrets (JWT_SECRET, DB_PASSWORD, etc.)
-   Implement proper authentication and authorization
-   Use bcrypt for password hashing
-   Validate and sanitize all user inputs

### Guidelines

-   **Password Security**:
    -   Hash passwords with bcrypt (salt rounds: 10+)
    -   Never return passwords in API responses
    -   Use strong password requirements
-   **Token Security**:
    -   Store JWT secrets in environment variables
    -   Set appropriate token expiration for **super-admin access tokens** only (`JWT_EXPIRES_IN`); core org/user/router JWTs are non-expiring
    -   Use HTTPS in production
-   **Input Validation**:
    -   Validate all inputs with DTOs
    -   Sanitize user inputs
    -   Use parameterized queries (Mongoose handles this)
-   **Rate Limiting**:
    -   Use `@nestjs/throttler` for rate limiting
    -   Protect sensitive endpoints (login, signup)

### Example

```typescript
// ❌ Bad - Exposes password
async login(loginDto: LoginDto): Promise<object> {
  const user = await this.usersService.findByEmail(loginDto.email);
  return {
    user, // Password included in response!
    token: '...'
  };
}

// ✅ Good - Sanitizes user data
async login(loginDto: LoginDto): Promise<object> {
  const user = await this.usersService.findByEmailWithPassword(loginDto.email);
  const isPasswordValid = await user.comparePassword(loginDto.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }
  const token = this.jwtUtilityService.generateToken(user._id, user.email);
  return {
    user: this.sanitizeUser(user), // Password removed
    accessToken: token
  };
}

private sanitizeUser(user: any): object {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  return userObj;
}

// Rate limiting in module
ThrottlerModule.forRoot([
  {
    ttl: 60000, // 1 minute
    limit: 10 // 10 requests per minute
  }
])

// Apply to specific routes
@Controller('auth')
@Throttle(5, 60) // 5 requests per 60 seconds
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // ...
  }
}
    ```

---

## 17. Testing

**Weight: 5.00%**

### Requirements

-   Write unit tests for services
-   Write integration tests for controllers
-   Test error cases and edge cases
-   Use proper test naming conventions (*.spec.ts)

### Guidelines

-   **Unit Tests**: Test individual services, utilities, and functions
    -   Mock dependencies
    -   Test business logic
    -   Test error handling
-   **Integration Tests**: Test controller endpoints
    -   Test request/response flow
    -   Test authentication/authorization
    -   Test validation
-   **E2E Tests**: Test complete user flows
    -   Test API endpoints end-to-end
    -   Use test database
-   **Test Structure**: Use describe/it blocks, proper naming

### Example

```typescript
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let model: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<User>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const user = { _id: '123', email: 'test@example.com' };
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(user)
      } as any);

      const result = await service.findOne('123');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('123')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

// users.controller.spec.ts
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /users', () => {
    it('should create a user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };
      const user = { _id: '123', ...createUserDto };

      jest.spyOn(service, 'create').mockResolvedValue(user as User);

      const result = await controller.create(createUserDto);
      expect(result).toEqual(user);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });
});
```

---

## Compliance Scoring

Each standard has a weight percentage. PRs are evaluated based on compliance with these standards:

-   **0 Violations**: Score > 4.0
-   **1-3 Violations**: Score 3.0 - 3.99
-   **4-6 Violations**: Score 1.0 - 2.99
-   **6+ Violations**: Score 0

Ensure your PR adheres to all standards to maintain high code quality.
