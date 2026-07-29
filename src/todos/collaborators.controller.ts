import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { UserResponseDto } from '../users/dto/user-response.dto';
import type { PublicUser } from '../users/user.mapper';
import type { PublicCollaborator } from './collaborator.mapper';
import { CollaboratorsService } from './collaborators.service';
import { CollaboratorResponseDto } from './dto/collaborator-response.dto';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';

/** Manage who can access a todo — every route requires a valid JWT. */
@ApiTags('collaborators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('todos/:todoId/collaborators')
export class CollaboratorsController {
  constructor(private readonly collaborators: CollaboratorsService) {}

  /**
   * Invites a user onto this todo by email. Owner-only.
   * @param user - the authenticated caller
   * @param todoId - the todo's id
   * @param dto - the invitee's email
   * @returns the created collaborator record
   */
  @Post()
  @ApiOperation({
    summary: 'Invite a user as a collaborator by email (owner only)',
  })
  @ApiCreatedResponse({ type: CollaboratorResponseDto })
  @ApiResponse({ status: 403, description: 'Only the owner can invite' })
  @ApiResponse({ status: 404, description: 'No user with that email' })
  @ApiResponse({ status: 409, description: 'Already a collaborator' })
  invite(
    @CurrentUser() user: RequestUser,
    @Param('todoId', ParseIntPipe) todoId: number,
    @Body() dto: InviteCollaboratorDto,
  ): Promise<PublicCollaborator> {
    return this.collaborators.invite(user.userId, todoId, dto.email);
  }

  /**
   * Lists this todo's collaborators. Open to the owner or any collaborator.
   * @param user - the authenticated caller
   * @param todoId - the todo's id
   * @returns the collaborators, oldest invite first
   */
  @Get()
  @ApiOperation({
    summary: 'List collaborators on a todo (owner or collaborator)',
  })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  @ApiResponse({ status: 403, description: 'No access to this todo' })
  list(
    @CurrentUser() user: RequestUser,
    @Param('todoId', ParseIntPipe) todoId: number,
  ): Promise<PublicUser[]> {
    return this.collaborators.list(user.userId, todoId);
  }

  /**
   * Removes a collaborator from this todo. Owner-only.
   * @param user - the authenticated caller
   * @param todoId - the todo's id
   * @param collaboratorUserId - the collaborator's user id to remove
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a collaborator (owner only)' })
  @ApiNoContentResponse({ description: 'Collaborator removed' })
  @ApiResponse({ status: 403, description: 'Only the owner can remove' })
  @ApiResponse({ status: 404, description: 'That user is not a collaborator' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('todoId', ParseIntPipe) todoId: number,
    @Param('userId', ParseIntPipe) collaboratorUserId: number,
  ): Promise<void> {
    return this.collaborators.remove(user.userId, todoId, collaboratorUserId);
  }
}
