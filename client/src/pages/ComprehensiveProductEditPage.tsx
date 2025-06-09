import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Import the comprehensive product edit form
import { ComprehensiveProductEdit } from '../../../comprehensive-product-edit-form';

export default function ComprehensiveProductEditPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load all necessary data
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['/api/vendors'],
  });

  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ['/api/departments'],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  const handleSave = async (productData: any) => {
    try {
      await apiRequest(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });

      // Navigate back to products list
      setLocation('/products');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setLocation('/products');
  };

  const isLoading = productLoading || vendorsLoading || departmentsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading product data...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Product not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>
        <h1 className="text-2xl font-bold">Edit Product Configuration</h1>
      </div>

      {/* Full-page comprehensive product edit form */}
      <div className="w-full">
        <ComprehensiveProductEdit
          product={product}
          vendors={vendors || []}
          departments={departments || []}
          categories={categories || []}
          isOpen={true} // Always open since this is a dedicated page
          onClose={handleBack}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}