'use client';

import { createClient } from '@supabase/supabase-js';
import { SquareTerminal } from 'lucide-react';
import * as React from 'react';

import { NavMain } from './nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from './ui/sidebar';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchTasks() {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const taskItems = data.map((task) => ({
          title: task.message,
          url: `/chat/${task.task_id}`,
        }));

        setTasks(taskItems);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

  const navItems = [
    {
      title: 'Chats',
      url: '',
      icon: SquareTerminal,
      isActive: true,
      items: tasks,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <button
          onClick={() => (window.location.href = '/')}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-colors hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-50 dark:hover:bg-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </button>
      </SidebarHeader>
      <SidebarContent>
        {loading ? <div>Loading tasks...</div> : <NavMain items={navItems} />}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
