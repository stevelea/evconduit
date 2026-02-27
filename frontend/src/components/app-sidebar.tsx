'use client'
import { useEffect, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { navigation } from "@/constants/navigation"
import {
  ChevronDown, Map, Zap, MessageCircle, Bot, ExternalLink, Globe,
  Link2, BookOpen, Star, Heart, Gift, Coffee,
  Car, Wrench, Shield, Bell, Mail, Phone, FileText,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import NavUser from "./NavUser";
import SidebarLogoHeader from "./SidebarLogoHeader"
import { NavLinkButton } from "./NavLinkButton"
import { useUserInfo } from "@/hooks/useUserInfo"

const ICON_MAP: Record<string, LucideIcon> = {
  Map, Zap, MessageCircle, Bot, ExternalLink, Globe,
  Link2, BookOpen, Star, Heart, Gift, Coffee,
  Car, Wrench, Shield, Bell, Mail, Phone, FileText,
};

type UsefulLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  is_external: boolean;
  sort_order: number;
};

export function AppSidebar() {
    const { isAdmin } = useUserInfo();
    const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>([]);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        fetch(`${apiUrl}/public/useful-links`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setUsefulLinks(data))
            .catch(() => {});
    }, []);

  return (
    <Sidebar className="w-64 flex-shrink-0 relative z-10 !border-none" collapsible="icon">
        <SidebarLogoHeader />
        <SidebarContent className="bg-[#0A2245] text-white">
            <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger>
                            <span className="text-white">General</span>
                            <ChevronDown className="text-white ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navigation[0].items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <NavLinkButton href={item.href}>
                                            <item.icon />
                                            <span className="ml-2">{item.title}</span>
                                        </NavLinkButton>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
            <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger>
                            <span className="text-white">Guides</span>
                            <ChevronDown className="text-white ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navigation[1].items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <NavLinkButton href={item.href}>
                                            <item.icon />
                                            <span className="ml-2">{item.title}</span>
                                        </NavLinkButton>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
            {usefulLinks.length > 0 && (
            <Collapsible className="group/collapsible">
                <SidebarGroup>
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger>
                            <span className="text-white">Useful Links</span>
                            <ChevronDown className="text-white ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {usefulLinks.map((link) => {
                                    const Icon = link.icon ? ICON_MAP[link.icon] : Link2;
                                    return (
                                        <SidebarMenuItem key={link.id}>
                                            <SidebarMenuButton asChild>
                                                {link.is_external ? (
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                        <Icon />
                                                        <span className="ml-2">{link.label}</span>
                                                    </a>
                                                ) : (
                                                    <NavLinkButton href={link.url}>
                                                        <Icon />
                                                        <span className="ml-2">{link.label}</span>
                                                    </NavLinkButton>
                                                )}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
            )}
            { isAdmin && (
            <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroup>
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger>
                            <span className="text-white">Admin</span>
                            <ChevronDown className="text-white ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                            {navigation[2].items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                    <NavLinkButton href={item.href}>
                                    <item.icon />
                                    <span className="ml-2">{item.title}</span>
                                    </NavLinkButton>
                                </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
            )}
        </SidebarContent>
        <SidebarFooter >
            <SidebarMenu>
                <SidebarMenuItem>
                    <NavUser/>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}