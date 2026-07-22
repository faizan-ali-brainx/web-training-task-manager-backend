import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic response shape for action endpoints that don't return a resource
 * (signup, verify-email, forgot/reset-password, logout). The token fields are
 * only populated outside production — see AuthService's dev/prod split.
 */
export class MessageResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false })
  verificationToken?: string;

  @ApiProperty({ required: false })
  resetToken?: string;
}
