import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const getSocketURL = () => {
            if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
            
            const isProduction = window.location.hostname.includes('equisense.vercel.app') || 
                                 window.location.hostname.includes('equisense.shop');
            
            if (isProduction) return 'https://equisense.onrender.com';
            return 'http://localhost:5001';
        };

        const socketUrl = getSocketURL();
        const newSocket = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Re-register user when they log in
    useEffect(() => {
        if (socket && user) {
            socket.emit('register', user.id);
        }
    }, [socket, user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
