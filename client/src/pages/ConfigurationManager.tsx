import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Configuration {
  configuration_id: number;
  configuration_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ConfigurationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newConfig, setNewConfig] = useState({ name: "", isActive: true });
  const [editConfig, setEditConfig] = useState({ name: "", isActive: true });

  // Fetch configurations
  const { data: configurations, isLoading } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  // Create configuration mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; isActive: boolean }) => {
      const response = await fetch("/api/configurations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configuration_name: data.name,
          is_active: data.isActive,
        }),
      });
      if (!response.ok) throw new Error("Failed to create configuration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      setNewConfig({ name: "", isActive: true });
      toast({
        title: "Success",
        description: "Configuration created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create configuration",
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; isActive: boolean } }) => {
      const response = await fetch(`/api/configurations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configuration_name: data.name,
          is_active: data.isActive,
        }),
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      setEditingId(null);
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (config: Configuration) => {
    setEditingId(config.configuration_id);
    setEditConfig({
      name: config.configuration_name,
      isActive: config.is_active,
    });
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({ id, data: editConfig });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditConfig({ name: "", isActive: true });
  };

  const handleCreate = () => {
    if (newConfig.name.trim()) {
      createMutation.mutate(newConfig);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading configurations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuration Manager</h1>
      </div>

      {/* Create New Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="new-config-name">Configuration Name</Label>
              <Input
                id="new-config-name"
                value={newConfig.name}
                onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                placeholder="Enter configuration name..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={newConfig.isActive}
                onCheckedChange={(checked) => setNewConfig({ ...newConfig, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newConfig.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(configurations || []).map((config: Configuration) => (
              <div
                key={config.configuration_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                {editingId === config.configuration_id ? (
                  // Edit mode
                  <div className="flex items-center gap-4 flex-1">
                    <Input
                      value={editConfig.name}
                      onChange={(e) => setEditConfig({ ...editConfig, name: e.target.value })}
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editConfig.isActive}
                        onCheckedChange={(checked) => setEditConfig({ ...editConfig, isActive: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(config.configuration_id)}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{config.configuration_name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.is_active 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {config.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}