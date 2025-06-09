import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Package,
  Search,
  Filter
} from "lucide-react";

interface Transaction {
  id: number;
  type: string;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  product: {
    id: number;
    name: string;
    sku: string;
  };
  location: {
    id: number;
    code: string;
    name: string;
  };
}

interface Product {
  id: number;
  sku: string;
  name: string;
}

interface Location {
  id: number;
  code: string;
  name: string;
}

const transactionFormSchema = insertTransactionSchema.extend({
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

const transactionTypes = [
  { value: "receipt", label: "Receipt", description: "Goods received into warehouse" },
  { value: "shipment", label: "Shipment", description: "Goods shipped out of warehouse" },
  { value: "adjustment", label: "Adjustment", description: "Inventory count adjustment" },
];

const typeStyles = {
  receipt: "bg-success-50 text-success-800 border-success-200",
  shipment: "bg-error-50 text-error-800 border-error-200",
  adjustment: "bg-warning-50 text-warning-800 border-warning-200",
};

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionFormSchema>) => {
      const response = await apiRequest("POST", "/api/transactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsAddTransactionOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
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

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "receipt",
      productId: 0,
      locationId: 0,
      quantity: 1,
      reference: "",
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof transactionFormSchema>) => {
    createTransactionMutation.mutate(data);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "receipt":
        return <TrendingUp className="w-4 h-4" />;
      case "shipment":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getQuantityDisplay = (transaction: Transaction) => {
    const sign = transaction.type === "shipment" ? "-" : "+";
    return `${sign}${transaction.quantity}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-neutral-600">Record and track inventory movements</p>
        </div>
        <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Record Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record New Transaction</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-muted-foreground">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">{product.sku}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              <div>
                                <div className="font-medium">{location.code}</div>
                                <div className="text-sm text-muted-foreground">{location.name}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="PO number, shipment ID, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this transaction" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTransactionMutation.isPending}>
                    {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product, SKU, location, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="receipt">Receipts</SelectItem>
                  <SelectItem value="shipment">Shipments</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-3">Type</th>
                    <th className="text-left font-medium py-3">Product</th>
                    <th className="text-left font-medium py-3">SKU</th>
                    <th className="text-left font-medium py-3">Location</th>
                    <th className="text-left font-medium py-3">Quantity</th>
                    <th className="text-left font-medium py-3">Reference</th>
                    <th className="text-left font-medium py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="py-3">
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${typeStyles[transaction.type as keyof typeof typeStyles]}`}
                        >
                          {getTransactionIcon(transaction.type)}
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{transaction.product.name}</div>
                        {transaction.notes && (
                          <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                        )}
                      </td>
                      <td className="py-3 font-mono text-sm">{transaction.product.sku}</td>
                      <td className="py-3">
                        <div className="font-medium">{transaction.location.code}</div>
                      </td>
                      <td className="py-3">
                        <div className={`font-medium ${
                          transaction.type === 'shipment' ? 'text-error-600' : 'text-success-600'
                        }`}>
                          {getQuantityDisplay(transaction)}
                        </div>
                        {transaction.previousQuantity !== undefined && transaction.newQuantity !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            {transaction.previousQuantity} → {transaction.newQuantity}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {transaction.reference && (
                          <div className="text-sm">{transaction.reference}</div>
                        )}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
