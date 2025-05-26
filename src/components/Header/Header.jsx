import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  LogOut, 
  Home, 
  Users, 
  Truck, 
  Wrench, 
  Package, 
  Settings,
  Calendar,
  FileText,
  UserCog,
  DollarSign,
  BarChart2,
  Shield,
  BrickWall
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const handleLogout = () => {
    // Clear user session
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  const navigateTo = (path) => {
    navigate(path);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  // Navigation items with icons
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: Home },
    { path: '/workers', name: 'Manage Workers', icon: Users },
    { path: '/vehicles', name: 'Vehicle Fleet', icon: Truck },
    { path: '/spare-parts', name: 'Spare Parts', icon: Package },
    { path: '/maintenance', name: 'Maintenance', icon: Wrench },
    { path: '/services', name: 'Services', icon: Settings },
    // { path: '/bill', name: 'Billing', icon: BrickWall },
  ];

  // Check if current route is active
  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 sticky top-0 z-50 shadow-lg border-b border-blue-700">
      {/* Main header */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and branding */}
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
          
          {/* Desktop Navigation - Main items */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.slice(0, 6).map((item) => (
              <button
                key={item.path}
                onClick={() => navigateTo(item.path)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all group
                  ${isActive(item.path) 
                    ? 'bg-blue-700 text-white shadow-inner' 
                    : 'bg-blue-700/30 hover:bg-blue-700/50 text-white hover:text-blue-200'}`}
              >
                <item.icon className={`h-4 w-4 ${isActive(item.path) ? 'text-blue-200' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
            
            {/* More dropdown */}
            <div className="relative group">
              <button className="flex items-center space-x-2 bg-blue-700/30 hover:bg-blue-700/50 px-3 py-1.5 rounded-md text-white hover:text-blue-200 transition-all">
                <span className="text-sm font-medium">More</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="absolute right-0 mt-2 w-56 origin-top-right bg-blue-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  {navItems.slice(6).map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigateTo(item.path)}
                      className={`block w-full text-left px-4 py-2 text-sm flex items-center space-x-2
                        ${isActive(item.path) 
                          ? 'bg-blue-700 text-white' 
                          : 'text-blue-200 hover:bg-blue-700/50 hover:text-white'}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-600/30 hover:bg-red-600/50 px-3 py-1.5 rounded-md text-white hover:text-red-200 transition-all group ml-2"
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
        <div className="md:hidden bg-blue-800/95 backdrop-blur-sm w-full absolute left-0 px-4 py-3 shadow-xl animate-fadeIn border-t border-blue-700">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className={`flex flex-col items-center justify-center p-3 rounded-md transition-colors
                    ${isActive(item.path) 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-blue-700/30 hover:bg-blue-700/50 text-white'}`}
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              ))}
            </div>
            
            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-600/30 hover:bg-red-600/50 text-white py-2.5 rounded-md font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
            
            {/* Powered by */}
            <div className="w-full text-center border-t border-blue-700/50 pt-4 mt-4">
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