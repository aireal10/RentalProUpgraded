
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { useSettings } from "../context/SettingsContext";
import { base44 } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Plus, Building2, Trash2 } from "../components/Icons";
import PropertyForm from "../components/properties/PropertyForm";
import PropertyTable from "../components/properties/PropertyTable";
import { Property, Unit, Contract, Invoice, LeasePayment, Expense } from "../types";

export default function Properties() {
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();
  const { t } = useSettings();

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: leasePayments = [], isLoading: loadingLeasePayments } = useQuery<LeasePayment[]>({
    queryKey: ['LeasePayment'],
    queryFn: () => base44.entities.LeasePayment.list(),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });
  
  const isLoading = loadingProperties || loadingUnits || loadingContracts || loadingInvoices || loadingLeasePayments || loadingExpenses;

  const deletePropertyAndChildren = async (propertyId: string) => {
    // Find related items
    const propertyUnits = units.filter(u => u.property_id === propertyId);
    const unitIds = propertyUnits.map(u => u.id);
    const relatedContracts = contracts.filter(c => unitIds.includes(c.unit_id));
    const contractIds = relatedContracts.map(c => c.id);
    const relatedInvoiceIds = invoices.filter(i => contractIds.includes(i.contract_id)).map(i => i.id);
    const relatedLeasePaymentIds = leasePayments.filter(lp => lp.property_id === propertyId).map(lp => lp.id);
    const relatedExpenseIds = expenses.filter(e => e.property_id === propertyId).map(e => e.id);
    
    // Perform bulk deletions for efficiency
    // Delete dependent data first to avoid foreign key constraints
    await base44.entities.Invoice.bulkDelete(relatedInvoiceIds);
    await base44.entities.Contract.bulkDelete(contractIds);
    await base44.entities.Unit.bulkDelete(unitIds);
    await base44.entities.LeasePayment.bulkDelete(relatedLeasePaymentIds);
    await base44.entities.Expense.bulkDelete(relatedExpenseIds);
    
    // Finally, delete the property itself
    await base44.entities.Property.delete(propertyId);
  };

  const deleteMutation = useMutation({
    mutationFn: deletePropertyAndChildren,
    onSuccess: () => {
      queryClient.invalidateQueries(['properties', 'units', 'contracts', 'invoices', 'LeasePayment', 'expenses']);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deletePropertyAndChildren(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['properties', 'units', 'contracts', 'invoices', 'LeasePayment', 'expenses']);
    },
  });

  const handleDelete = async (property: Property) => {
    const confirmed = await confirmDelete({
        title: t('delete') + ' ' + t('properties'),
        message: `Are you sure you want to delete ${property.name}? This will delete all related units, contracts, invoices, expenses, and lease payments. This action cannot be undone.`,
        variant: 'destructive',
        confirmText: t('delete')
    });
    if (confirmed) {
      deleteMutation.mutate(property.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmDelete({
        title: `${t('deleteSelected')} (${selectedIds.length})`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected properties and all their related data? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: t('delete')
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProperty(null);
  };

  const filteredProperties = properties.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteMutation.isPending || deleteSelectedMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('properties')}</h1>
            <p className="text-slate-600 mt-1">{t('manageProperties')}</p>
          </div>
          <div className="flex gap-3">
            {selectedIds.length > 0 ? (
               <Button
                onClick={handleDeleteSelected}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
                disabled={deleteSelectedMutation.isPending}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                {t('deleteSelected')} ({selectedIds.length})
              </Button>
            ) : null}
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('addProperty')}
            </Button>
          </div>
        </div>

        {showForm && (
          <PropertyForm
            property={editingProperty}
            units={units}
            onClose={handleFormClose}
          />
        )}

        <Card className="shadow-md border-none">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t('properties')}
              </CardTitle>
              <div className="w-full max-w-xs">
                <Input 
                  type="search"
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PropertyTable
              properties={filteredProperties}
              units={units}
              contracts={contracts}
              invoices={invoices}
              leasePayments={leasePayments}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
