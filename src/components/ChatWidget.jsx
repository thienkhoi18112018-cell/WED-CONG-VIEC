import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import './ChatWidget.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-menu animate-fade-in">
          <div className="chat-header">
            <h4>Hỗ trợ trực tuyến</h4>
            <button onClick={() => setIsOpen(false)} className="close-btn"><X size={16} /></button>
          </div>
          <div className="chat-options">
            <a href="https://zalo.me/0901989693" target="_blank" rel="noreferrer" className="chat-option zalo">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" alt="Zalo" width="24" />
              <span>Chat qua Zalo</span>
            </a>
            <a href="https://m.me/your-page-id" target="_blank" rel="noreferrer" className="chat-option messenger">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg" alt="Messenger" width="24" />
              <span>Chat qua Messenger</span>
            </a>
          </div>
        </div>
      )}
      <button 
        className={`chat-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle size={28} color="white" />
      </button>
    </div>
  );
};

export default ChatWidget;
