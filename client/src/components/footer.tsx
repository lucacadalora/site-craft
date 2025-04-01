import React from "react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        <div className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} LandingCraft. All rights reserved.
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2 md:mt-0">
          <Link href="/docs" className="hover:text-primary">Documentation</Link>
          <Link href="/api" className="hover:text-primary">API</Link>
          <Link href="/support" className="hover:text-primary">Support</Link>
        </div>
      </div>
    </footer>
  );
}
