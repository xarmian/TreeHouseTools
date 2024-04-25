import NodeMailer from 'nodemailer'

export const transporter = NodeMailer.createTransport({
  service: 'hotmail',
  auth: {
    user: 'user',
    pass: 'pass',
  },
});


