import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
const Context = createContext(null);
export const useAuth = () => useContext(Context);
export function AuthProvider({children}) {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{api('/auth/me').then(d=>setUser(d.user)).catch(()=>{}).finally(()=>setLoading(false));},[]);
  const login = async (form,register=false) => { const data=await api(register?'/auth/register':'/auth/login',{method:'POST',body:JSON.stringify(form)});setUser(data.user);return data.user;};
  const logout = async () => {await api('/auth/logout',{method:'POST'});setUser(null);};
  const toggleWishlist=async id => { const d=await api('/auth/wishlist/'+id,{method:'POST'});setUser(u=>({...u,wishlist:d.wishlist})); };
  return <Context.Provider value={{user,setUser,loading,login,logout,toggleWishlist}}>{children}</Context.Provider>;
}
