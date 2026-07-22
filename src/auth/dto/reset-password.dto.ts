import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

/** Request body for POST /auth/reset-password. */
export class ResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  newPassword!: string;
}
