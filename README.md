# Go On Riders Vehicle Rental Application

A modern Next.js web application for Go On Riders to digitize their rental process. This application includes admin and worker portals with authentication, vehicle and customer management, and rental tracking.

## Features

- **Admin Portal**: Complete management of the rental system
- **Worker Portal**: Day-to-day rental operations and customer management 
- **User Authentication**: Secure login for admin and staff accounts
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Architecture

This application is designed to work with the existing Go On Riders PHP website:

- **Main Website (PHP)**: Served from the root domain `go-onriders.com`
- **Admin Portal (Next.js)**: Deployed at `admin.go-onriders.com`
- **Worker Portal (Next.js)**: Deployed at `worker.go-onriders.com`

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [SQLite](https://www.sqlite.org/) - Embedded database
- [JSON Web Tokens](https://jwt.io/) - Authentication

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
   ```bash
   git clone https://your-repository-url.git
   cd go-on-riders
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file (use `.env.local.example` as a reference)

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This application is designed to be deployed as subdomains alongside the main PHP website.

### Subdomain Configuration

1. Set up DNS records for:
   - `admin.go-onriders.com` 
   - `worker.go-onriders.com`

2. Build the Next.js application:
   ```bash
   npm run build
   ```

3. Deploy using Vercel:
   ```bash
   npx vercel --prod
   ```
   
   Or configure your preferred hosting provider to serve from the `out` directory.

4. Configure environment variables on your hosting platform:
   - `NEXT_PUBLIC_API_URL`: URL to your API (typically `https://go-onriders.com/api`)
   - `JWT_SECRET`: Your secret key for JWT token generation

### API Configuration

The backend API should be configured with CORS to allow requests from the admin and worker subdomains.

## License

This project is licensed under the MIT License.
