
import React, { createContext, useContext, useState } from 'react';
import { X } from '../Icons';

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const Sidebar = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => {
  const { isOpen, setIsOpen } = useSidebar();
  return (
    <>
      <aside className={`fixed lg:relative lg:translate-x-0 h-screen w-72 transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}>
        {children}
      </aside>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

export const SidebarTrigger = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => {
  const { setIsOpen } = useSidebar();
  return (
    <button onClick={() => setIsOpen(true)} className={className}>
      {children}
    </button>
  );
};

export const SidebarHeader = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
    <div className={`relative ${className}`}>
        {children}
        <button onClick={() => useContext(SidebarContext)?.setIsOpen(false)} className="absolute top-2 right-2 lg:hidden p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5"/>
        </button>
    </div>
);

export const SidebarContent = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <div className={`overflow-y-auto h-full ${className}`}>{children}</div>;
export const SidebarGroup = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
export const SidebarGroupLabel = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
export const SidebarGroupContent = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
export const SidebarMenu = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <ul className={className}>{children}</ul>;

export const SidebarMenuItem = ({ children, className = '', ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
  <li className={className} {...props}>{children}</li>
);

export const SidebarMenuButton = ({ children, className = '', asChild = false, ...props }: { children?: React.ReactNode; className?: string; asChild?: boolean } & React.HTMLAttributes<HTMLElement>) => {
  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement;
    return React.cloneElement(child, {
      ...props,
      className: `${child.props.className || ''} ${className || ''}`.trim()
    });
  }
  return <button className={className} {...props}>{children}</button>;
};
