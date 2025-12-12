import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 transform bg-indigo-900 transition duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 lg:hidden hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
        </Header>

        {/* Scrollable main area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-20 lg:p-6">
          <div className="container mx-auto max-w-7xl">
            <Outlet />
          </div>

          {/* Footer - Pushed to bottom of scrollable area */}
          <footer className="mt-auto bg-white border-t border-gray-200 py-4 px-4 lg:hidden">
            <div className="container mx-auto text-center text-sm text-gray-600">
              Powered by{' '}
              <a
                href="https://www.botivate.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Botivate
              </a>
            </div>
          </footer>
        </main>

        <footer className="hidden lg:block bg-white border-t border-gray-200 py-3 px-4">
          <div className="container mx-auto text-center text-sm text-gray-600">
            Powered by{' '}
            <a
              href="https://www.botivate.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Botivate
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;