import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Department {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  departmentId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: Department;
}

interface Location {
  id: number;
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  position?: string;
  capacity?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
}

interface Store {
  id: number;
  storeNumber: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  contactPerson?: string;
  managerId?: number;
  isActive: boolean;
  createdAt: string;
}

interface UnitType {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Vendor {
  id: number;
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  discountPercent?: number;
  epDays?: number;
  netDays?: number;
  leadTime?: number;
  paymentTerms?: string;
  isActive: boolean;
}

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100, 'Name must be 100 characters or less'),
  isActive: z.boolean().default(true),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name must be 100 characters or less'),
  departmentId: z.number().optional(),
  isActive: z.boolean().default(true),
});

const locationFormSchema = z.object({
  code: z.string().min(1, 'Location code is required'),
  name: z.string().min(1, 'Location name is required'),
  zone: z.string().optional(),
  aisle: z.string().optional(),
  shelf: z.string().optional(),
  position: z.string().optional(),
  capacity: z.number().min(0).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  isActive: z.boolean().default(true),
});

const storeFormSchema = z.object({
  storeNumber: z.string().min(1, 'Store number is required'),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.number().optional(),
  contactPerson: z.string().optional(),
  isActive: z.boolean().default(true),
});

const vendorFormSchema = z.object({
  code: z.string().min(1, 'Vendor code is required').max(20, 'Code must be 20 characters or less'),
  name: z.string().min(1, 'Vendor name is required'),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  discountPercent: z.string().transform((val) => val === '' ? undefined : parseFloat(val)).pipe(z.number().min(0).max(1).optional()), // Store as decimal (0.01 = 1%)
  epDays: z.string().transform((val) => val === '' ? undefined : parseInt(val)).pipe(z.number().min(0).optional()),
  netDays: z.string().transform((val) => val === '' ? undefined : parseInt(val)).pipe(z.number().min(0).optional()),
  leadTime: z.string().transform((val) => val === '' ? undefined : parseInt(val)).pipe(z.number().min(0).optional()),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().default(true),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;
type CategoryFormData = z.infer<typeof categoryFormSchema>;
type LocationFormData = z.infer<typeof locationFormSchema>;
type StoreFormData = z.infer<typeof storeFormSchema>;
type VendorFormData = z.infer<typeof vendorFormSchema>;

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const { data: stores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: unitTypes = [], isLoading: unitTypesLoading } = useQuery<UnitType[]>({
    queryKey: ['/api/unit-types'],
  });

  // Department mutations
  const createDepartmentMutation = useMutation({
    mutationFn: (data: DepartmentFormData) => apiRequest('POST', '/api/departments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsDepartmentDialogOpen(false);
      departmentForm.reset();
      toast({
        title: 'Success',
        description: 'Department created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create department',
        variant: 'destructive',
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DepartmentFormData }) => 
      apiRequest('PATCH', `/api/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsDepartmentDialogOpen(false);
      setEditingDepartment(null);
      departmentForm.reset();
      toast({
        title: 'Success',
        description: 'Department updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update department',
        variant: 'destructive',
      });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => apiRequest('POST', '/api/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive',
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryFormData }) => 
      apiRequest('PATCH', `/api/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update category',
        variant: 'destructive',
      });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: VendorFormData) => apiRequest('POST', '/api/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
      vendorForm.reset();
      toast({
        title: 'Success',
        description: 'Vendor created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vendor',
        variant: 'destructive',
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VendorFormData }) => 
      apiRequest('PATCH', `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
      vendorForm.reset();
      toast({
        title: 'Success',
        description: 'Vendor updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vendor',
        variant: 'destructive',
      });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: (data: LocationFormData) => apiRequest('POST', '/api/locations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      locationForm.reset();
      toast({
        title: 'Success',
        description: 'Location created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create location',
        variant: 'destructive',
      });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LocationFormData }) => 
      apiRequest('PATCH', `/api/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      locationForm.reset();
      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location',
        variant: 'destructive',
      });
    },
  });

  const createStoreMutation = useMutation({
    mutationFn: (data: StoreFormData) => apiRequest('POST', '/api/stores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      setIsStoreDialogOpen(false);
      setEditingStore(null);
      storeForm.reset();
      toast({
        title: 'Success',
        description: 'Store created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create store',
        variant: 'destructive',
      });
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StoreFormData }) => 
      apiRequest('PATCH', `/api/stores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      setIsStoreDialogOpen(false);
      setEditingStore(null);
      storeForm.reset();
      toast({
        title: 'Success',
        description: 'Store updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update store',
        variant: 'destructive',
      });
    },
  });

  // Forms
  const departmentForm = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: '',
      isActive: true,
    },
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      departmentId: undefined,
      isActive: true,
    },
  });

  const locationForm = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      code: '',
      name: '',
      zone: '',
      aisle: '',
      shelf: '',
      position: '',
      capacity: undefined,
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      contactPerson: '',
      isActive: true,
    },
  });

  const storeForm = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      storeNumber: '',
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      managerId: undefined,
      contactPerson: '',
      isActive: true,
    },
  });

  const vendorForm = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      code: '',
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      discountPercent: undefined,
      epDays: undefined,
      netDays: undefined,
      leadTime: undefined,
      paymentTerms: '',
      isActive: true,
    },
  });

  // Filter functions
  const filteredDepartments = departments.filter((dept: Department) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter((cat: Category) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.department?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
      vendor.code.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
      (vendor.contactName || '').toLowerCase().includes(vendorSearchTerm.toLowerCase());
    
    // If there's a search term, show both active and inactive results
    // Otherwise, apply the status filter
    if (vendorSearchTerm.trim()) {
      return matchesSearch;
    }
    
    const matchesStatus = vendorStatusFilter === 'all' ||
      (vendorStatusFilter === 'active' && vendor.isActive) ||
      (vendorStatusFilter === 'inactive' && !vendor.isActive);
    
    return matchesStatus;
  });

  // Pagination for categories
  const totalCategories = filteredCategories.length;
  const totalPages = Math.ceil(totalCategories / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handlers
  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    departmentForm.reset({
      name: department.name,
      isActive: department.isActive,
    });
    setIsDepartmentDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      departmentId: category.departmentId,
      isActive: category.isActive,
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    vendorForm.reset({
      code: vendor.code,
      name: vendor.name,
      contactName: vendor.contactName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zipCode: vendor.zipCode || '',
      discountPercent: vendor.discountPercent ? vendor.discountPercent.toString() : '',
      epDays: vendor.epDays ? vendor.epDays.toString() : '',
      netDays: vendor.netDays ? vendor.netDays.toString() : '',
      leadTime: vendor.leadTime ? vendor.leadTime.toString() : '',
      paymentTerms: vendor.paymentTerms || '',
      isActive: vendor.isActive,
    });
    setIsVendorDialogOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    locationForm.reset({
      code: location.code,
      name: location.name,
      zone: location.zone || '',
      aisle: location.aisle || '',
      shelf: location.shelf || '',
      position: location.position || '',
      capacity: location.capacity || undefined,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zipCode: location.zipCode || '',
      phone: location.phone || '',
      contactPerson: location.contactPerson || '',
      isActive: location.isActive,
    });
    setIsLocationDialogOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    storeForm.reset({
      storeNumber: store.storeNumber,
      name: store.name,
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      zipCode: store.zipCode || '',
      phone: store.phone || '',
      managerId: store.managerId || undefined,
      contactPerson: store.contactPerson || '',
      isActive: store.isActive,
    });
    setIsStoreDialogOpen(true);
  };

  const handleSubmitDepartment = (data: DepartmentFormData) => {
    if (editingDepartment) {
      updateDepartmentMutation.mutate({ id: editingDepartment.id, data });
    } else {
      createDepartmentMutation.mutate(data);
    }
  };

  const handleSubmitCategory = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleSubmitVendor = (data: VendorFormData) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data });
    } else {
      createVendorMutation.mutate(data);
    }
  };

  const handleSubmitLocation = (data: LocationFormData) => {
    if (editingLocation) {
      updateLocationMutation.mutate({ id: editingLocation.id, data });
    } else {
      createLocationMutation.mutate(data);
    }
  };

  const handleSubmitStore = (data: StoreFormData) => {
    if (editingStore) {
      updateStoreMutation.mutate({ id: editingStore.id, data });
    } else {
      createStoreMutation.mutate(data);
    }
  };

  const resetDepartmentForm = () => {
    departmentForm.reset();
    setEditingDepartment(null);
    setIsDepartmentDialogOpen(false);
  };

  const resetCategoryForm = () => {
    categoryForm.reset();
    setEditingCategory(null);
    setIsCategoryDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            System Maintenance
          </h1>
          <p className="text-muted-foreground">
            Manage control tables and system configuration data
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments and categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="stores">Stores</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Departments</CardTitle>
                  <CardDescription>
                    Critical for transfer filtering - Grocery, Liquor, Produce, Supplies, Apparel
                  </CardDescription>
                </div>
                <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingDepartment(null)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingDepartment ? 'Edit Department' : 'Add New Department'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...departmentForm}>
                      <form onSubmit={departmentForm.handleSubmit(handleSubmitDepartment)} className="space-y-4">
                        <FormField
                          control={departmentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., GROCERY, LIQUOR, PRODUCE" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={resetDepartmentForm}>
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
                          >
                            {createDepartmentMutation.isPending || updateDepartmentMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {departmentsLoading ? (
                <div className="text-center py-4">Loading departments...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.map((department: Department) => (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell>
                          <Badge variant={department.isActive ? 'default' : 'secondary'}>
                            {department.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(department.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDepartment(department)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredDepartments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No departments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vendors</CardTitle>
                  <CardDescription>
                    Vendor management with payment terms and discount information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-muted-foreground">Loading vendors...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search vendors by name, code, or contact..."
                        value={vendorSearchTerm}
                        onChange={(e) => setVendorSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          {filteredVendors.length} of {(vendors as Vendor[]).length} vendors
                        </div>
                        <Select value={vendorStatusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setVendorStatusFilter(value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={() => {
                            setEditingVendor(null);
                            vendorForm.reset({
                              code: '',
                              name: '',
                              contactName: '',
                              email: '',
                              phone: '',
                              address: '',
                              city: '',
                              state: '',
                              zipCode: '',
                              discountPercent: undefined,
                              epDays: undefined,
                              netDays: undefined,
                              leadTime: undefined,
                              paymentTerms: '',
                              isActive: true,
                            });
                          }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Vendor
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                            </DialogTitle>
                          </DialogHeader>
                          <Form {...vendorForm}>
                            <form onSubmit={vendorForm.handleSubmit(handleSubmitVendor)} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={vendorForm.control}
                                  name="code"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Vendor Code</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={vendorForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Vendor Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                          
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={vendorForm.control}
                                  name="contactName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Contact Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={vendorForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email</FormLabel>
                                      <FormControl>
                                        <Input type="email" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <FormField
                                  control={vendorForm.control}
                                  name="phone"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Phone</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={vendorForm.control}
                                  name="discountPercent"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Discount %</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.001"
                                          min="0"
                                          max="1"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={vendorForm.control}
                                  name="leadTime"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Lead Time (days)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <FormField
                                  control={vendorForm.control}
                                  name="epDays"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>EP Days</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={vendorForm.control}
                                  name="netDays"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Net Days</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={vendorForm.control}
                                  name="paymentTerms"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Payment Terms</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="space-y-4">
                                <FormField
                                  control={vendorForm.control}
                                  name="address"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Address</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="grid grid-cols-3 gap-4">
                                  <FormField
                                    control={vendorForm.control}
                                    name="city"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={vendorForm.control}
                                    name="state"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>State</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={vendorForm.control}
                                    name="zipCode"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>ZIP Code</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              <FormField
                                control={vendorForm.control}
                                name="isActive"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                      <FormLabel>Active Status</FormLabel>
                                      <FormDescription>
                                        Mark as inactive instead of deleting vendor records
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsVendorDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit">
                                  {editingVendor ? 'Update' : 'Create'} Vendor
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Payment Terms</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVendors.map((vendor: Vendor) => (
                          <TableRow key={vendor.id}>
                            <TableCell className="text-sm text-muted-foreground">{vendor.id}</TableCell>
                            <TableCell className="font-medium">{vendor.code}</TableCell>
                            <TableCell>{vendor.name}</TableCell>
                            <TableCell>
                              {vendor.contactName && (
                                <div className="text-sm">
                                  <div>{vendor.contactName}</div>
                                  {vendor.phone && <div className="text-muted-foreground">{vendor.phone}</div>}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {vendor.discountPercent && parseFloat(vendor.discountPercent.toString()) > 0 ? (
                                <div className="text-sm">
                                  <div>{vendor.epDays} days {(parseFloat(vendor.discountPercent.toString()) * 100).toFixed(1)}%</div>
                                  <div className="text-muted-foreground">Net {vendor.netDays || 30}</div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  Net {vendor.netDays || 30} days
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                                {vendor.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditVendor(vendor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredVendors.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              No vendors found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Product categories within departments - primarily for reporting and organization
                  </CardDescription>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingCategory(null)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(handleSubmitCategory)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., FRUIT, JUICE, VEGETABLES" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={categoryForm.control}
                          name="departmentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department (Optional)</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departments.map((dept: Department) => (
                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={resetCategoryForm}>
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                          >
                            {createCategoryMutation.isPending || updateCategoryMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="text-center py-4">Loading categories...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCategories.map((category: Category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.department?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? 'default' : 'secondary'}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(category.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCategories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No categories found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              
              {totalCategories > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalCategories)} of {totalCategories} categories
                    </span>
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Warehouse Locations</CardTitle>
                  <CardDescription>
                    Manage warehouse zones, aisles, and storage positions
                  </CardDescription>
                </div>
                <Button onClick={() => setIsLocationDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-muted-foreground">Loading locations...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location: Location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.code}</TableCell>
                        <TableCell>{location.name}</TableCell>
                        <TableCell>{location.zone || 'N/A'}</TableCell>
                        <TableCell>
                          {[location.aisle, location.shelf, location.position].filter(Boolean).join('-') || 'N/A'}
                        </TableCell>
                        <TableCell>{location.capacity || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={location.isActive ? 'default' : 'secondary'}>
                            {location.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingLocation(location);
                              setIsLocationDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No locations found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Retail Stores</CardTitle>
                  <CardDescription>
                    Manage retail store locations for transfers
                  </CardDescription>
                </div>
                <Button onClick={() => setIsStoreDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-muted-foreground">Loading stores...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Zip</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store: Store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.storeNumber}</TableCell>
                        <TableCell>{store.name}</TableCell>
                        <TableCell>{store.contactPerson || 'N/A'}</TableCell>
                        <TableCell>{store.address || 'N/A'}</TableCell>
                        <TableCell>{store.city || 'N/A'}</TableCell>
                        <TableCell>{store.state || 'N/A'}</TableCell>
                        <TableCell>{store.zipCode || 'N/A'}</TableCell>
                        <TableCell>{store.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? 'default' : 'secondary'}>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStore(store);
                              setIsStoreDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stores.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-4">
                          No stores found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Unit Types Configuration</CardTitle>
                  <CardDescription>
                    Manage purchase and transfer unit types (Case, Pallet, Layer, etc.)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {unitTypesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-muted-foreground">Loading unit types...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitTypes.map((unitType: UnitType) => (
                      <TableRow key={unitType.id}>
                        <TableCell className="font-medium">{unitType.id}</TableCell>
                        <TableCell>{unitType.name}</TableCell>
                        <TableCell>{unitType.description || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={unitType.isActive ? 'default' : 'secondary'}>
                            {unitType.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {unitTypes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No unit types found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}