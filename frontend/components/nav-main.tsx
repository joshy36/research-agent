'use client';

import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

export function NavMain({
  items,
  pathname,
}: {
  items: {
    id: string;
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
  }[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={pathname === item.url}
              asChild
            >
              <Link href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
