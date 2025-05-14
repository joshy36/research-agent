'use client';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SidebarLayout from '../sidebar-layout';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    async function checkChatAccess() {
      if (!params?.id || params.id === 'chat') {
        return;
      }

      const { data: chatData, error } = await supabase
        .from('chats')
        .select('user_id')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error checking chat access:', error);
        return;
      }

      // If no user or chat doesn't belong to user, redirect
      if (!user || chatData.user_id !== user.id) {
        router.push('/chat');
      }
    }

    checkChatAccess();
  }, [params?.id, router, user]);

  return <SidebarLayout>{children}</SidebarLayout>;
}
