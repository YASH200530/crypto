# Email Service Setup with Nodemailer

This document explains how to set up and use the email service in your crypto app using Nodemailer.

## 📧 Setup Instructions

### 1. Environment Variables

Add the following variables to your `.env` file:

```env
# Email Configuration (Required)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-here

# Optional SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
CLIENT_URL=http://localhost:5173
```

### 2. Gmail Setup (Recommended)

For Gmail accounts, you need to use an **App Password** instead of your regular password:

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account settings → Security → 2-Step Verification
3. Generate an App Password:
   - Select "Mail" as the app
   - Select "Other" as the device
   - Name it "Crypto App" or similar
4. Use the generated 16-character password as `EMAIL_PASS`

### 3. Alternative Email Providers

You can also use other email providers by modifying the transporter configuration:

```javascript
// For Outlook/Hotmail
service: 'outlook'

// For Yahoo
service: 'yahoo'

// For custom SMTP
host: 'your-smtp-server.com'
port: 587
secure: false
```

## 🚀 Available Email Templates

### 1. Welcome Email (`welcome`)
Sent automatically when a user registers.

### 2. Transaction Alert (`transactionAlert`)
Sent automatically for all transactions (buy, sell, deposit).

### 3. Password Reset (`passwordReset`)
Sent when user requests password reset.

### 4. Balance Alert (`balanceAlert`)
Sent when account balance is low.

## 📡 API Endpoints

### Test Email Connection
```http
POST /api/email/test
Authorization: Bearer <token>
```

### Send Template Email
```http
POST /api/email/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "user@example.com",
  "template": "welcome",
  "templateData": {
    "displayName": "John Doe"
  }
}
```

### Send Custom Email
```http
POST /api/email/send-custom
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Custom Subject",
  "htmlContent": "<h1>Hello World</h1>",
  "textContent": "Hello World"
}
```

### Send Bulk Email
```http
POST /api/email/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipients": ["user1@example.com", "user2@example.com"],
  "template": "welcome",
  "templateData": {
    "displayName": "Users"
  }
}
```

### Send Balance Alert
```http
POST /api/email/balance-alert
Authorization: Bearer <token>
Content-Type: application/json

{
  "threshold": 100
}
```

### Password Reset Request
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

## 🔧 Usage Examples

### Frontend Integration (React)

```javascript
// Test email connection
const testEmail = async () => {
  try {
    const response = await fetch('/api/email/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    console.log('Email test:', result);
  } catch (error) {
    console.error('Email test failed:', error);
  }
};

// Send custom email
const sendCustomEmail = async () => {
  try {
    const response = await fetch('/api/email/send-custom', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'user@example.com',
        subject: 'Important Update',
        htmlContent: '<h1>Your crypto portfolio update</h1><p>Check your latest gains!</p>'
      })
    });
    const result = await response.json();
    console.log('Email sent:', result);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

// Request password reset
const forgotPassword = async (email) => {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    const result = await response.json();
    console.log('Password reset:', result);
  } catch (error) {
    console.error('Password reset failed:', error);
  }
};
```

## 🎨 Email Template Customization

All email templates are defined in `server/emailService.js`. You can customize:

- **Colors**: Update the CSS color values in the template strings
- **Content**: Modify the text and structure
- **Branding**: Add your logo and company information
- **Links**: Update URLs to match your domain

Example customization:
```javascript
const customWelcomeTemplate = (userEmail, displayName) => ({
  subject: 'Welcome to My Crypto App!',
  html: `
    <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #your-brand-color; padding: 40px; text-align: center;">
        <img src="https://your-domain.com/logo.png" alt="Logo" style="max-width: 200px;">
        <h1 style="color: white; margin: 20px 0;">Welcome ${displayName}!</h1>
      </div>
      <!-- Your custom content here -->
    </div>
  `
});
```

## 🔒 Security Best Practices

1. **Never commit email credentials** to version control
2. **Use App Passwords** instead of regular passwords
3. **Implement rate limiting** for email endpoints
4. **Validate email addresses** before sending
5. **Use HTTPS** in production
6. **Monitor email sending** for abuse

## 📊 Email Analytics

To track email performance, you can:

1. **Log email events** in your database
2. **Use email tracking services** like SendGrid or Mailgun
3. **Implement open/click tracking** with tracking pixels
4. **Monitor bounce rates** and delivery status

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid login" error**: Check if you're using an App Password for Gmail
2. **"Connection timeout"**: Verify SMTP settings and firewall rules
3. **Emails going to spam**: Set up SPF, DKIM, and DMARC records
4. **Rate limiting**: Add delays between bulk emails

### Debug Mode:

Enable debug logging by adding to your transporter config:
```javascript
const transporter = nodemailer.createTransporter({
  // ... your config
  debug: true,
  logger: true
});
```

## 📈 Production Considerations

For production environments, consider:

1. **Using dedicated email services** (SendGrid, AWS SES, Mailgun)
2. **Implementing email queues** (Redis, Bull)
3. **Setting up monitoring** and alerting
4. **Configuring proper DNS records**
5. **Implementing email templates** in a database
6. **Adding unsubscribe functionality**

## 🔄 Migration from EmailJS

If you were previously using EmailJS (which is included in your dependencies), you can gradually migrate:

1. Keep EmailJS for client-side emails (contact forms)
2. Use Nodemailer for server-side transactional emails
3. Eventually consolidate to one solution based on your needs

The Nodemailer implementation provides better security and control over your email infrastructure.