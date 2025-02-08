const Footer = () => {
    return (
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Product</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="#features" className="text-gray-600 hover:text-gray-900">Features</a></li>
                <li><a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a></li>
                <li><a href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Company</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="/about" className="text-gray-600 hover:text-gray-900">About</a></li>
                <li><a href="/blog" className="text-gray-600 hover:text-gray-900">Blog</a></li>
                <li><a href="/contact" className="text-gray-600 hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</a></li>
                <li><a href="/terms" className="text-gray-600 hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Connect</h3>
              <ul className="mt-4 space-y-3">
                <li><a href="https://x.com/nationalist_ke" className="text-gray-600 hover:text-gray-900">Twitter</a></li>
                <li><a href="https://discord.com/users/1330244338139271318" className="text-gray-600 hover:text-gray-900">Discord</a></li>
                <li><a href="https://github.com/wachira7" className="text-gray-600 hover:text-gray-900">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t">
            <p className="text-gray-400 text-sm text-center">
              © {new Date().getFullYear()} VehicleShield. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    )
  }
  
  export default Footer