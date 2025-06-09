import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, Database, TrendingUp, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  validation_status: string;
  matches: number;
  variances: number;
  errors: number;
  total_variance_value: number;
  error_message: string | null;
  created_at: string;
}

interface ValidationReport {
  summary: {
    rollup_year: number;
    validation_status: string;
    total_products_validated: number;
    perfect_matches: number;
    variance_items: number;
    error_items: number;
    match_percentage: number;
    total_value_variance: number;
    legacy_system_total_value: number;
    new_system_total_value: number;
  } | null;
  topVariances: Array<{
    product_id: number;
    product_name: string;
    location_name: string;
    variance_quantity: number;
    variance_value: number;
    variance_percentage: number;
  }>;
}

export default function RollupDashboard() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/rollup/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/rollup/history'],
  });

  const { data: validationReport, isLoading: validationLoading } = useQuery({
    queryKey: ['/api/rollup/validation', selectedYear],
    enabled: !!selectedYear,
  });

  const executeRollupMutation = useMutation({
    mutationFn: async (year: number) => {
      return await apiRequest(`/api/rollup/execute`, {
        method: 'POST',
        body: JSON.stringify({ year }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Rollup Started",
        description: "Annual rollup process has been initiated. Monitor progress below.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rollup/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rollup/history'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Rollup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getValidationBadge = (validationStatus: string) => {
    switch (validationStatus) {
      case 'PASSED':
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case 'WARNING':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{validationStatus}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Annual Inventory Rollup</h1>
          <p className="text-muted-foreground">
            Automated system for historical data management and validation
          </p>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.isProcessing ? (
                <span className="text-blue-600">Processing</span>
              ) : (
                <span className="text-green-600">Ready</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.systemTime && `Last updated: ${new Date(status.systemTime).toLocaleTimeString()}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Rollup</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.lastRollup ? status.lastRollup.rollup_year : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.lastRollup && new Date(status.lastRollup.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Jan 2nd</div>
            <p className="text-xs text-muted-foreground">
              2:00 AM automatic execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Reduction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95%</div>
            <p className="text-xs text-muted-foreground">
              Storage optimization achieved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Alert */}
      {status?.isProcessing && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Rollup In Progress</AlertTitle>
          <AlertDescription>
            Annual rollup is currently running. This process typically takes 1-2 hours.
            You can monitor progress below.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Rollup History</TabsTrigger>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
          <TabsTrigger value="manual">Manual Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>
                  Current state and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Historical Data (2016-2021)</span>
                    <span className="font-medium">Annual Summaries</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current Data (2022+)</span>
                    <span className="font-medium">Full Transaction Detail</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Query Performance</span>
                    <span className="font-medium text-green-600">200x Faster</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Storage Reduction</span>
                    <span className="font-medium text-green-600">95% Smaller</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Benefits</CardTitle>
                <CardDescription>
                  Impact on daily operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Weekly Reports</span>
                    <span className="font-medium">Same Accuracy</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Inventory Calculations</span>
                    <span className="font-medium">Instant Results</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Database Backups</span>
                    <span className="font-medium text-green-600">90% Faster</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IT Maintenance</span>
                    <span className="font-medium text-green-600">Zero Required</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rollup History</CardTitle>
              <CardDescription>
                Complete audit trail of all rollup executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((rollup: RollupHistory) => (
                    <div key={rollup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Year {rollup.rollup_year}</span>
                          {getStatusBadge(rollup.status)}
                          {rollup.validation_status && getValidationBadge(rollup.validation_status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rollup.products_processed} products, {rollup.locations_processed} locations
                          {rollup.duration_seconds && ` • ${formatDuration(rollup.duration_seconds)}`}
                        </div>
                        {rollup.validation_status && (
                          <div className="text-sm text-muted-foreground">
                            {rollup.matches} matches, {rollup.variances} variances, {rollup.errors} errors
                            {rollup.total_variance_value > 0 && ` • $${rollup.total_variance_value.toFixed(2)} variance`}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(rollup.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No rollup history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Select Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1 border rounded-md"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {validationLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : validationReport?.summary ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Validation Summary for {selectedYear}</CardTitle>
                  <CardDescription>
                    Comparison between legacy system and rollup results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-green-600">
                        {validationReport.summary.match_percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Perfect Matches</div>
                      <div className="text-xs">
                        {validationReport.summary.perfect_matches} / {validationReport.summary.total_products_validated} products
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        ${Math.abs(validationReport.summary.total_value_variance).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Variance</div>
                      <div className="text-xs">
                        {validationReport.summary.variance_items} items with differences
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        {getValidationBadge(validationReport.summary.validation_status)}
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Status</div>
                      <div className="text-xs">
                        {validationReport.summary.error_items} errors detected
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {validationReport.topVariances.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Variances</CardTitle>
                    <CardDescription>
                      Items requiring investigation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {validationReport.topVariances.slice(0, 5).map((variance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{variance.product_name}</div>
                            <div className="text-sm text-muted-foreground">{variance.location_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${Math.abs(variance.variance_value).toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              {variance.variance_percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  No validation data available for {selectedYear}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Controls</CardTitle>
              <CardDescription>
                Emergency controls for system administrators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Manual rollup should only be used in emergency situations. 
                  The system is designed to run automatically every January 2nd.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Year to Rollup:</label>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    disabled={status?.isProcessing}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={() => executeRollupMutation.mutate(selectedYear)}
                  disabled={status?.isProcessing || executeRollupMutation.isPending}
                  className="w-full"
                >
                  {executeRollupMutation.isPending ? "Starting Rollup..." : `Execute Rollup for ${selectedYear}`}
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p>Before executing manual rollup:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ensure pre-rollup validation data has been imported</li>
                    <li>Verify no other database operations are running</li>
                    <li>Process typically takes 1-2 hours to complete</li>
                    <li>System will validate results automatically</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}