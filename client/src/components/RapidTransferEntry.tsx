import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Truck, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TransferItem {
  id: string;
  productId: number;
  productName: string;
  departmentName: string;
  quantity: number;
  transferCost: number;
  totalCost: number;
}

interface Product {
  id: number;
  productId: string;
  productName: string;
  departmentName: string;
  transferCost: number;
  casePack: number;
  unitSize: string;
}

interface RapidTransferEntryProps {
  onSave: (items: TransferItem[]) => void;
  onCancel: () => void;
}

export function RapidTransferEntry({ onSave, onCancel }: RapidTransferEntryProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const productIdRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
  });

  // Fetch products for selected department
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products', selectedDepartment],
    enabled: !!selectedDepartment,
  });

  // Focus on product ID input when department changes
  useEffect(() => {
    if (selectedDepartment && productIdRef.current) {
      productIdRef.current.focus();
    }
  }, [selectedDepartment]);

  // Filter products based on search input
  useEffect(() => {
    if (!products.length || !searchValue) {
      setFilteredProducts([]);
      setShowDropdown(false);
      return;
    }

    const filtered = products.filter((product: any) => {
      const searchLower = searchValue.toLowerCase();
      return (
        product.id.toString().includes(searchValue) ||
        product.productName?.toLowerCase().includes(searchLower) ||
        product.upc?.includes(searchValue)
      );
    }).slice(0, 10); // Limit to 10 results for performance

    setFilteredProducts(filtered);
    setShowDropdown(filtered.length > 0);
    setSelectedProductIndex(0);
  }, [searchValue, products]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showDropdown && filteredProducts.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedProductIndex(prev => 
            prev < filteredProducts.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedProductIndex(prev => 
            prev > 0 ? prev - 1 : filteredProducts.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredProducts[selectedProductIndex]) {
            selectProduct(filteredProducts[selectedProductIndex]);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          break;
      }
    }
  }, [showDropdown, filteredProducts, selectedProductIndex]);

  // Handle product selection
  const selectProduct = (product: Product) => {
    setSearchValue(`${product.id} - ${product.productName}`);
    setShowDropdown(false);
    
    // Focus on quantity input
    setTimeout(() => {
      if (quantityRef.current) {
        quantityRef.current.select();
        quantityRef.current.focus();
      }
    }, 0);
  };

  // Handle quantity entry and add item
  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTransferItem();
    }
  };

  // Add item to transfer list
  const addTransferItem = () => {
    const selectedProduct = filteredProducts.find(p => 
      searchValue.includes(p.id.toString())
    );

    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) {
      return;
    }

    const qty = parseFloat(quantity);
    const transferCost = selectedProduct.transferCost || 0;
    const totalCost = qty * transferCost;

    const newItem: TransferItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.productName,
      departmentName: selectedProduct.departmentName,
      quantity: qty,
      transferCost,
      totalCost
    };

    setTransferItems(prev => [...prev, newItem]);
    
    // Reset for next entry
    setSearchValue('');
    setQuantity('1');
    setShowDropdown(false);
    
    // Focus back on product input
    setTimeout(() => {
      if (productIdRef.current) {
        productIdRef.current.focus();
      }
    }, 0);
  };

  // Remove item from transfer list
  const removeItem = (itemId: string) => {
    setTransferItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Calculate totals
  const totalItems = transferItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = transferItems.reduce((sum, item) => sum + item.totalCost, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rapid Transfer Entry</h2>
          <p className="text-muted-foreground">Enter store orders for warehouse pick list generation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button 
            onClick={() => onSave(transferItems)}
            disabled={transferItems.length === 0}
          >
            <Truck className="h-4 w-4 mr-2" />
            Generate Pick List
          </Button>
        </div>
      </div>

      {/* Department Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Department</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose department to filter products..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Product Entry */}
      {selectedDepartment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Product Search */}
              <div className="relative">
                <label className="text-sm font-medium">Product ID / Search</label>
                <Input
                  ref={productIdRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter product ID or search..."
                  className="font-mono"
                />
                
                {/* Dropdown Results */}
                {showDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 ${
                          index === selectedProductIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                        }`}
                        onClick={() => selectProduct(product)}
                      >
                        <div className="font-mono font-medium">{product.id}</div>
                        <div className="text-gray-600 truncate">{product.productName}</div>
                        <div className="text-xs text-gray-500">
                          {product.casePack && `Pack: ${product.casePack}`}
                          {product.unitSize && ` • Size: ${product.unitSize}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  ref={quantityRef}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                  placeholder="1"
                  min="0.01"
                  step="0.01"
                  className="font-mono"
                />
              </div>
            </div>

            <Button 
              onClick={addTransferItem}
              className="w-full"
              disabled={!searchValue || !quantity}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transfer Items List */}
      {transferItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Transfer Items</CardTitle>
              <div className="flex gap-4 text-sm">
                <Badge variant="secondary">
                  <Package className="h-3 w-3 mr-1" />
                  {totalItems} items
                </Badge>
                <Badge variant="secondary">
                  {formatCurrency(totalCost)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.productId}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.productName}</TableCell>
                      <TableCell className="font-mono">{item.quantity}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(item.transferCost)}</TableCell>
                      <TableCell className="font-mono font-medium">{formatCurrency(item.totalCost)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}