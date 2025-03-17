import BikeRentalForm from '@/components/BikeRentalForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: '#F36D22' }}>
            Onn Rides
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Fill out the form below to rent a bike or car for your next adventure
          </p>
        </div>
        
        <BikeRentalForm />
        
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>© 2024 <span style={{ color: '#F36D22' }}>onnrides</span>. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
