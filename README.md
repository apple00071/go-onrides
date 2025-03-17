# Bike Rental Form Application

A modern Next.js web application for bike rental companies to digitize their rental process. This application includes a customer information form, digital signature capability, and document upload functionality.

## Features

- **Customer Information Form**: Collects personal details, rental dates, and bike preferences
- **Digital Signature**: Allows customers to sign the rental agreement digitally
- **Document Upload**: Lets customers upload their ID or driver's license
- **Form Validation**: Ensures all required information is provided correctly
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [React Hook Form](https://react-hook-form.com/) - Form validation
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [React Signature Canvas](https://github.com/agilgur5/react-signature-canvas) - Digital signature component

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
   ```bash
   git clone https://your-repository-url.git
   cd bike-rental-form
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

The form collects the following information from customers:

- Personal details (name, email, phone, address)
- Rental period (start and end dates)
- Bike type preference
- Digital signature for the rental agreement
- ID or driver's license document (for verification)

After submitting the form, in a production environment, the data would be sent to a server for processing and storage.

## Customization

You can customize the form fields, validation rules, and styling based on your specific business needs:

- Modify form fields in `src/components/BikeRentalForm.tsx`
- Update validation rules in the `formSchema` object
- Adjust styling using TailwindCSS classes

## Deployment

This application can be easily deployed to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/bike-rental-form)

## License

This project is licensed under the MIT License.
