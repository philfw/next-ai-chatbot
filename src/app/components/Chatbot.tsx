'use client';
import { useState, FormEvent, KeyboardEvent, ChangeEvent } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: { type: string; text: string }[];
  isStreaming?: boolean;
};

const Chatbot = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async (e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const updatedMessages = [
      ...messages,
      { role: 'user', content: [{ type: 'text', text: inputValue }] }
    ];

    setMessages([...updatedMessages, { 
      role: 'assistant', 
      content: [{ type: 'text', text: '' }],
      isStreaming: true 
    }]);
    
    setInputValue('');

    try {
      const response = await fetch('./api/converse', {
        method: 'POST',
        body: JSON.stringify(updatedMessages),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        streamedText += chunk;

        setMessages(msgs => msgs.map((msg, i) => 
          i === msgs.length - 1
            ? { 
                ...msg, 
                content: [{ type: 'text', text: streamedText }] 
              }
            : msg
        ));
      }

      // Remove streaming flag when complete
      setMessages(msgs => msgs.map((msg, i) => 
        i === msgs.length - 1
          ? { ...msg, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error('Error:', error);
      setMessages(msgs => msgs.slice(0, -1)); // Remove assistant message on error
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4">
      <div className="mb-4 space-y-2 max-h-[85vh] overflow-y-auto">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-lg ${
              msg.role === 'user' ? 'bg-sky-600' : 'bg-gray-600'
            }`}
          >
            {msg.content[0].text}
            {msg.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
            )}
          </div>
        ))}
      </div>
      
      <form onSubmit={sendMessage} className="flex gap-2">
        <textarea
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
          className="flex-1 p-2 border rounded-lg resize-none text-black"
          rows={3}
          placeholder="Type your message..."
        />
        <button 
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;