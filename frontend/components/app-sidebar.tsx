'use client';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/supabase';
import { Search } from 'lucide-react';
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
  const { user } = useAuth();

  useEffect(() => {
    async function fetchChats() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
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

    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user_id=eq.${user?.id}`,
        },
        async () => {
          await fetchChats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <Link
          href="/chat"
          className="hover:bg-sidebar-accent rounded-md p-2 flex items-center gap-2 font-bold"
        >
          <Search className="h-4 w-4" />
          New Research Query
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ChatList pathname={pathname} />
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
