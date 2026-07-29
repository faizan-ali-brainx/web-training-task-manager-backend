import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/** The collaborator record returned when a user is invited onto a todo. */
export class CollaboratorResponseDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiProperty({ example: 1 })
  todoId!: number;

  @ApiProperty({ example: 1, description: "The inviting owner's user id" })
  invitedBy!: number;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
