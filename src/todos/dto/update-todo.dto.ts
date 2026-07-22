import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

/** Request body for PATCH /todos/:id — every field is optional (partial update). */
export class UpdateTodoDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
