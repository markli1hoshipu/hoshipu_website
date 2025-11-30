// src/components/Layout.jsx
import React from 'react';
import '../styles/layout.css'; // Import the layout styles

function Layout({ children }) {
  return (
    <div className="app-layout">
      {/* You could add a Header or Sidebar component here if part of your layout */}
      <main className="main-content">
        {children} {/* This is where your page content goes */}
      </main>
      {/* You could add a Footer component here */}
    </div>
  );
}

// Add the default export here
export default Layout;