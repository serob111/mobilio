export interface WelcomeEmailJobPayload {
  readonly kind: 'welcome';
  readonly userId: string;
  readonly email: string;
  readonly name: string;
}

export type EmailJobPayload = WelcomeEmailJobPayload;

export const EMAIL_JOB_NAME = 'send-email';
