import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/** Request body for POST /todos/:id/collaborators. */
export class InviteCollaboratorDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  email!: string;
}
