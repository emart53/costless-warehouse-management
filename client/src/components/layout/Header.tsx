import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["/api/notifications?unread=true"],
  });

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search inventory..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <Search className="absolute left-3 top-3 text-neutral-400" size={16} />
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="relative p-2">
              <Bell size={18} />
              {unreadNotifications.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 text-xs px-1 min-w-[1.25rem] h-5 flex items-center justify-center"
                >
                  {unreadNotifications.length}
                </Badge>
              )}
            </Button>
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
                  JD
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-neutral-900">John Doe</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
