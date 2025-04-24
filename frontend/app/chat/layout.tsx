'use client';

import { supabase } from '@/providers/supabase';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SidebarLayout from '../sidebar-layout';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const [title, setTitle] = useState('');

  useEffect(() => {
    async function fetchChatTitle() {
      if (!params?.id) return;

      const { data: chatData, error } = await supabase
        .from('chats')
        .select('title')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching chat title:', error);
        return;
      }

      if (chatData?.title) {
        setTitle(chatData.title);
      }
    }

    fetchChatTitle();
  }, [params?.id]);

  return <SidebarLayout title={title}>{children}</SidebarLayout>;
}
