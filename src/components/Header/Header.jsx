import React, { useState } from 'react';
import { Menu, X, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const handleLogout = () => {
    // Implement logout functionality
    // Clear any user session/tokens
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    // Redirect to login page
    navigate('/login');
  };
  
  const goToDashboard = () => {
    navigate('/dashboard');
    // Close menu if open
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 sticky top-0 z-50 shadow-lg">
      {/* Main header */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and branding with powered by */}
          <div className="flex items-center">
            <div className="flex flex-col">
              <div className="flex items-end">
                <h1 className="text-white font-bold text-2xl md:text-3xl leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">ANITA</span>
                  <span className="text-blue-300"> MOTORS</span>
                </h1>
              </div>
              <div className="text-[0.6rem] md:text-xs text-blue-400 mt-[-2px]">
                <span className="opacity-80">Powered by </span>
                <a
                  href="https://webreich.com"
                  className="font-medium text-blue-300 hover:text-blue-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WebReich Technologies
                </a>
              </div>
            </div>
          </div>
          
          {/* Desktop - Navigation buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <button 
              onClick={goToDashboard}
              className="flex items-center space-x-2 bg-blue-700/30 hover:bg-blue-700/50 px-3 py-1.5 rounded-md text-white hover:text-blue-200 transition-all group"
            >
              <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-blue-700/30 hover:bg-blue-700/50 px-3 py-1.5 rounded-md text-white hover:text-blue-200 transition-all group"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-800/95 backdrop-blur-sm w-full absolute left-0 px-4 py-3 shadow-xl animate-fadeIn">
          <div className="container mx-auto flex flex-col items-center">
            {/* Mobile dashboard button */}
            <button 
              onClick={goToDashboard}
              className="w-full max-w-xs flex items-center justify-center space-x-2 bg-blue-700/30 hover:bg-blue-700/50 text-white py-2.5 rounded-md font-medium mb-3 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            
            {/* Mobile logout button */}
            <button 
              onClick={handleLogout}
              className="w-full max-w-xs flex items-center justify-center space-x-2 bg-blue-700/30 hover:bg-blue-700/50 text-white py-2.5 rounded-md font-medium mb-4 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
            
            {/* Powered by - consistent with desktop */}
            <div className="w-full text-center border-t border-blue-700/50 pt-4">
              <div className="text-xs text-blue-400">
                <p className="opacity-80">Experience enhanced by</p>
                <a
                  href="https://webreich.com"
                  className="font-medium text-blue-300 hover:text-blue-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WebReich Technologies
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
