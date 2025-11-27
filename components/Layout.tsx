import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils/helpers";
import { useSettings } from "../context/SettingsContext";
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  FileText,
  TrendingUp,
  CreditCard,
  Menu,
  RiyalIcon,
  RiyalInBoxIcon,
  Briefcase,
  Settings,
  History,
  DoorOpen
} from "./Icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { t, direction } = useSettings();

  const navigationItems = [
    {
      title: t('home'),
      url: "/",
      icon: Home,
    },
    {
      title: t('dashboard'),
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: t('properties'),
      url: createPageUrl("Properties"),
      icon: Building2,
    },
    {
      title: t('units'),
      url: createPageUrl("Units"),
      icon: DoorOpen,
    },
    {
      title: t('tenants'),
      url: createPageUrl("Tenants"),
      icon: Users,
    },
    {
      title: t('contracts'),
      url: createPageUrl("Contracts"),
      icon: FileText,
    },
    {
      title: t('rentPayments'),
      url: createPageUrl("RentPayments"),
      icon: RiyalInBoxIcon,
    },
    {
      title: t('leasePayments'),
      url: createPageUrl("LeasePayments"),
      icon: CreditCard,
    },
    {
      title: t('expenses'),
      url: createPageUrl("Expenses"),
      icon: RiyalIcon,
    },
  ];

  const financialItems = [
      {
      title: t('incomeProfit'),
      url: createPageUrl("Reports"),
      icon: TrendingUp,
    },
     {
      title: t('partners'),
      url: createPageUrl("Partners"),
      icon: Briefcase,
    },
  ];

  const archiveItems = [
      {
      title: t('history'),
      url: createPageUrl("History"),
      icon: History,
    },
  ];

  return (
    <SidebarProvider>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      <div className="min-h-screen flex w-full bg-slate-50" dir={direction}>
        <Sidebar className="border-r border-slate-200 bg-white flex flex-col rtl:border-l rtl:border-r-0">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">RentalPro</h2>
                <p className="text-xs text-slate-500">Property Management</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3 flex-grow">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                {t('management')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`transition-all duration-200 rounded-lg mb-1 ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                {t('financial')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {financialItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`transition-all duration-200 rounded-lg mb-1 ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                {t('system')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                          asChild 
                          className={`transition-all duration-200 rounded-lg mb-1 ${
                            location.pathname === '/settings'
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5">
                            <Settings className={`w-5 h-5 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-slate-500'}`} />
                            <span>{t('settings')}</span>
                          </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                  {archiveItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`transition-all duration-200 rounded-lg mb-1 ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

           <div className="p-3 border-t border-slate-200">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                          onClick={() => setShowChangePassword(true)}
                          className={'w-full transition-all duration-200 rounded-lg mb-1 hover:bg-slate-50 text-slate-700'}
                        >
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <Settings className={'w-5 h-5 text-slate-500'} />
                            <span>{t('changePassword')}</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                </SidebarMenu>
            </div>
        </Sidebar>

        <main className="flex-1 flex flex-col w-full overflow-x-hidden">
          <header className="bg-white border-b border-slate-200 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-slate-900">RentalPro</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}