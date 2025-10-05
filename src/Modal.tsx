import React, { useState } from 'react';

export const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => {}, children: React.ReactNode }) => {
  if (!isOpen) return null; // Don't render if not open

  return (
    <div 
      onClick={onClose} // Close modal when clicking outside the content
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000 // Ensure modal is on top
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} // Prevent closing when clicking modal content
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          width: '90%',
          position: 'relative'
        }}
      >
        {children}{/* Modal content */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '1.2em',
            cursor: 'pointer'
          }}
        >
          &times;{/* Close button */}
        </button>
      </div>
    </div>
  );
};

export default Modal;