import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength } from 'class-validator';

/** Request body for POST /todos. */
export class CreateTodoDto {
  @ApiProperty({ example: 'Buy groceries', maxLength: 200 })
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}
