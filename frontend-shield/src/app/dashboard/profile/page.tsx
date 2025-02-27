//../profile/pagetsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Shield, User, Mail, Phone, Home, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// These would typically come from your database
// interface UserExtendedData {
//   address?: string;
//   city?: string;
//   postalCode?: string;
//   country?: string;
// }

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { address: walletAddress } = useAccount();
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        // The following fields would be loaded from your database
        // For now, we'll keep the existing values in the form
      }));
    }
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setUpdateSuccess(false);
    
    try {
      // Call the updated updateUserProfile function
      const success = await updateUserProfile({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country
      });
      
      if (success) {
        setIsEditing(false);
        setUpdateSuccess(true);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setUpdateSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    // Reset form to current user data
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
        // We would reset other fields too if they were loaded from a database
      }));
    }
    setIsEditing(false);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Manage your personal details and contact information
                </CardDescription>
              </div>
              {updateSuccess && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="mr-1 h-5 w-5" />
                  <span>Profile updated</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <User size={18} />
                    </span>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <Mail size={18} />
                    </span>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={true} // Email typically can't be changed
                      className="rounded-l-none bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <Phone size={18} />
                    </span>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <Home size={18} />
                    </span>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                {isEditing ? (
                  <>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
              
              {/* Information about extended profile data */}
              {isEditing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex">
                    <AlertCircle className="text-blue-600 h-5 w-5 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700">
                        Your profile information helps us provide better service.
                        Address details are stored securely and only used for claims verification.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Wallet Address</h3>
              <p className="font-mono text-sm break-all">
                {walletAddress || 'Not connected'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
              <div className="flex items-center text-blue-600 space-x-1">
                <Shield size={16} />
                <span>Standard User</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
              <div className="flex items-center text-green-600 space-x-1">
                <span className="h-2 w-2 rounded-full bg-green-600"></span>
                <span>Active</span>
              </div>
            </div>
            
            <div className="pt-4">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
            </div>
            
            <div className="pt-2">
              <Button variant="destructive" className="w-full">
                Delete Account
              </Button>
            </div>

            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <div className="text-xs text-gray-500">
                <p>User ID: {user?.uid ? `${user.uid.substring(0, 8)}...` : 'Not logged in'}</p>
                <p>Created: {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
                <p>Last Login: {user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}