import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationMode, CancellationReason } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({
    enum: CancellationReason,
    description:
      'Optional for customer pre-payment cancellation (defaults to GUEST_REQUEST).',
  })
  @IsOptional()
  @IsEnum(CancellationReason)
  reason?: CancellationReason;

  @ApiPropertyOptional({
    enum: CancellationMode,
    default: CancellationMode.SOFT,
  })
  @IsOptional()
  @IsEnum(CancellationMode)
  mode?: CancellationMode;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
