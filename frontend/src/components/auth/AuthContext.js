import { createContext } from 'react';

/** { status: 'anonymous' | 'loading' | 'authenticated' | 'error', user, error, retry, signIn, logout } */
export const AuthContext = createContext(null);
