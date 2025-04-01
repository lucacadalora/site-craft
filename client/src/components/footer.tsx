import React from 'react';

export function Footer() {
  return (
    <footer className="mt-auto py-6 bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="font-bold text-white">Landing Craft by AI Accelerate</span> &copy; {new Date().getFullYear()}
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="mt-4 md:mt-0 text-sm">
            Powered by <span className="font-semibold">AI Accelerate™ Technology</span>
          </div>
        </div>
      </div>
    </footer>
  );
}