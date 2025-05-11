'use client';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SidebarLayout from '../sidebar-layout';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    async function fetchChatTitle() {
      if (!params?.id || params.id === 'chat') {
        setTitle('');
        return;
      }

      const { data: chatData, error } = await supabase
        .from('chats')
        .select('title, user_id')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching chat title:', error);
        setTitle('');
        return;
      }

      // If no user or chat doesn't belong to user, redirect
      if (!user || chatData.user_id !== user.id) {
        router.push('/chat');
        return;
      }

      if (chatData?.title) {
        setTitle(chatData.title);
      }
    }

    fetchChatTitle();
  }, [params?.id, router, user]);

  return <SidebarLayout title={title}>{children}</SidebarLayout>;
}
