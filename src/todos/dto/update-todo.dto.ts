import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

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

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'ISO-8601 date-time; must be in the future. Pass null to clear the deadline. Owner-only.',
  })
  @IsOptional()
  @ValidateIf((o: UpdateTodoDto) => o.deadline !== null)
  @IsDateString()
  deadline?: string | null;
}
