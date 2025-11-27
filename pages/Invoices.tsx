

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Receipt, Trash2 } from "../components/Icons";
import InvoiceTable from "../components/invoices/InvoiceTable";
import PaymentModal from "../components/invoices/PaymentModal";
import { Invoice, Contract, Tenant, Unit, Property } from "../types";
import { format } from "../utils/helpers";

type StatusFilter = 'all' | 'paid' | 'due';

export default function RentPayments() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastContracts, setShowPastContracts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-due_date'),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list(),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });
  
  const isLoading = loadingInvoices || loadingContracts;

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Invoice> }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      setSelectedInvoice(null);
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await base44.entities.Invoice.delete(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['invoices']);
    },
  });

  const filteredInvoices = React.useMemo(() => {
    if (loadingContracts || loadingInvoices) return [];
    
    const lowercasedSearch = searchTerm.toLowerCase();
    
    const contractMap = new Map<string, Contract>(contracts.map(c => [c.id, c]));
    const tenantMap = new Map<string, Tenant>(tenants.map(t => [t.id, t]));
    const unitMap = new Map<string, Unit>(units.map(u => [u.id, u]));

    return invoices.filter(inv => {
      const contract = contractMap.get(inv.contract_id);
      if (!contract) return false;

      const tenant = tenantMap.get(contract.tenant_id);
      if (!tenant) return false;

      const unit = unitMap.get(contract.unit_id);

      if (!showPastContracts && contract.status !== 'active') return false;
      
      const dueDate = new Date(inv.due_date);
      const dateMatch = (!dateFrom || dueDate >= new Date(dateFrom + 'T00:00:00')) && (!dateTo || dueDate <= new Date(dateTo + 'T23:59:59'));
      
      const statusMatch = statusFilter === 'all' 
        || (statusFilter === 'paid' && inv.status === 'paid')
        || (statusFilter === 'due' && (inv.status === 'unpaid' || inv.status === 'partial'));

      const searchMatch = !searchTerm ||
        tenant.name.toLowerCase().includes(lowercasedSearch) ||
        tenant.iqama_number.toLowerCase().includes(lowercasedSearch) ||
        (unit && unit.unit_number.toLowerCase().includes(lowercasedSearch));

      return dateMatch && statusMatch && searchMatch;
    });
  }, [invoices, contracts, tenants, units, dateFrom, dateTo, statusFilter, searchTerm, showPastContracts, loadingContracts, loadingInvoices]);

  const handleDelete = async (invoice: Invoice) => {
    const confirmed = await confirmDelete({
        title: 'Delete Rent Payment',
        message: 'Are you sure you want to delete this rent payment record?',
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmDelete({
        title: `Delete ${selectedIds.length} Rent Payments`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected rent payments? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handlePaymentSubmit = (amount: number) => {
    if(!selectedInvoice) return;
    const newPaidAmount = (selectedInvoice.paid_amount || 0) + amount;
    const totalAmount = selectedInvoice.amount;
    
    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newPaidAmount >= totalAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    updateInvoiceMutation.mutate({
      id: selectedInvoice.id,
      data: {
        paid_amount: newPaidAmount,
        status: newStatus,
      },
    });
  };
  
  const handlePrintReceipt = (invoice: Invoice) => {
    const contract = contracts.find(c => c.id === invoice.contract_id);
    const tenant = tenants.find(t => t.id === contract?.tenant_id);
    const unit = units.find(u => u.id === contract?.unit_id);
    const property = properties.find(p => p.id === unit?.property_id);
    const receiptDate = new Date();
    
    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>Payment Receipt / إيصال دفع</title>
          <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; direction: ltr; margin: 0; padding: 20px; background-color: #f9fafb; color: #1f2937; -webkit-print-color-adjust: exact; }
              .receipt-container { max-width: 800px; margin: auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #2563eb; }
              .header .date { margin: 8px 0 0; color: #4b5563; font-size: 14px; }
              .details-grid { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 40px; }
              .details-section { background-color: #f9fafb; padding: 20px; border-radius: 8px; flex-basis: 48%; border: 1px solid #e5e7eb; }
              .details-section h2 { margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #2563eb; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; }
              .details-section p { margin: 8px 0; font-size: 14px; display: flex; justify-content: space-between; }
              .details-section strong { font-weight: 700; color: #111827; }
              .payment-info-header { text-align: center; margin-bottom: 20px; }
              .payment-info-header h2 { margin: 0; font-size: 22px; font-weight: 700; color: #2563eb; }
              .payment-details table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .payment-details th, .payment-details td { padding: 12px 15px; border: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
              .payment-details th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
              .payment-details .total-row td { font-weight: bold; font-size: 18px; background-color: #dbeafe !important; color: #1e3a8a !important; }
              .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .arabic { font-family: 'Tahoma', sans-serif; }
          </style>
      </head>
      <body>
          <div class="receipt-container">
              <div class="header">
                  <h1>Payment Receipt / <span class="arabic">إيصال دفع</span></h1>
                  <p class="date">Date / <span class="arabic">التاريخ</span>: ${format(receiptDate, 'dd/MM/yyyy')}</p>
              </div>
  
              <div class="details-grid">
                  <div class="details-section">
                      <h2>Tenant Details (<span class="arabic">تفاصيل المستأجر</span>)</h2>
                      <p><strong><span class="arabic">الاسم</span>:</strong> <span>${tenant?.name || 'N/A'}</span></p>
                      <p><strong><span class="arabic">رقم الإقامة</span>:</strong> <span>${tenant?.iqama_number || 'N/A'}</span></p>
                      <p><strong><span class="arabic">رقم الهاتف</span>:</strong> <span>${tenant?.phone || 'N/A'}</span></p>
                  </div>
                  <div class="details-section">
                      <h2>Property Details (<span class="arabic">تفاصيل العقار</span>)</h2>
                      <p><strong>Property:</strong> <span>${property?.name || 'N/A'}</span></p>
                      <p><strong>Unit:</strong> <span>${unit?.unit_number || 'N/A'}</span></p>
                      <p><strong>Address:</strong> <span>${property?.address || 'N/A'}</span></p>
                  </div>
              </div>
  
              <div class="payment-info-header">
                  <h2>Payment Information / <span class="arabic">معلومات الدفع</span></h2>
              </div>
              <div class="payment-details">
                  <table>
                      <thead>
                          <tr>
                              <th>Description (<span class="arabic">الوصف</span>)</th>
                              <th>Amount (<span class="arabic">المبلغ</span>)</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td>Rent Payment for Due Date: ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}</td>
                              <td>SAR ${invoice.paid_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr class="total-row">
                              <td>Total Paid / <span class="arabic">المبلغ الإجمالي المدفوع</span></td>
                              <td>SAR ${invoice.paid_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
              
              <div class="footer">
                  <p>This is a computer-generated receipt and does not require a signature.</p>
                  <p class="arabic">هذا إيصال تم إنشاؤه بواسطة الكمبيوتر ولا يتطلب توقيعًا</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert("Please allow popups to print the receipt.");
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteInvoiceMutation.isPending || deleteSelectedMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rent Payments</h1>
          <p className="text-slate-600 mt-1">Track tenant rent payments and outstanding balances</p>
        </div>

        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-slate-50 p-4 space-y-4">
             <div className="flex flex-wrap items-center gap-4">
                <div className="flex-grow">
                  <Input 
                    type="search" 
                    placeholder="Search by Tenant, Iqama, or Unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm"
                  />
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch
                        id="show-past-contracts"
                        checked={showPastContracts}
                        onCheckedChange={setShowPastContracts}
                    />
                    <Label htmlFor="show-past-contracts" className="cursor-pointer text-sm font-normal">Show Past Contract Payments</Label>
                </div>
             </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="statusFilter" className="text-sm">Status:</Label>
                <Select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-28">
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="due">Due</option>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dateFrom" className="text-sm">Due From:</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dateTo" className="text-sm">Due To:</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <Button onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter('all'); setSearchTerm(""); }} variant="outline">Clear Filters</Button>
              {selectedIds.length > 0 && (
                <Button onClick={handleDeleteSelected} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 ml-auto" disabled={deleteSelectedMutation.isPending}>
                  <Trash2 className="w-5 h-5 mr-2" /> Delete Selected ({selectedIds.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" /> Rent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceTable 
                invoices={filteredInvoices} 
                contracts={contracts} 
                tenants={tenants} 
                units={units} 
                properties={properties} 
                isLoading={isLoading} 
                onPayment={handlePayment} 
                onDelete={handleDelete}
                onPrintReceipt={handlePrintReceipt}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
             />
          </CardContent>
        </Card>

        {selectedInvoice && (
          <PaymentModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onSubmit={handlePaymentSubmit} isProcessing={updateInvoiceMutation.isPending} />
        )}
      </div>
    </div>
  );
}