'use server';

import { createClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    // Instead of redirecting, we'll throw an error that will be caught by Next.js
    throw new Error(error.message);
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect('/error');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    throw new Error(error.message);
  }

  // Since email confirmations are disabled, we can directly sign in the user
  const { error: signInError } = await supabase.auth.signInWithPassword(data);

  if (signInError) {
    throw new Error(signInError.message);
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
