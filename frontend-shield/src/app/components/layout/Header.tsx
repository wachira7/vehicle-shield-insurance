import ConnectButton from "../wallet/ConnectButton"

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/logo.svg" alt="VehicleShield Logo" className="h-8 w-auto" />
          <span className="ml-2 text-xl font-bold text-gray-900">VehicleShield</span>
        </div>
        <ConnectButton />
      </nav>
    </header>
  )
}

export default Header

