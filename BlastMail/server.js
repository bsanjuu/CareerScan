const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password' // not your Gmail password
    }
});

app.post('/sendEmails', async (req, res) => {
    const { emails, subject, message } = req.body;

    try {
        for (const email of emails) {
            await transporter.sendMail({
                from: 'your-email@gmail.com',
                to: email,
                subject,
                text: message
            });
        }
        res.json({ message: 'Emails sent successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to send emails.' });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
