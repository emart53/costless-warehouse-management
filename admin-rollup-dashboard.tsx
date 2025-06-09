/**
 * Admin Dashboard for Inventory Rollup Management
 * Provides simple interface for non-technical users
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Database, Settings, AlertCircle, CheckCircle, Play } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface RollupStatus {
  systemTime: string;
  isProcessing: boolean;
  lastRollup: {
    rollup_year: number;
    created_at: string;
  } | null;
  nextScheduled: string;
}

interface RollupHistory {
  id: number;
  rollup_year: number;
  status: string;
  products_processed: number;
  locations_processed: number;
  total_records: number;
  duration_seconds: number;
  error_message: string | null;
  created_at: string;
}

export default function AdminRollupDashboard() {
  const queryClient = useQueryClient();
  
  // Get rollup system status
  const { data: rollupStatus, isLoading: statusLoading } = useQuery<RollupStatus>({
    queryKey: ['/api/admin/rollup/status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get rollup history
  const { data: rollupHistory, isLoading: historyLoading } = useQuery<RollupHistory[]>({
    queryKey: ['/api/admin/rollup/history']
  });

  // Manual rollup trigger
  const manualRollupMutation = useMutation({
    mutationFn: async (year: number) => {
      return apiRequest(`/api/admin/rollup/execute`, {
        method: 'POST',
        body: JSON.stringify({ year })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rollup/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rollup/history'] });
    }
  });

  const handleManualRollup = () => {
    const year = new Date().getFullYear() - 1;
    if (confirm(`Execute manual rollup for year ${year}? This process cannot be undone.`)) {
      manualRollupMutation.mutate(year);
    }
  };

  if (statusLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Automated annual rollup system - no manual intervention required</p>
        </div>
        <Badge variant={rollupStatus?.isProcessing ? "destructive" : "secondary"}>
          {rollupStatus?.isProcessing ? "Processing" : "Ready"}
        </Badge>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="history">Rollup History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current state of the automated rollup system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">System Time</p>
                    <p className="text-xs text-gray-600">
                      {rollupStatus?.systemTime ? new Date(rollupStatus.systemTime).toLocaleString() : '--'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Next Scheduled</p>
                    <p className="text-xs text-gray-600">{rollupStatus?.nextScheduled || '--'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {rollupStatus?.isProcessing ? (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-xs text-gray-600">
                      {rollupStatus?.isProcessing ? 'Processing...' : 'Ready'}
                    </p>
                  </div>
                </div>
              </div>

              {rollupStatus?.lastRollup && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Last successful rollup: Year {rollupStatus.lastRollup.rollup_year} completed on{' '}
                    {new Date(rollupStatus.lastRollup.created_at).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}

              {rollupStatus?.isProcessing && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Rollup in progress - system is automatically processing annual data. 
                    Please do not interrupt this process.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Manual Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manual Controls
              </CardTitle>
              <CardDescription>
                Emergency controls for system administrators only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The system runs automatically every January 2nd. Manual execution should only be used 
                    if the automatic process failed or for testing purposes.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleManualRollup}
                  disabled={rollupStatus?.isProcessing || manualRollupMutation.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Execute Manual Rollup for {new Date().getFullYear() - 1}
                </Button>
                
                {manualRollupMutation.isPending && (
                  <Progress value={undefined} className="w-full" />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rollup History</CardTitle>
              <CardDescription>
                Historical record of all rollup operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {rollupHistory?.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={entry.status === 'SUCCESS' ? 'default' : 'destructive'}>
                          {entry.status}
                        </Badge>
                        <div>
                          <p className="font-medium">Year {entry.rollup_year}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm text-gray-600">
                        {entry.status === 'SUCCESS' ? (
                          <div>
                            <p>{entry.products_processed} products</p>
                            <p>{entry.duration_seconds}s duration</p>
                          </div>
                        ) : (
                          <p className="text-red-600">{entry.error_message}</p>
                        )}
                      </div>
                    </div>
                  )) || <p className="text-center py-8 text-gray-500">No rollup history available</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Automated system settings - changes not recommended
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This system is designed to run automatically without configuration changes. 
                  Contact technical support before modifying any settings.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Automatic Rollup</span>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Schedule</span>
                  <span className="text-sm text-gray-600">January 2nd, 2:00 AM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Notifications</span>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Backup Retention</span>
                  <span className="text-sm text-gray-600">7 years</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}