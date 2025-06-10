import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency, formatNumber , formatCurrencyInput, parseCurrency } from "@/lib/formatNumber";

export default function PurchaseOrderView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const { data: po, isLoading } = useQuery({
    queryKey: [`/api/purchase-orders/${id}`],
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!po) return <div className="p-6">Purchase order not found</div>;

  const poData = po as any;
  
  // Calculate totals
  const subtotal = poData.items?.reduce((sum: number, item: any) => {
    const productOffInvoice = parseFloat(item.product?.offInvoice || '0');
    const itemOffInvoice = parseFloat(item.offInvoice || '0');
    const displayOffInvoice = itemOffInvoice > 0 ? itemOffInvoice : productOffInvoice;
    
    const listCost = parseFloat(item.listCost || '0');
    const billBack = parseFloat(item.billBack || '0');
    const netCost = listCost - displayOffInvoice - billBack;
    const extended = item.quantityOrdered * netCost;
    
    return sum + extended;
  }, 0) || 0;

  return (
    <div>
      {/* Screen-only navigation */}
      <div className="print:hidden p-6 space-y-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setLocation('/purchase-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => setLocation(`/purchase-orders/edit/${id}`)}>
              Edit Order
            </Button>
            <Button onClick={() => setLocation(`/purchase-orders/receive/${id}`)}>
              Receive Items
            </Button>
          </div>
        </div>
      </div>

      {/* Professional purchase order document */}
      <div className="print:p-0 print:m-0 p-6 max-w-6xl mx-auto bg-white min-h-screen print:min-h-0">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">PURCHASE ORDER</h1>
              <div className="text-lg text-gray-600">
                <div>Cost Less Warehouse</div>
                <div>123 Business Street</div>
                <div>Business City, CA 90210</div>
                <div>Phone: (555) 123-4567</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-800 mb-2">#{poData.poNumber}</div>
              <div className="text-lg">
                <div><strong>Date:</strong> {new Date(poData.orderDate).toLocaleDateString()}</div>
                <div><strong>Expected:</strong> {poData.expectedDate ? new Date(poData.expectedDate).toLocaleDateString() : 'TBD'}</div>
                {poData.receivedDate && <div><strong>Received:</strong> {new Date(poData.receivedDate).toLocaleDateString()}</div>}
                <div><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${
                  poData.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  poData.status === 'Received' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>{poData.status}</span></div>
                {poData.orderType && <div><strong>Type:</strong> {poData.orderType}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">VENDOR INFORMATION</h2>
            <div className="space-y-2 text-lg">
              <div><strong>Company:</strong> {poData.vendor?.name || 'N/A'}</div>
              <div><strong>Code:</strong> {poData.vendor?.code || 'N/A'}</div>
              <div><strong>Contact:</strong> {poData.vendor?.contactName || 'N/A'}</div>
              <div><strong>Phone:</strong> {poData.vendor?.phone || 'N/A'}</div>
              <div><strong>Email:</strong> {poData.vendor?.email || 'N/A'}</div>
              {poData.vendor?.address && (
                <div>
                  <strong>Address:</strong><br />
                  {poData.vendor.address}<br />
                  {poData.vendor.city}, {poData.vendor.state} {poData.vendor.zipCode}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">DELIVERY INFORMATION</h2>
            <div className="space-y-2 text-lg">
              <div><strong>Ship To:</strong> Cost Less Warehouse</div>
              <div><strong>Address:</strong><br />123 Business Street<br />Business City, CA 90210</div>
              <div><strong>Contact:</strong> Receiving Department</div>
              <div><strong>Phone:</strong> (555) 123-4567</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">ITEMS ORDERED</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-600 px-3 py-3 text-left font-bold">PRODUCT DESCRIPTION</th>
                  <th className="border border-gray-600 px-3 py-3 text-center font-bold">QTY ORD</th>
                  <th className="border border-gray-600 px-3 py-3 text-center font-bold">QTY REC</th>
                  <th className="border border-gray-600 px-3 py-3 text-right font-bold">LIST COST</th>
                  <th className="border border-gray-600 px-3 py-3 text-right font-bold">OFF INVOICE</th>
                  <th className="border border-gray-600 px-3 py-3 text-right font-bold">BILL BACK</th>
                  <th className="border border-gray-600 px-3 py-3 text-right font-bold">NET COST</th>
                  <th className="border border-gray-600 px-3 py-3 text-right font-bold">EXTENDED</th>
                </tr>
              </thead>
              <tbody>
                {poData.items?.map((item: any, index: number) => {
                  const productOffInvoice = parseFloat(item.product?.offInvoice || '0');
                  const itemOffInvoice = parseFloat(item.offInvoice || '0');
                  const displayOffInvoice = itemOffInvoice > 0 ? itemOffInvoice : productOffInvoice;
                  
                  const listCost = parseFloat(item.listCost || '0');
                  const billBack = parseFloat(item.billBack || '0');
                  const netCost = listCost - displayOffInvoice - billBack;
                  const extended = item.quantityOrdered * netCost;

                  return (
                    <tr key={index} className="border-b border-gray-300">
                      <td className="border border-gray-300 px-3 py-3">
                        <div className="font-medium text-gray-900">
                          {item.product?.productDescription || item.product?.name || `Product ${item.productId}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.product?.casePack && item.product?.size && 
                            `Pack: ${item.product.casePack}/${item.product.size}`
                          }
                          {item.purchaseWeight && <div>Weight: {item.purchaseWeight} lbs</div>}
                          {item.unitSize && <div>Unit: {item.unitSize}</div>}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-center font-medium">{formatNumber(item.quantityOrdered)}</td>
                      <td className="border border-gray-300 px-3 py-3 text-center font-medium">
                        {item.quantityReceived ? formatNumber(item.quantityReceived) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-right">{formatCurrency(listCost)}</td>
                      <td className="border border-gray-300 px-3 py-3 text-right">{formatCurrency(displayOffInvoice)}</td>
                      <td className="border border-gray-300 px-3 py-3 text-right">{formatCurrency(billBack)}</td>
                      <td className="border border-gray-300 px-3 py-3 text-right font-medium">{formatCurrency(netCost)}</td>
                      <td className="border border-gray-300 px-3 py-3 text-right font-bold">{formatCurrency(extended)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="border border-gray-300 px-3 py-3 text-right font-bold" colSpan={7}>
                    SUBTOTAL:
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-right font-bold">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
                {(poData.taxAmount && parseFloat(poData.taxAmount) > 0) && (
                  <tr>
                    <td className="border border-gray-300 px-3 py-3 text-right font-bold" colSpan={7}>
                      TAX:
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right">
                      {formatCurrency(poData.taxAmount)}
                    </td>
                  </tr>
                )}
                {(poData.shippingAmount && parseFloat(poData.shippingAmount) > 0) && (
                  <tr>
                    <td className="border border-gray-300 px-3 py-3 text-right font-bold" colSpan={7}>
                      SHIPPING:
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right">
                      {formatCurrency(poData.shippingAmount)}
                    </td>
                  </tr>
                )}
                {(poData.deliveryCharge && parseFloat(poData.deliveryCharge) > 0) && (
                  <tr>
                    <td className="border border-gray-300 px-3 py-3 text-right font-bold" colSpan={7}>
                      DELIVERY:
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right">
                      {formatCurrency(poData.deliveryCharge)}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-100 border-t-2 border-gray-800">
                  <td className="border border-gray-300 px-3 py-4 text-right font-bold" colSpan={7}>
                    TOTAL AMOUNT:
                  </td>
                  <td className="border border-gray-300 px-3 py-4 text-right font-bold text-xl">
                    {formatCurrency(poData.totalAmount || subtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes and Special Instructions */}
        {(poData.notes || poData.specialInstructions) && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">NOTES & INSTRUCTIONS</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              {poData.notes && (
                <div className="mb-3">
                  <strong>Notes:</strong>
                  <div className="mt-1 text-gray-700">{poData.notes}</div>
                </div>
              )}
              {poData.specialInstructions && (
                <div>
                  <strong>Special Instructions:</strong>
                  <div className="mt-1 text-gray-700">{poData.specialInstructions}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t-2 border-gray-800">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-2">TERMS & CONDITIONS</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• Payment terms: Net 30 days</div>
                <div>• All items subject to availability</div>
                <div>• Prices valid for 30 days</div>
                <div>• Returns require prior authorization</div>
              </div>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg mb-2">AUTHORIZED BY</h3>
              <div className="mt-8 border-b border-gray-400 w-48 ml-auto"></div>
              <div className="text-sm text-gray-600 mt-2">Signature & Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}