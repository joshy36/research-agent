'use client';

import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/providers/supabase';
import { SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentProps, useEffect, useState } from 'react';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from './ui/sidebar';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const [chats, setChats] = useState<any[]>([]);
  const { user } = useAuth();
  const pathname = usePathname();
  const chatId = pathname.split('/').pop();
  console.log('CHATID: ', chatId);

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
  }, [chatId]);

  const navItems = [
    {
      title: 'Chats',
      url: '',
      icon: SquareTerminal,
      isActive: true,
      items: chats,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/" className="hover:bg-sidebar-accent rounded-md p-2">
          Home
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} pathname={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
