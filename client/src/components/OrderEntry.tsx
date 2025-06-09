import React, { useState, useRef, useEffect } from 'react';
import { Plus, Save, X, AlertCircle, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

interface OrderItem {
  id?: number;
  productId: string;
  productName?: string;
  productDescription?: string;
  brand?: string;
  unitSize?: string;
  casePack?: number;
  quantity: number;
  unitCost?: number;
  lineTotal?: number;
}

interface OrderEntryProps {
  orderType: 'purchase' | 'transfer';
  onSave: (items: OrderItem[]) => void;
  onCancel: () => void;
}

export function OrderEntry({ orderType, onSave, onCancel }: OrderEntryProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [isProductIdFocused, setIsProductIdFocused] = useState(true);
  const [useAutocomplete, setUseAutocomplete] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  
  const productIdRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  // Fetch all products for autocomplete
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // Focus management for 10-key entry
  useEffect(() => {
    if (isProductIdFocused && productIdRef.current) {
      productIdRef.current.focus();
    } else if (!isProductIdFocused && quantityRef.current) {
      quantityRef.current.focus();
    }
  }, [isProductIdFocused, items.length]);

  const handleProductIdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (currentProductId.trim()) {
        setIsProductIdFocused(false);
      }
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setIsProductIdFocused(true);
    }
  };

  const addItem = async () => {
    if (currentProductId.trim() && currentQuantity.trim()) {
      // Fetch product details from API
      try {
        const response = await fetch(`/api/products?search=${currentProductId.trim()}`);
        const searchResults = await response.json();
        
        // Find exact match by product ID
        const product = searchResults.find((p: any) => p.id.toString() === currentProductId.trim());
        
        const newItem: OrderItem = {
          productId: currentProductId.trim(),
          productName: product?.name || `Product ${currentProductId}`,
          productDescription: product?.description || '',
          brand: product?.brand || '',
          unitSize: product?.unitSize || '',
          casePack: product?.casePack || 1,
          quantity: parseFloat(currentQuantity),
          lineTotal: 0 // Will be calculated based on current pricing
        };

        setItems(prev => [...prev, newItem]);
        
        // Clear inputs and return to product ID field
        setCurrentProductId('');
        setCurrentQuantity('');
        setIsProductIdFocused(true);
      } catch (error) {
        console.error('Error fetching product details:', error);
        // Still add the item but without detailed info
        const newItem: OrderItem = {
          productId: currentProductId.trim(),
          productName: `Product ${currentProductId}`,
          quantity: parseFloat(currentQuantity),
          lineTotal: 0
        };
        setItems(prev => [...prev, newItem]);
        setCurrentProductId('');
        setCurrentQuantity('');
        setIsProductIdFocused(true);
      }
    }
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const handleSave = () => {
    if (items.length > 0) {
      onSave(items);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedTotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {orderType === 'purchase' ? 'Purchase Order' : 'Transfer Order'} - Quick Entry
            </span>
            <div className="text-sm text-muted-foreground">
              Total Items: {totalItems}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entry Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={!useAutocomplete ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAutocomplete(false)}
            >
              10-Key Entry
            </Button>
            <Button
              variant={useAutocomplete ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAutocomplete(true)}
            >
              Search Products
            </Button>
          </div>

          {/* Entry Section */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Product ID
                </label>
                {useAutocomplete ? (
                  <Popover open={autocompleteOpen} onOpenChange={setAutocompleteOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={autocompleteOpen}
                        className="w-full justify-between text-lg"
                      >
                        {currentProductId
                          ? products.find((product: any) => product.productId === currentProductId)?.name || currentProductId
                          : "Search products..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {products.map((product: any) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.productId} ${product.name} ${product.brand || ''}`}
                              onSelect={() => {
                                setCurrentProductId(product.productId);
                                setAutocompleteOpen(false);
                                if (quantityRef.current) {
                                  quantityRef.current.focus();
                                }
                              }}
                            >
                              <div className="flex flex-col">
                                <div className="font-medium">
                                  {product.productId} - {product.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {product.brand} | {product.unit} | Stock: {product.minStockLevel || 0}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    ref={productIdRef}
                    value={currentProductId}
                    onChange={(e) => setCurrentProductId(e.target.value)}
                    onKeyDown={handleProductIdKeyDown}
                    placeholder="Enter product ID..."
                    className="text-lg font-mono"
                    autoComplete="off"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Quantity
                </label>
                <Input
                  ref={quantityRef}
                  type="number"
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                  placeholder="Enter quantity..."
                  className="text-lg"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={addItem} disabled={!currentProductId || !currentQuantity}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item (Enter)
              </Button>
              <div className="text-sm text-muted-foreground flex items-center">
                Use Tab to move between fields, Enter to add item
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          {items.length > 0 && (
            <div className="border rounded-lg">
              <div className="bg-muted/30 p-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium">
                  <div className="col-span-2">Product ID</div>
                  <div className="col-span-3">Product Name</div>
                  <div className="col-span-2">Brand</div>
                  <div className="col-span-1">Size</div>
                  <div className="col-span-1">Case</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-1">Cost</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-auto">
                {items.map((item, index) => (
                  <div key={index} className="p-3 border-b last:border-b-0">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-2">
                        <div className="font-mono text-sm font-medium">{item.productId}</div>
                      </div>
                      <div className="col-span-3">
                        <div className="text-sm font-medium">{item.productName || 'Loading...'}</div>
                        {item.productDescription && (
                          <div className="text-xs text-muted-foreground mt-1">{item.productDescription}</div>
                        )}
                      </div>
                      <div className="col-span-2 text-sm">
                        {item.brand || '-'}
                      </div>
                      <div className="col-span-1 text-xs">
                        {item.unitSize || '-'}
                      </div>
                      <div className="col-span-1 text-xs">
                        {item.casePack || '-'}
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                          className="text-sm h-8"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="col-span-1 text-sm">
                        ${(item.unitCost || 0).toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Order Summary */}
              <div className="bg-muted/30 p-3 border-t">
                <div className="flex justify-between text-sm">
                  <span>Total Items: {totalItems}</span>
                  <span>Estimated Total: ${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={items.length === 0}
              className="min-w-32"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Help */}
      <Card className="bg-muted/20">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <div className="font-medium mb-2">Keyboard Shortcuts:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>• Tab: Move to quantity field</div>
              <div>• Enter: Add item to order</div>
              <div>• Shift+Tab: Return to product ID</div>
              <div>• Focus stays on entry fields for continuous input</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}