import { ApiProperty } from '@nestjs/swagger';
import type { PublicUser } from '../../users/user.mapper';

/** Response shape for POST /auth/login — matches the frontend's AuthSession type. */
export class AuthResponseDto {
  @ApiProperty()
  user!: PublicUser;

  @ApiProperty()
  accessToken!: string;
}
