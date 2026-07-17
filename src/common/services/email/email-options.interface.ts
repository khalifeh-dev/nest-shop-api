export interface EmailOptions {
    to: string
    subject: string
    html: string
    from?: string
}

export interface EmailProvider {
    sendEmail(options: EmailOptions): Promise<void>
}