import { ApiProperty } from '@nestjs/swagger';

/**
 * Todo shape returned by the todos endpoints — matches the frontend's `Todo`
 * type (`ownerId` is exposed as `userId`; see todo.mapper.ts).
 */
export class TodoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1, description: "The owning user's id" })
  userId!: number;

  @ApiProperty({ example: 'Buy groceries' })
  title!: string;

  @ApiProperty({ example: false })
  completed!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-08-01T15:30:00.000Z',
    description: 'ISO deadline, or null when none is set',
  })
  deadline!: string | null;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
  createdAt!: string;
}
