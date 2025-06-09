import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertLocationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  MapPin,
  Database,
  Download,
  Upload,
  Save,
  Trash2,
  Plus,
  Edit
} from "lucide-react";
import type { Location } from "@/lib/types";

interface SystemSettings {
  lowStockThreshold: number;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  autoBackup: boolean;
  maintenanceMode: boolean;
  timezone: string;
  dateFormat: string;
  currency: string;
}

const locationFormSchema = insertLocationSchema;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mock system settings - in a real app this would come from an API
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    lowStockThreshold: 10,
    notificationsEnabled: true,
    emailNotifications: false,
    autoBackup: true,
    maintenanceMode: false,
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof locationFormSchema>) => {
      const response = await apiRequest("POST", "/api/locations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsAddLocationOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Location created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof locationFormSchema>>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      code: "",
      name: "",
      zone: "",
      aisle: "",
      shelf: "",
      position: "",
      capacity: undefined,
      isActive: true,
    },
  });

  const onSubmit = (data: z.infer<typeof locationFormSchema>) => {
    createLocationMutation.mutate(data);
  };

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSystemSettings(prev => ({ ...prev, [key]: value }));
    // In a real app, this would make an API call to save the setting
    toast({
      title: "Setting Updated",
      description: `${key} has been updated`,
    });
  };

  const handleExportData = () => {
    // In a real app, this would generate and download data
    toast({
      title: "Export Started",
      description: "Your data export is being prepared",
    });
  };

  const handleImportData = () => {
    // In a real app, this would handle file upload
    toast({
      title: "Import Feature",
      description: "File import functionality would be available here",
    });
  };

  const GeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                value={systemSettings.lowStockThreshold}
                onChange={(e) => handleSettingChange('lowStockThreshold', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={systemSettings.timezone} 
                onValueChange={(value) => handleSettingChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select 
                value={systemSettings.dateFormat} 
                onValueChange={(value) => handleSettingChange('dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                  <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                  <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={systemSettings.currency} 
                onValueChange={(value) => handleSettingChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto Backup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup system data daily
              </p>
            </div>
            <Switch
              checked={systemSettings.autoBackup}
              onCheckedChange={(checked) => handleSettingChange('autoBackup', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Restrict system access for maintenance
              </p>
            </div>
            <Switch
              checked={systemSettings.maintenanceMode}
              onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive system notifications for important events
              </p>
            </div>
            <Switch
              checked={systemSettings.notificationsEnabled}
              onCheckedChange={(checked) => handleSettingChange('notificationsEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications via email for critical alerts
              </p>
            </div>
            <Switch
              checked={systemSettings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="lowStock" defaultChecked />
              <Label htmlFor="lowStock">Low Stock Alerts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="taskDue" defaultChecked />
              <Label htmlFor="taskDue">Task Due Reminders</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="systemUpdates" />
              <Label htmlFor="systemUpdates">System Updates</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="maintenanceAlerts" defaultChecked />
              <Label htmlFor="maintenanceAlerts">Maintenance Alerts</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const LocationManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Warehouse Locations</h3>
          <p className="text-sm text-muted-foreground">Manage warehouse zones, aisles, and storage locations</p>
        </div>
        <Button onClick={() => setIsAddLocationOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Add Location Form */}
      {isAddLocationOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Location</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., A-12-03" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Descriptive name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="zone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone</FormLabel>
                        <FormControl>
                          <Input placeholder="A, B, C..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aisle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aisle</FormLabel>
                        <FormControl>
                          <Input placeholder="01, 02..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shelf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shelf</FormLabel>
                        <FormControl>
                          <Input placeholder="01, 02..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddLocationOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLocationMutation.isPending}>
                    {createLocationMutation.isPending ? "Creating..." : "Create Location"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Locations List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium py-3">Code</th>
                  <th className="text-left font-medium py-3">Name</th>
                  <th className="text-left font-medium py-3">Zone</th>
                  <th className="text-left font-medium py-3">Aisle</th>
                  <th className="text-left font-medium py-3">Capacity</th>
                  <th className="text-left font-medium py-3">Status</th>
                  <th className="text-left font-medium py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location.id} className="border-b">
                    <td className="py-3 font-mono text-sm">{location.code}</td>
                    <td className="py-3">{location.name}</td>
                    <td className="py-3">{location.zone || '-'}</td>
                    <td className="py-3">{location.aisle || '-'}</td>
                    <td className="py-3">{location.capacity || '-'}</td>
                    <td className="py-3">
                      {location.isActive ? (
                        <span className="text-success-600">Active</span>
                      ) : (
                        <span className="text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DataManagement = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Import & Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-dashed border-neutral-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-medium mb-2">Import Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Upload CSV files to import products, locations, or transactions
              </p>
              <Button variant="outline" onClick={handleImportData}>
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>

            <div className="border border-dashed border-neutral-300 rounded-lg p-6 text-center">
              <Download className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-medium mb-2">Export Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download your warehouse data as CSV files
              </p>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
            <div>
              <h4 className="font-medium">Database Backup</h4>
              <p className="text-sm text-muted-foreground">Create a backup of all warehouse data</p>
            </div>
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Create Backup
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
            <div>
              <h4 className="font-medium">Clear Cache</h4>
              <p className="text-sm text-muted-foreground">Clear system cache to improve performance</p>
            </div>
            <Button variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-neutral-600">Configure system preferences and manage warehouse settings</p>
        </div>
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center space-x-2">
                <SettingsIcon className="w-4 h-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Locations</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Data</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="mt-6">
              <GeneralSettings />
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-6">
              <NotificationSettings />
            </TabsContent>
            
            <TabsContent value="locations" className="mt-6">
              <LocationManagement />
            </TabsContent>
            
            <TabsContent value="data" className="mt-6">
              <DataManagement />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
