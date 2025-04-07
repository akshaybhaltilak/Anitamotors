import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">ANITA</span>
              <span className="text-blue-300"> MOTORS</span>
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Leading the revolution in electric mobility with cutting-edge technology, 
              sustainable solutions, and exceptional customer service.
            </p>
            <div className="flex space-x-3 pt-2">
              <a href="#" className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                <Instagram size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition-colors">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 border-b border-blue-700 pb-2">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              <a href="/" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> Home
              </a>
              <a href="/vehicles" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> Vehicles
              </a>
              <a href="/service" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> Services
              </a>
              <a href="/accessories" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> Accessories
              </a>
              <a href="/about" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> About Us
              </a>
              <a href="/contact" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> Contact
              </a>
              <a href="/test-drive" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> Test Drive
              </a>
              <a href="/news" className="text-blue-100 hover:text-white text-sm py-1 flex items-center">
                <ArrowRight size={12} className="mr-1" /> News
              </a>
            </div>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4 border-b border-blue-700 pb-2">Contact Us</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <MapPin size={16} className="mr-2 mt-1 text-blue-300" />
                <span className="text-sm text-blue-100">Shop no 2, Rahate complex, jawahar nagar, Akola 444001</span>
              </div>
              <div className="flex items-center">
                <Phone size={16} className="mr-2 text-blue-300" />
                <a href="tel:+919876543210" className="text-sm text-blue-100 hover:text-white">+91 8468857781</a>
              </div>
              <div className="flex items-center">
                <Mail size={16} className="mr-2 text-blue-300" />
                <a href="mailto:info@anitamotors.com" className="text-sm text-blue-100 hover:text-white">anitamotors7@gmail.com</a>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Subscribe to Newsletter</h4>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email address" 
                  className="px-3 py-2 rounded-l-md bg-blue-800/50 border border-blue-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
                />
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 rounded-r-md transition-colors">
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Credits */}
      <div className="bg-blue-950 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-blue-300">
            <div className="mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} Anita Motors. All rights reserved.
            </div>
            <div className="flex items-center">
              <span>Designed & Developed by</span>
              <a href="https://webreich.com" className="ml-1 font-semibold text-white hover:text-blue-200 flex items-center">
                WebReich Technologies
                <span className="ml-1 bg-blue-700 text-xs px-1 rounded">CRM</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;