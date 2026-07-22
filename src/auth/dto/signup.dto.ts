import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/** Request body for POST /auth/signup. */
export class SignupDto {
  @ApiProperty({ example: 'Faizan Ali' })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'faizan@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @MinLength(8)
  password!: string;
}
