import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
    try {
        const { to, newPassword, displayName } = await request.json()

        if (!to || !newPassword) {
            return NextResponse.json({ error: 'Missing email or new password' }, { status: 400 })
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD, // Use app password from Google Account
            },
        })

        const mailOptions = {
            from: `"Tài Là Chính Admin" <${process.env.SMTP_EMAIL}>`,
            to: to,
            subject: 'Khôi phục Mật khẩu Xinh Group',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4f46e5;">Chào ${displayName || 'người dùng'},</h2>
                    <p>Hệ thống đã nhận được yêu cầu khôi phục mật khẩu của bạn.</p>
                    <p>Mật khẩu mới của bạn là: 
                        <strong style="font-size: 1.5em; color: #1e1b4b; background-color: #f3f4f6; padding: 5px 10px; border-radius: 5px;">
                            ${newPassword}
                        </strong>
                    </p>
                    <p>Vui lòng đăng nhập với mật khẩu này và đổi lại mật khẩu cá nhân càng sớm càng tốt để bảo mật dữ liệu.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="font-size: 0.9em; color: #6b7280;">Đây là email tự động, vui lòng không trả lời biểu mẫu này.</p>
                </div>
            `,
        }

        const info = await transporter.sendMail(mailOptions)

        return NextResponse.json({ status: 'success', message: 'Email sent successfully', messageId: info.messageId })
    } catch (error: any) {
        console.error('Email API Error:', error)
        return NextResponse.json({ error: error.message || 'Error sending email' }, { status: 500 })
    }
}
