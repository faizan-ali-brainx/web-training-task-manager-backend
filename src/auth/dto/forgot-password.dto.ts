import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/** Request body for POST /auth/forgot-password. */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'faizan@example.com' })
  @IsEmail()
  email!: string;
}
