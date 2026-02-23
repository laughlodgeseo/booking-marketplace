import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class RequestEmailVerificationDto {
  /**
   * For public resend flow (logged out users), email is required by UI and
   * handled with generic responses to avoid account enumeration.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : undefined,
  )
  @IsEmail()
  email?: string;
}
