import BikeRentalForm from '@/components/BikeRentalForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Bike Rental Service
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Fill out the form below to rent a bike for your next adventure
          </p>
        </div>
        
        <BikeRentalForm />
        
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Bike Rental Company. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
