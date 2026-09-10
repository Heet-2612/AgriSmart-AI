import { useEffect, useRef } from 'react';

export const ChatAssistant = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isOpen && !isInitialized.current) {
      // Add the CSS
      const link = document.createElement('link');
      link.href = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Add the chat widget script
      const script = document.createElement('script');
      script.type = 'module';
      script.innerHTML = `
        import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

        createChat({
          webhookUrl: 'https://n8n-lamm.onrender.com/webhook/9d63f026-b368-413b-827b-2a7048b26366/chat',
          target: '#n8n-chat-container',
          showWelcomeScreen: true,
          showFloatingChatButton: false
        });
      `;
      document.body.appendChild(script);
      isInitialized.current = true;

      // Clean up function
      return () => {
        document.head.removeChild(link);
        document.body.removeChild(script);
        const chatContainer = document.getElementById('n8n-chat-container');
        if (chatContainer) {
          chatContainer.innerHTML = '';
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="bg-primary text-white p-4 flex justify-between items-center">
          <h3 className="font-semibold">Chat Assistant</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl w-8 h-8 flex items-center justify-center"
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>
        <div id="n8n-chat-container" className="flex-1" style={{ minHeight: '500px' }} />
      </div>
    </div>
  );
};