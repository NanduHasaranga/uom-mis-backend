import { Injectable, Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter;

    constructor() {
        this.transporter = createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: process.env.SMTP_SECURE === 'true', // 'true' = implicit TLS (usually port 465), 'false' = STARTTLS (usually port 587)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
        });
    }

    async send(to: string, subject: string, html: string): Promise<void> {
        await this.transporter.sendMail({
            from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
            to,
            subject,
            html,
        });
        this.logger.log(`Email sent to ${to}: ${subject}`);
    }
}