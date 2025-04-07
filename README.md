# BMSD Transportation Case Study

An interactive case study application for exploring transportation planning scenarios in the BMSD community. This application facilitates engagement with stakeholders through character-based interactions and scenario analysis.

## Features

* Human verification using reCAPTCHA v2
* Character-based interactions with stakeholders
* Secure authentication flow
* Interactive transportation planning scenarios
* Real-time response generation
* Mobile-responsive design

## Technology Stack

* Next.js 15.2
* TypeScript
* Tailwind CSS
* NextAuth.js for authentication
* Google reCAPTCHA v2 for verification

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/BennyMorton28/bmsd-case-demo.git
```

2. Install dependencies:
```bash
cd bmsd-case-demo
npm install
```

3. Set up environment variables:
Create a `.env` file with the following:
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Security

* reCAPTCHA verification required for access
* Secure session management
* Environment variable protection
* Protected API routes

## License

MIT License - See LICENSE file for details
