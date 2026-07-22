import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

/** Request body for POST /auth/verify-email. */
export class VerifyEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  token!: string;
}
