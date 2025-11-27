
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { CreditCard, Trash2 } from "../components/Icons";
import LeasePaymentTable from "../components/leasepayments/LeasePaymentTable";
import LeasePaymentModal from "../components/leasepayments/LeasePaymentModal";
import { LeasePayment, Property } from "../types";

type StatusFilter = 'all' | 'paid' | 'due';

export default function LeasePayments() {
  const [selectedObligation, setSelectedObligation] = useState<LeasePayment | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();

  const { data: leasePayments = [], isLoading } = useQuery<LeasePayment[]>({
    queryKey: ['lease-payments'],
    queryFn: () => base44.entities.LeasePayment.list('-due_date'),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<LeasePayment> }) => base44.entities.LeasePayment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lease-payments']);
      setSelectedObligation(null);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => base44.entities.LeasePayment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lease-payments']);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await base44.entities.LeasePayment.delete(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['lease-payments']);
    },
  });

  const filteredPayments = React.useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    return leasePayments.filter(payment => {
      const dueDate = new Date(payment.due_date);
      const dateMatch = (!dateFrom || dueDate >= new Date(dateFrom + 'T00:00:00')) && (!dateTo || dueDate <= new Date(dateTo + 'T23:59:59'));
      
      const statusMatch = statusFilter === 'all' 
        || (statusFilter === 'paid' && payment.status === 'paid')
        || (statusFilter === 'due' && (payment.status === 'unpaid' || payment.status === 'partial'));

      const propertyName = properties.find(p => p.id === payment.property_id)?.name || '';
      const searchMatch = !searchTerm || propertyName.toLowerCase().includes(lowercasedSearch);

      return dateMatch && statusMatch && searchMatch;
    });
  }, [leasePayments, dateFrom, dateTo, statusFilter, searchTerm, properties]);

  const handlePayment = (payment: LeasePayment) => {
    setSelectedObligation(payment);
  };

  const handleRecordPayment = () => {
    const firstUnpaid = leasePayments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).find(p => p.status === 'unpaid' || p.status === 'partial');
    if (firstUnpaid) {
      setSelectedObligation(firstUnpaid);
    } else {
      alert("No due payments to record.");
    }
  };

  const handleDelete = async (payment: LeasePayment) => {
    const confirmed = await confirmDelete({
        title: 'Delete Lease Payment',
        message: 'Are you sure you want to delete this lease payment?',
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deletePaymentMutation.mutate(payment.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmDelete({
        title: `Delete ${selectedIds.length} Lease Payments`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected lease payments? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const handlePaymentSubmit = (amount: number) => {
    if (!selectedObligation) return;
    const newPaidAmount = (selectedObligation.paid_amount || 0) + amount;
    const totalAmount = selectedObligation.amount;
    
    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newPaidAmount >= totalAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    updatePaymentMutation.mutate({
      id: selectedObligation.id,
      data: {
        paid_amount: newPaidAmount,
        status: newStatus,
      },
    });
  };
  
  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter('all');
    setSearchTerm("");
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deletePaymentMutation.isPending || deleteSelectedMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lease Payments</h1>
          <p className="text-slate-600 mt-1">Track lease payments to property owners</p>
        </div>

        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-slate-50 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-grow">
                <Input 
                  type="search" 
                  placeholder="Search by Property Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full max-w-xs"
                />
              </div>
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
              <Button onClick={handleClearFilters} variant="outline">Clear Filters</Button>
              {selectedIds.length > 0 && (
                <Button onClick={handleDeleteSelected} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" disabled={deleteSelectedMutation.isPending}>
                  <Trash2 className="w-5 h-5 mr-2" /> Delete Selected ({selectedIds.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Owner Payment Obligations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeasePaymentTable 
              leasePayments={filteredPayments} 
              properties={properties} 
              isLoading={isLoading} 
              onPayment={handlePayment} 
              onRecordPayment={handleRecordPayment} 
              onDelete={handleDelete} 
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
            />
          </CardContent>
        </Card>

        {selectedObligation && (
          <LeasePaymentModal payment={selectedObligation} property={properties.find(p => p.id === selectedObligation.property_id)} onClose={() => setSelectedObligation(null)} onSubmit={handlePaymentSubmit} isProcessing={updatePaymentMutation.isPending} />
        )}
      </div>
    </div>
  );
}
