import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, Building2, MapPin, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { queryClient } from '@/lib/queryClient';

type EntityType = 'vendors' | 'stores' | 'locations' | 'departments' | 'categories' | 'unitTypes' | 'orderStatuses' | 'adjustmentReasons' | 'paymentTerms';

interface AdminEntity {
  id?: number;
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  [key: string]: any;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<EntityType>('vendors');
  const [editingItem, setEditingItem] = useState<AdminEntity | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: entities = [], isLoading } = useQuery({
    queryKey: [`/api/${activeTab}`],
  });

  const createMutation = useMutation({
    mutationFn: async (newEntity: AdminEntity) => {
      const response = await fetch(`/api/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntity),
      });
      if (!response.ok) throw new Error('Failed to create entity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${activeTab}`] });
      setShowAddDialog(false);
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: AdminEntity) => {
      const response = await fetch(`/api/${activeTab}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update entity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${activeTab}`] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/${activeTab}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete entity');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${activeTab}`] });
    },
  });

  const handleSave = (entity: AdminEntity) => {
    if (entity.id) {
      updateMutation.mutate(entity);
    } else {
      createMutation.mutate(entity);
    }
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'vendors': return <Building2 className="w-5 h-5" />;
      case 'stores': return <Building2 className="w-5 h-5" />;
      case 'locations': return <MapPin className="w-5 h-5" />;
      case 'departments': return <Package className="w-5 h-5" />;
      case 'categories': return <Tag className="w-5 h-5" />;
    }
  };

  const getEntityFields = (type: EntityType) => {
    const baseFields = ['name', 'description', 'isActive'];
    
    switch (type) {
      case 'vendors':
        return ['code', 'name', 'contactName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'paymentTerms', 'isActive'];
      case 'stores':
        return ['storeNumber', 'name', 'address', 'city', 'state', 'zipCode', 'phone', 'managerId', 'isActive'];
      case 'locations':
        return ['code', 'name', 'zone', 'aisle', 'shelf', 'position', 'capacity', 'isActive'];
      case 'unitTypes':
        return ['code', 'name', 'description', 'isActive'];
      case 'orderStatuses':
        return ['code', 'name', 'description', 'statusType', 'sortOrder', 'isActive'];
      case 'adjustmentReasons':
        return ['code', 'name', 'description', 'requiresApproval', 'isActive'];
      case 'paymentTerms':
        return ['code', 'name', 'netDays', 'discountDays', 'discountPercent', 'description', 'isActive'];
      case 'departments':
      case 'categories':
        return ['name', 'description', 'isActive'];
      default:
        return baseFields;
    }
  };

  const renderEntityForm = (entity: AdminEntity, isEditing: boolean = false) => {
    const fields = getEntityFields(activeTab);
    
    return (
      <div className="space-y-4">
        {fields.map((field) => {
          if (field === 'isActive') {
            return (
              <div key={field} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={field}
                  checked={entity[field] || false}
                  onChange={(e) =>
                    setEditingItem({ ...entity, [field]: e.target.checked })
                  }
                />
                <label htmlFor={field} className="text-sm font-medium">
                  Active
                </label>
              </div>
            );
          }

          return (
            <div key={field}>
              <label className="text-sm font-medium mb-1 block">
                {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              <Input
                value={entity[field] || ''}
                onChange={(e) =>
                  setEditingItem({ ...entity, [field]: e.target.value })
                }
                placeholder={`Enter ${field.toLowerCase()}`}
              />
            </div>
          );
        })}
        
        <div className="flex gap-2">
          <Button onClick={() => handleSave(entity)} disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={() => {
            setEditingItem(null);
            setShowAddDialog(false);
          }}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const renderEntityList = () => {
    if (isLoading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    return (
      <div className="space-y-4">
        {entities.map((entity: AdminEntity) => (
          <Card key={entity.id}>
            <CardContent className="pt-6">
              {editingItem?.id === entity.id ? (
                renderEntityForm(editingItem, true)
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{entity.name}</h3>
                      {entity.code && (
                        <Badge variant="outline">{entity.code}</Badge>
                      )}
                      {entity.storeNumber && (
                        <Badge variant="outline">#{entity.storeNumber}</Badge>
                      )}
                      <Badge variant={entity.isActive ? "default" : "secondary"}>
                        {entity.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {entity.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entity.description}
                      </p>
                    )}
                    {entity.contactName && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {entity.contactName}
                      </p>
                    )}
                    {entity.address && (
                      <p className="text-sm text-muted-foreground">
                        {entity.address}, {entity.city}, {entity.state} {entity.zipCode}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingItem(entity)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this item?')) {
                          deleteMutation.mutate(entity.id!);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-muted-foreground">
            Manage master data and system configuration
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntityType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Stores
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products
          </TabsTrigger>
        </TabsList>
        
        <TabsList className="grid w-full grid-cols-4 mt-2">
          <TabsTrigger value="unitTypes" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Unit Types
          </TabsTrigger>
          <TabsTrigger value="orderStatuses" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Order Status
          </TabsTrigger>
          <TabsTrigger value="adjustmentReasons" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="paymentTerms" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Payment Terms
          </TabsTrigger>
        </TabsList>

        {(['vendors', 'stores', 'locations', 'departments', 'categories'] as EntityType[]).map((entityType) => (
          <TabsContent key={entityType} value={entityType} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getEntityIcon(entityType)}
                    Manage {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                  </CardTitle>
                  
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Add New {entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}
                        </DialogTitle>
                      </DialogHeader>
                      {renderEntityForm(editingItem || {})}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {renderEntityList()}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}