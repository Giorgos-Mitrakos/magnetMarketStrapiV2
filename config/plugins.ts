export default ({ env }) => ({
  'import-products': {
    enabled: true,
    resolve: './src/plugins/import-products'
  },
  'export-platforms-xml': {
    enabled: true,
    resolve: './src/plugins/export-platforms-xml'
  },
  'platform-scrapper': {
    enabled: true,
    resolve: './src/plugins/platform-scrapper'
  },
  'orders': {
    enabled: true,
    resolve: './src/plugins/orders'
  },
  'piraeusbank-gateway': {
    enabled: true,
    resolve: './src/plugins/piraeusbank-gateway'
  },
  upload: {
    config: {
      providerOptions: {
        localServer: {
          maxage: 300000
        },
      },
    },
  },
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'mail.magnetmarket.gr'),
        port: env('SMTP_PORT', 465),
        secure: true,
        auth: {
          user: env('SMTP_USERNAME', 'info@magnetmarket.gr'),
          pass: env('SMTP_PASSWORD', 'M7zkv%778'),
        },
        // authMethod: "SMTP"
        // ... any custom nodemailer options
        
      },
      tls: {
        // secure: false,
        // ignoreTLS: true,
        rejectUnauthorized: false
      },
      settings: {
        defaultFrom: 'info@magnetmarket.gr',
        defaultReplyTo: 'info@magnetmarket.gr',
      },
    },
  },
});
