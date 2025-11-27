
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Plus, FileText, Trash2 } from "../components/Icons";
import ContractForm from "../components/contracts/ContractForm";
import ContractTable from "../components/contracts/ContractTable";
import { Contract, Tenant, Unit, Property, Invoice } from "../types";

export default function Contracts() {
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [rentFilter, setRentFilter] = useState('');

  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date'),
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
  
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const isLoading = loadingContracts || !invoices;

  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || '';
  const getUnitInfo = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return '';
    const property = properties.find(p => p.id === unit.property_id);
    return `${property?.name || ''} - Unit ${unit.unit_number}`;
  };

  const filteredContracts = useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const rentAmount = parseFloat(rentFilter);

    return contracts.filter(c => {
      const searchMatch = !searchTerm ||
        getTenantName(c.tenant_id).toLowerCase().includes(lowercasedSearch) ||
        getUnitInfo(c.unit_id).toLowerCase().includes(lowercasedSearch);
      
      const statusMatch = statusFilter === 'all' || c.status === statusFilter;
      const frequencyMatch = frequencyFilter === 'all' || c.payment_frequency === frequencyFilter;
      const rentMatch = !rentFilter || isNaN(rentAmount) || c.total_rent === rentAmount;

      return searchMatch && statusMatch && frequencyMatch && rentMatch;
    });
  }, [contracts, searchTerm, statusFilter, frequencyFilter, rentFilter, tenants, units, properties]);

  const deleteContractAndRelations = async (contractId: string) => {
    const contractToDelete = contracts.find(c => c.id === contractId);
    if (!contractToDelete) return;

    // Delete associated invoices
    const contractInvoices = invoices.filter(i => i.contract_id === contractId);
    for (const invoice of contractInvoices) {
        await base44.entities.Invoice.delete(invoice.id);
    }

    // Update unit status to vacant
    if (contractToDelete.unit_id) {
        await base44.entities.Unit.update(contractToDelete.unit_id, { status: 'vacant' });
    }

    // Delete the contract
    await base44.entities.Contract.delete(contractId);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteContractAndRelations,
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts', 'invoices', 'units']);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteContractAndRelations(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['contracts', 'invoices', 'units']);
    },
  });

  const handleDelete = async (contract: Contract) => {
    const confirmed = await confirmDelete({
        title: 'Delete Contract',
        message: 'Are you sure you want to delete this contract? This will also delete all its invoices.',
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteMutation.mutate(contract.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmDelete({
        title: `Delete ${selectedIds.length} Contracts`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected contracts and their related data? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteMutation.isPending || deleteSelectedMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
            <p className="text-slate-600 mt-1">Manage rental agreements and contracts</p>
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
                Delete Selected ({selectedIds.length})
              </Button>
            ): null}
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Contract
            </Button>
          </div>
        </div>

        {showForm && (
          <ContractForm
            tenants={tenants}
            units={units}
            properties={properties}
            onClose={() => setShowForm(false)}
          />
        )}

        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-slate-50 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <Input 
                  type="search"
                  placeholder="Search by tenant or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="sm:col-span-2"
                />
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                </Select>
                 <Select value={frequencyFilter} onChange={e => setFrequencyFilter(e.target.value)}>
                    <option value="all">All Frequencies</option>
                    <option value="monthly">Monthly</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="yearly">Yearly</option>
                </Select>
                 <Input 
                  type="number"
                  placeholder="Filter by Total Rent..."
                  value={rentFilter}
                  onChange={(e) => setRentFilter(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardHeader>
             <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                All Contracts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ContractTable
              contracts={filteredContracts}
              tenants={tenants}
              units={units}
              properties={properties}
              isLoading={isLoading}
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
