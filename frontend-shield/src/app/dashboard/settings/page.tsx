// src/app/dashboard/settings/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Bell,  Lock, Globe, Moon, Sun, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    claimUpdates: true,
    policyReminders: true,
    marketingEmails: false,
    twoFactorAuth: false,
    autoConnect: true,
    highSecurity: false,
    language: 'english'
  });
  
  const handleSettingChange = (setting: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize how VehicleShield appears on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Theme</h3>
                <RadioGroup 
                  value={theme} 
                  onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center">
                      <Sun size={16} className="mr-2" /> Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center">
                      <Moon size={16} className="mr-2" /> Dark
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system">System Default</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Language</h3>
                <RadioGroup 
                  value={settings.language} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="english" id="english" />
                    <Label htmlFor="english" className="flex items-center">
                      <Globe size={16} className="mr-2" /> English
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="spanish" id="spanish" />
                    <Label htmlFor="spanish" className="flex items-center">
                      <Globe size={16} className="mr-2" /> Spanish
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="french" id="french" />
                    <Label htmlFor="french" className="flex items-center">
                      <Globe size={16} className="mr-2" /> French
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Wallet Connection</CardTitle>
              <CardDescription>
                Manage how your wallet connects to VehicleShield
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoConnect">Auto-connect wallet</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically connect your wallet when you visit
                  </p>
                </div>
                <Switch
                  id="autoConnect"
                  checked={settings.autoConnect}
                  onCheckedChange={(value) => handleSettingChange('autoConnect', value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>
                Choose how you want to receive updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(value) => handleSettingChange('emailNotifications', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="smsNotifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive text messages for urgent updates
                  </p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={settings.smsNotifications}
                  onCheckedChange={(value) => handleSettingChange('smsNotifications', value)}
                />
              </div>
              
              <div className="pt-4">
                <h3 className="text-sm font-medium mb-3">Alert Types</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="claimUpdates">Claim Updates</Label>
                    <Switch
                      id="claimUpdates"
                      checked={settings.claimUpdates}
                      onCheckedChange={(value) => handleSettingChange('claimUpdates', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="policyReminders">Policy Reminders</Label>
                    <Switch
                      id="policyReminders"
                      checked={settings.policyReminders}
                      onCheckedChange={(value) => handleSettingChange('policyReminders', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="marketingEmails">Marketing & Updates</Label>
                    <Switch
                      id="marketingEmails"
                      checked={settings.marketingEmails}
                      onCheckedChange={(value) => handleSettingChange('marketingEmails', value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>
                Manage your account security and protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  id="twoFactorAuth"
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(value) => handleSettingChange('twoFactorAuth', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="highSecurity">High Security Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Require approval for all transactions and policy changes
                  </p>
                </div>
                <Switch
                  id="highSecurity"
                  checked={settings.highSecurity}
                  onCheckedChange={(value) => handleSettingChange('highSecurity', value)}
                />
              </div>
              
              <div className="pt-6">
                <Button className="w-full">Change Password</Button>
              </div>
              
              <div className="pt-2">
                <Button variant="outline" className="w-full flex items-center justify-center">
                  <Lock className="mr-2 h-4 w-4" />
                  View Security Activity Log
                </Button>
              </div>
              
              <div className="pt-6 pb-2">
                <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Important Security Notice</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Never share your wallet private keys or seed phrases with anyone, 
                        including VehicleShield support. We will never ask for this information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}