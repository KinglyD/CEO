import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, UserIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
      isScrolled ? 'bg-matte/95 backdrop-blur-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="text-2xl font-clash font-bold text-white hover:text-gold transition-colors">
          CEO
        </a>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="/explore" className="nav-link">Explore</a>
          <a href="/impact" className="nav-link">Impact</a>
          <a href="/about" className="nav-link">About</a>
        </div>

        {/* Right Icons */}
        <div className="flex items-center space-x-6">
          <button className="nav-link">
            <MagnifyingGlassIcon className="w-6 h-6" />
          </button>
          <button className="nav-link">
            <UserIcon className="w-6 h-6" />
          </button>
          <button className="nav-link">
            <ShoppingCartIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;