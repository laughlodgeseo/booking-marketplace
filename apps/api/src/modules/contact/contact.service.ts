import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ContactSubmissionStatus,
  ContactSubmissionTopic,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Resend } from 'resend';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isLikelyEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const MIN_MESSAGE_LENGTH = 2;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getRecipients(topic: ContactSubmissionTopic): string[] {
    const base = ['info@rentpropertyuae.com'];
    if (topic === ContactSubmissionTopic.BOOKING) {
      base.push('booking@rentpropertyuae.com');
    }
    return base;
  }

  private resendConfig() {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    const from =
      (process.env.SMTP_FROM || '').trim() ||
      'RentPropertyUAE <booking@rentpropertyuae.com>';
    const replyTo =
      (process.env.SMTP_REPLY_TO || '').trim() || undefined;

    return {
      configured: apiKey.length > 0,
      apiKey,
      from,
      replyTo,
    };
  }

  private async sendSubmissionEmail(input: {
    submissionId: string;
    name: string;
    email: string;
    phone: string | null;
    topic: ContactSubmissionTopic;
    message: string;
    createdAtIso: string;
  }) {
    const config = this.resendConfig();
    if (!config.configured) {
      return { sent: false, skipped: true, reason: 'resend_not_configured' };
    }

    const recipients = this.getRecipients(input.topic);
    const resend = new Resend(config.apiKey);

    const subject = `[Contact] ${input.topic} inquiry from ${input.name}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111827;">
        <h2 style="margin:0 0 12px;">New Contact Submission</h2>
        <p style="margin:0 0 8px;"><strong>Submission ID:</strong> ${input.submissionId}</p>
        <p style="margin:0 0 8px;"><strong>Topic:</strong> ${input.topic}</p>
        <p style="margin:0 0 8px;"><strong>Name:</strong> ${input.name}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${input.email}</p>
        <p style="margin:0 0 8px;"><strong>Phone:</strong> ${input.phone ?? '-'}</p>
        <p style="margin:0 0 8px;"><strong>Created:</strong> ${input.createdAtIso}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <p style="margin:0 0 6px;"><strong>Message</strong></p>
        <pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">${input.message}</pre>
      </div>
    `;
    const text = [
      'New Contact Submission',
      `Submission ID: ${input.submissionId}`,
      `Topic: ${input.topic}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? '-'}`,
      `Created: ${input.createdAtIso}`,
      '',
      'Message:',
      input.message,
    ].join('\n');

    const { error } = await resend.emails.send({
      from: config.from,
      to: recipients,
      subject,
      html,
      text,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    });

    if (error) {
      throw new Error(error.message);
    }

    return { sent: true, skipped: false, recipients };
  }

  private dispatchSubmissionEmail(input: {
    submissionId: string;
    name: string;
    email: string;
    phone: string | null;
    topic: ContactSubmissionTopic;
    message: string;
    createdAtIso: string;
  }) {
    // Do not block the public request on SMTP latency/failures.
    void this.sendSubmissionEmail(input).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'email_delivery_failed';
      this.logger.warn(
        `Failed to dispatch contact submission email for ${input.submissionId}: ${message}`,
      );
    });
  }

  async createSubmission(input: {
    name: string;
    email: string;
    phone?: string;
    topic?: ContactSubmissionTopic;
    message: string;
  }) {
    const name = (input.name || '').trim();
    const email = normalizeEmail(input.email || '');
    const phone = (input.phone || '').trim() || null;
    const message = (input.message || '').trim();
    const topic = input.topic ?? ContactSubmissionTopic.OTHER;

    if (name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters.');
    }
    if (!isLikelyEmail(email)) {
      throw new BadRequestException('Invalid email address.');
    }
    if (message.length < MIN_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`,
      );
    }

    const created = await this.prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        topic,
        message,
        status: ContactSubmissionStatus.OPEN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        topic: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    this.dispatchSubmissionEmail({
      submissionId: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      topic: created.topic,
      message: created.message,
      createdAtIso: created.createdAt.toISOString(),
    });

    return {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      emailDispatch: { queued: true },
    };
  }

  async listSubmissions(params: {
    status?: ContactSubmissionStatus;
    topic?: ContactSubmissionTopic;
    q?: string;
    page: number;
    pageSize: number;
  }) {
    const query = (params.q ?? '').trim().toLowerCase();

    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.topic ? { topic: params.topic } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
              { phone: { contains: query, mode: 'insensitive' as const } },
              { message: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.contactSubmission.count({ where }),
      this.prisma.contactSubmission.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          topic: true,
          message: true,
          status: true,
          resolvedAt: true,
          createdAt: true,
          updatedAt: true,
          resolvedByAdmin: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((row) => ({
        ...row,
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async getSubmission(submissionId: string) {
    const row = await this.prisma.contactSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        topic: true,
        message: true,
        status: true,
        resolvedAt: true,
        resolutionNotes: true,
        createdAt: true,
        updatedAt: true,
        resolvedByAdmin: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Contact submission not found.');
    }

    return {
      ...row,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateStatus(params: {
    submissionId: string;
    adminId: string;
    status: ContactSubmissionStatus;
    notes?: string;
  }) {
    const updated = await this.prisma.contactSubmission.update({
      where: { id: params.submissionId },
      data: {
        status: params.status,
        resolvedByAdminId:
          params.status === ContactSubmissionStatus.RESOLVED
            ? params.adminId
            : null,
        resolvedAt:
          params.status === ContactSubmissionStatus.RESOLVED
            ? new Date()
            : null,
        resolutionNotes: params.notes?.trim() || null,
      },
      select: {
        id: true,
        status: true,
        resolvedAt: true,
        resolutionNotes: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
