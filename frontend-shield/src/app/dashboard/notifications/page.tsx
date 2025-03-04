//src/app/dashboard/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Clock, Filter, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
//import { Separator } from '@/app/components/ui/separator';
import { Card } from '@/app/components/ui/card';
import {  formatDistanceToNow } from 'date-fns';

// Types
type NotificationType = 'info' | 'warning' | 'success';
type NotificationStatus = 'read' | 'unread';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  timestamp: Date;
  link?: string;
}

const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

// Mock data - replace with actual API call later
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Policy Renewal',
    message: 'Your car insurance policy for Toyota Corolla (KDM 234P) is due for renewal in 7 days.',
    type: 'warning',
    status: 'unread',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    link: '/dashboard/policies'
  },
  {
    id: '2',
    title: 'Claim Status Update',
    message: 'Your claim #CL-2023-005 has been approved. Payment will be processed within 48 hours.',
    type: 'success',
    status: 'unread',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    link: '/dashboard/claims'
  },
  {
    id: '3',
    title: 'Document Verification',
    message: 'Your driving license has been successfully verified.',
    type: 'success',
    status: 'read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    id: '4',
    title: 'System Maintenance',
    message: 'The system will undergo maintenance on Sunday, June 15th from 2AM to 4AM UTC.',
    type: 'info',
    status: 'read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
  {
    id: '5',
    title: 'New Feature: Vehicle Tracking',
    message: 'We have added a new vehicle tracking feature. Enable it in your vehicle settings.',
    type: 'info',
    status: 'read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    link: '/dashboard/vehicles'
  }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>(notifications);
  const [activeTab, setActiveTab] = useState('all');
  
  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  
  // Filter notifications based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredNotifications(notifications);
    } else if (activeTab === 'unread') {
      setFilteredNotifications(notifications.filter(n => n.status === 'unread'));
    } else if (activeTab === 'read') {
      setFilteredNotifications(notifications.filter(n => n.status === 'read'));
    }
  }, [activeTab, notifications]);

  // Handle marking a notification as read
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id 
        ? { ...notification, status: 'read' } 
        : notification
    ));
  };

  // Handle marking all notifications as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, status: 'read' })));
  };

  // Get icon based on notification type
  

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Bell className="h-6 w-6 mr-2 text-blue-600" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-3">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex items-center">
              <Check className="h-4 w-4 mr-1" /> 
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread" className="relative">
                Unread
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="sm" className="flex items-center">
              <Filter className="h-4 w-4 mr-1" /> 
              Filter
            </Button>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <NotificationList 
              notifications={filteredNotifications} 
              onMarkAsRead={markAsRead} 
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-0">
            <NotificationList 
              notifications={filteredNotifications} 
              onMarkAsRead={markAsRead} 
            />
          </TabsContent>
          
          <TabsContent value="read" className="mt-0">
            <NotificationList 
              notifications={filteredNotifications} 
              onMarkAsRead={markAsRead} 
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// Notification List Component
function NotificationList({ 
  notifications, 
  onMarkAsRead 
}: { 
  notifications: Notification[], 
  onMarkAsRead: (id: string) => void 
}) {
  if (notifications.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <Bell className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No notifications</h3>
        <p className="text-sm text-gray-500 mt-1">
          You do not have any notifications in this category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-lg border ${
              notification.status === 'unread' 
                ? 'bg-blue-50 border-blue-100' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className={`text-sm font-medium ${
                    notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {notification.title}
                  </h3>
                  <div className="flex items-center ml-2">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <p className={`text-sm mt-1 ${
                  notification.status === 'unread' ? 'text-gray-800' : 'text-gray-600'
                }`}>
                  {notification.message}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  {notification.link ? (
                    <a 
                      href={notification.link} 
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View details
                    </a>
                  ) : (
                    <div></div>
                  )}
                  
                  {notification.status === 'unread' && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onMarkAsRead(notification.id)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}