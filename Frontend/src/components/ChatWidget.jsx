import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your EquiSense Intelligence assistant. You can ask me about platform features, general financial concepts, or how to get started.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const widgetRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            
            const handleClickOutside = (event) => {
                if (widgetRef.current && !widgetRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const newMessages = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/strategy/chat', { 
                messages: newMessages,
                mode: 'support' 
            });
            if (response.data && response.data.content) {
                setMessages([...newMessages, { role: 'assistant', content: response.data.content }]);
            } else {
                setMessages([...newMessages, { role: 'assistant', content: 'I encountered an error retrieving data. Please try again.' }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages([...newMessages, { role: 'assistant', content: 'An error occurred while connecting to the AI Strategist.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={widgetRef} className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[380px] sm:w-[420px] h-[600px] max-h-[80vh] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col font-sans"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                        EquiSense Intelligence
                                        <Sparkles className="w-3 h-3 text-rose-400" />
                                    </h3>
                                    <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Institutional Agent</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-end gap-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-orange-500' : 'bg-slate-900'}`}>
                                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                        </div>
                                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-orange-500 text-white rounded-br-none' 
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                        }`}>
                                            {msg.role === 'user' ? (
                                                msg.content
                                            ) : (
                                                <div className="prose prose-sm prose-slate prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-a:text-rose-500 hover:prose-a:text-rose-600 prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-2 max-w-[85%]">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                                    </div>
                                    <div className="px-5 py-4 rounded-2xl rounded-bl-none bg-white border border-slate-200 shadow-sm flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                            <form onSubmit={handleSend} className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about live prices, sentiment, or strategies..."
                                    className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 transition-all"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-600 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                            <p className="text-center mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                AI can make mistakes. Verify critical data.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-colors ${
                    isOpen ? 'bg-rose-600 shadow-rose-600/30' : 'bg-slate-900 shadow-slate-900/30 hover:bg-rose-600'
                }`}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
                )}
            </motion.button>
        </div>
    );
};

export default ChatWidget;
