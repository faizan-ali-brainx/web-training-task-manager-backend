import { ApiProperty } from '@nestjs/swagger';

/**
 * Public user shape returned by the API — the sanitized `PublicUser` (never
 * includes the password hash). Declared as a class (not just the mapper's
 * interface) so Swagger can render its schema.
 */
export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Faizan Ali' })
  name!: string;

  @ApiProperty({ example: 'faizan@example.com' })
  email!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;
}
