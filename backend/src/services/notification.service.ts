// =============================================================================
// services/notification.service.ts — Email & SMS Notification Wrapper
// =============================================================================
//
// DESIGN: Adapter pattern with a single NotificationService class.
//   - Email: Nodemailer with SMTP transport (works with Gmail, SendGrid SMTP)
//   - SMS:   Twilio REST API (free trial tier supported)
//   - Both channels are optional at runtime (graceful fallback via env flags)
//   - All templates are co-located here for easy future extraction
//
// ENV VARS REQUIRED:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//   NOTIFY_EMAIL_ENABLED=true|false
//   NOTIFY_SMS_ENABLED=true|false
// =============================================================================

import nodemailer, { Transporter } from "nodemailer";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeliveryFailedPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderNumber: string;
  failureReason: string;
  newAttemptNumber: number;
  maxAttempts: number;
  isEscalated: boolean;          // true when no more retries remain
}

export interface DeliverySuccessPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderNumber: string;
  deliveredAt: Date;
}

export interface AgentAssignedPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderNumber: string;
  agentName: string;
  agentPhone: string;
  scheduledPickupAt?: Date;
}

interface NotificationResult {
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class NotificationService {
  private mailer: Transporter | null = null;
  private readonly emailEnabled: boolean;
  private readonly smsEnabled: boolean;

  constructor() {
    this.emailEnabled = process.env.NOTIFY_EMAIL_ENABLED === "true";
    this.smsEnabled   = process.env.NOTIFY_SMS_ENABLED   === "true";

    if (this.emailEnabled) {
      this.mailer = nodemailer.createTransport({
        host:   process.env.SMTP_HOST!,
        port:   parseInt(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC NOTIFICATION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Called by OrderController when status → FAILED */
  async notifyDeliveryFailed(
    payload: DeliveryFailedPayload
  ): Promise<NotificationResult> {
    const subject = payload.isEscalated
      ? `[Action Required] All delivery attempts exhausted — Order ${payload.orderNumber}`
      : `Delivery Attempt Failed — Order ${payload.orderNumber}`;

    const emailHtml = this.buildFailedEmailTemplate(payload);
    const smsText   = this.buildFailedSmsText(payload);

    return this.dispatch({
      to:          payload.customerEmail,
      phone:       payload.customerPhone,
      subject,
      emailHtml,
      smsText,
    });
  }

  /** Called when status → DELIVERED */
  async notifyDeliverySuccess(
    payload: DeliverySuccessPayload
  ): Promise<NotificationResult> {
    const emailHtml = this.buildSuccessEmailTemplate(payload);
    const smsText   = `Hi ${payload.customerName}, your order #${payload.orderNumber} has been delivered successfully on ${payload.deliveredAt.toLocaleDateString()}. Thank you!`;

    return this.dispatch({
      to:       payload.customerEmail,
      phone:    payload.customerPhone,
      subject:  `Your order has been delivered — #${payload.orderNumber}`,
      emailHtml,
      smsText,
    });
  }

  /** Called when an agent is auto-assigned */
  async notifyAgentAssigned(
    payload: AgentAssignedPayload
  ): Promise<NotificationResult> {
    const smsText = `Hi ${payload.customerName}, your order #${payload.orderNumber} has been assigned to ${payload.agentName} (${payload.agentPhone}). Pickup in progress!`;
    const emailHtml = `
      <p>Hi ${payload.customerName},</p>
      <p>Your order <strong>#${payload.orderNumber}</strong> has been assigned to agent <strong>${payload.agentName}</strong>.</p>
      <p>Agent contact: <strong>${payload.agentPhone}</strong></p>
      <p>Sit tight — your parcel is being picked up!</p>
    `;
    return this.dispatch({
      to:      payload.customerEmail,
      phone:   payload.customerPhone,
      subject: `Agent assigned for Order #${payload.orderNumber}`,
      emailHtml,
      smsText,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE DISPATCHER
  // ═══════════════════════════════════════════════════════════════════════════

  private async dispatch(params: {
    to: string;
    phone: string;
    subject: string;
    emailHtml: string;
    smsText: string;
  }): Promise<NotificationResult> {
    const errors: string[] = [];
    let emailSent = false;
    let smsSent   = false;

    // Send email and SMS concurrently; failures do NOT throw
    const [emailResult, smsResult] = await Promise.allSettled([
      this.sendEmail(params.to, params.subject, params.emailHtml),
      this.sendSms(params.phone, params.smsText),
    ]);

    if (emailResult.status === "fulfilled") {
      emailSent = emailResult.value;
    } else {
      errors.push(`Email error: ${emailResult.reason}`);
      console.error("[NotificationService] Email failed:", emailResult.reason);
    }

    if (smsResult.status === "fulfilled") {
      smsSent = smsResult.value;
    } else {
      errors.push(`SMS error: ${smsResult.reason}`);
      console.error("[NotificationService] SMS failed:", smsResult.reason);
    }

    return { emailSent, smsSent, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL — Nodemailer (SMTP / SendGrid SMTP relay)
  // ═══════════════════════════════════════════════════════════════════════════

  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    if (!this.emailEnabled || !this.mailer) {
      console.log(`[NotificationService:Email:Disabled] To: ${to}, Subject: ${subject}`);
      return false;
    }

    await this.mailer.sendMail({
      from:    `"LastMile Delivery" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    });
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SMS — Twilio REST (free trial: verified numbers only)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // NOTE: We call Twilio's REST API directly with fetch() to avoid importing
  // the full Twilio SDK (~22MB). This keeps the service lean.
  // Swap for `twilio` npm package if you need advanced features (WhatsApp, etc.)

  private async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.smsEnabled) {
      console.log(`[NotificationService:SMS:Disabled] To: ${to}, Body: ${body}`);
      return false;
    }

    const sid      = process.env.TWILIO_ACCOUNT_SID!;
    const token    = process.env.TWILIO_AUTH_TOKEN!;
    const fromNum  = process.env.TWILIO_FROM_NUMBER!;

    const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");

    const formBody = new URLSearchParams({
      To:   to,
      From: fromNum,
      Body: body,
    });

    const response = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Twilio error ${err.code}: ${err.message}`);
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  private buildFailedEmailTemplate(p: DeliveryFailedPayload): string {
    const attemptsLeft = p.maxAttempts - p.newAttemptNumber;

    if (p.isEscalated) {
      return `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#dc2626">⚠️ All Delivery Attempts Exhausted</h2>
          <p>Hi <strong>${p.customerName}</strong>,</p>
          <p>We were unable to deliver your order <strong>#${p.orderNumber}</strong> after ${p.maxAttempts} attempts.</p>
          <p><strong>Last failure reason:</strong> ${p.failureReason}</p>
          <p>Our support team has been notified and will contact you within 24 hours to arrange a resolution.</p>
          <hr/>
          <p style="color:#6b7280;font-size:12px">LastMile Delivery Platform</p>
        </div>`;
    }

    return `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#f59e0b">📦 Delivery Attempt Unsuccessful</h2>
        <p>Hi <strong>${p.customerName}</strong>,</p>
        <p>We were unable to deliver your order <strong>#${p.orderNumber}</strong> today.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Order</strong></td><td style="padding:8px;border:1px solid #e5e7eb">#${p.orderNumber}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${p.failureReason}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Attempt</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${p.newAttemptNumber} of ${p.maxAttempts}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Retries Left</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${attemptsLeft}</td></tr>
        </table>
        <p>We have automatically scheduled a re-delivery. You will receive another notification once a new agent is assigned.</p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">LastMile Delivery Platform</p>
      </div>`;
  }

  private buildSuccessEmailTemplate(p: DeliverySuccessPayload): string {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#16a34a">✅ Your Order Has Been Delivered!</h2>
        <p>Hi <strong>${p.customerName}</strong>,</p>
        <p>Great news! Your order <strong>#${p.orderNumber}</strong> was successfully delivered on <strong>${p.deliveredAt.toLocaleDateString("en-IN", { dateStyle: "full" })}</strong>.</p>
        <p>Thank you for choosing LastMile Delivery. We hope to serve you again!</p>
        <hr/>
        <p style="color:#6b7280;font-size:12px">LastMile Delivery Platform</p>
      </div>`;
  }

  private buildFailedSmsText(p: DeliveryFailedPayload): string {
    if (p.isEscalated) {
      return `LastMile: Hi ${p.customerName}, all delivery attempts for #${p.orderNumber} are exhausted. Support will contact you within 24hrs.`;
    }
    const attemptsLeft = p.maxAttempts - p.newAttemptNumber;
    return `LastMile: Hi ${p.customerName}, delivery of #${p.orderNumber} failed (${p.failureReason}). ${attemptsLeft} retry(s) remaining. Rescheduling now.`;
  }
}

// Singleton export for DI
export const notificationService = new NotificationService();
