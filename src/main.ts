import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription(
      [
        'REST API for the Task Manager app (auth, todos, collaboration, and deadlines & notifications).',
        '',
        '**All routes are under `/api/v1`.** Protected routes need an `Authorization: Bearer <token>` header — use the **Authorize** button with a token from `POST /auth/login`.',
        '',
        '**Response envelope:** every success response is wrapped as `{ success: true, data, message }` and every error as `{ success: false, message }` (a `204 No Content` has no body). The schemas below describe the `data` field.',
        '',
        '**Real-time:** notifications are also pushed over a Socket.io connection on this same origin — connect with `io(origin, { auth: { token } })` and listen for the `notification` event (payload = a Notification). Not represented in this HTTP spec.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Signup, email verification, login/logout, password reset')
    .addTag('todos', 'Todo CRUD, ownership-enforced, with per-todo deadlines')
    .addTag('collaborators', 'Invite / list / remove collaborators on a todo')
    .addTag('notifications', 'In-app notifications (list + mark read)')
    .build();
  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
