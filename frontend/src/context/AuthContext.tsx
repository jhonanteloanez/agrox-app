import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    status: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('agrox_token');
        const savedUser = localStorage.getItem('agrox_user');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    // Global 401 interceptor: auto-logout on expired / invalid tokens.
    // Patches window.fetch once on mount; no page-level changes needed.
    useEffect(() => {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
            const response = await originalFetch(...args);

            const url =
                typeof args[0] === 'string'
                    ? args[0]
                    : args[0] instanceof URL
                    ? args[0].href
                    : (args[0] as Request).url;

            // Skip auth routes to avoid redirect loops on login/register
            if (response.status === 401 && !url.includes('/api/auth/')) {
                localStorage.removeItem('agrox_token');
                localStorage.removeItem('agrox_user');
                window.location.replace('/login');
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('agrox_token', newToken);
        localStorage.setItem('agrox_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('agrox_token');
        localStorage.removeItem('agrox_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
