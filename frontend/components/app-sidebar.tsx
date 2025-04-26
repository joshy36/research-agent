'use client';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from './ui/sidebar';

function ChatList({ pathname }: { pathname: string }) {
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    async function fetchChats() {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const chatItems = data.map((chat) => ({
          id: chat.id,
          title: chat.title,
          url: `/chat/${chat.id}`,
        }));

        setChats(chatItems);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    }

    fetchChats();
  }, []); // Remove chatId dependency

  const navItems = useMemo(
    () =>
      chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        url: chat.url,
        isActive: pathname === chat.url,
      })),
    [chats, pathname],
  );

  return <NavMain items={navItems} pathname={pathname} />;
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/chat" className="hover:bg-sidebar-accent rounded-md p-2">
          Home
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ChatList pathname={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
