"use server"
import { Phone } from "lucide-react";
import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Tu tienda" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}


export async function sendEmailFormInternal({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Delta <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}


export async function sendEmailForm({
  name,
  email,
  message,
  phone,
}: {
  name: string;
  email: string;
  message: string;
  phone?: string;
}) {
  await sendEmailFormInternal({
    to: "santisonzini1234@gmail.com",
    subject: "Nueva solicitud de demo – Delta",
    html: `
      <h2>Nueva solicitud de contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Telefono:</strong> ${phone}</p>

      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${message}</p>
    `,
  });
}