import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ContactSubmissionStatus,
  ContactSubmissionTopic,
  UserRole,
} from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ContactService } from './contact.service';

type JwtUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

@Controller('contact-submissions')
export class PublicContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  create(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
      topic?: ContactSubmissionTopic;
      message: string;
    },
  ) {
    return this.contact.createSubmission(body);
  }
}

@Controller('admin/contact-submissions')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminContactController {
  constructor(private readonly contact: ContactService) {}

  private assertAdmin(user: JwtUser) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this resource.');
    }
  }

  @Get()
  list(
    @Req() req: { user: JwtUser },
    @Query()
    query: {
      status?: ContactSubmissionStatus;
      topic?: ContactSubmissionTopic;
      q?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    this.assertAdmin(req.user);
    const page = query.page ? Number(query.page) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 20;

    return this.contact.listSubmissions({
      status: query.status,
      topic: query.topic,
      q: query.q,
      page: Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1,
      pageSize:
        Number.isFinite(pageSize) && pageSize > 0
          ? Math.min(100, Math.trunc(pageSize))
          : 20,
    });
  }

  @Get(':submissionId')
  detail(
    @Req() req: { user: JwtUser },
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    this.assertAdmin(req.user);
    return this.contact.getSubmission(submissionId);
  }

  @Patch(':submissionId/status')
  updateStatus(
    @Req() req: { user: JwtUser },
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
    @Body() body: { status: ContactSubmissionStatus; notes?: string },
  ) {
    this.assertAdmin(req.user);
    return this.contact.updateStatus({
      submissionId,
      adminId: req.user.id,
      status: body.status,
      notes: body.notes,
    });
  }
}
