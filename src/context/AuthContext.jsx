import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create profile for user
  const fetchProfile = async (currentUser) => {
    if (!currentUser || !isSupabaseConfigured) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setProfile(data);
        return data;
      }

      // If no profile exists yet, create one from user metadata
      const meta = currentUser.user_metadata || {};
      const newProfile = {
        id: currentUser.id,
        full_name: meta.full_name || currentUser.email?.split('@')[0] || 'User',
        role: meta.role || 'seeker',
        company_name: meta.company_name || null,
        skills: [],
        experience_years: 0,
        education: '',
        cv_path: null,
      };

      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default profile:', insertError);
        setProfile(newProfile);
        return newProfile;
      }

      setProfile(createdProfile);
      return createdProfile;
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchProfile(activeUser);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ email, password, full_name, role, company_name }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please enter your Supabase URL and Key in .env');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
          company_name: role === 'recruiter' ? company_name : null,
        },
      },
    });

    if (error) throw error;

    // Proactively upsert into profiles if session was returned
    if (data?.user) {
      const profileData = {
        id: data.user.id,
        full_name,
        role,
        company_name: role === 'recruiter' ? company_name : null,
        skills: [],
        experience_years: 0,
        education: '',
      };

      await supabase.from('profiles').upsert(profileData);
      setUser(data.user);
      setProfile(profileData);
    }

    return data;
  };

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please enter your Supabase URL and Key in .env');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data?.user) {
      setUser(data.user);
      await fetchProfile(data.user);
    }

    return data;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      return await fetchProfile(user);
    }
  };

  const value = {
    user,
    profile,
    role: profile?.role || user?.user_metadata?.role || null,
    loading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
