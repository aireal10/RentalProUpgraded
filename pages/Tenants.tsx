
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Plus, Users, Trash2, Loader2 } from "../components/Icons";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import TenantContractForm from "../components/tenants/TenantContractForm";
import TenantTable from "../components/tenants/TenantTable";
import RenewContractModal from "../components/tenants/RenewContractModal";
import TerminationModal from "../components/tenants/TerminationModal";
import { format, addHijriMonths, formatHijri } from "../utils/helpers";
import { Tenant, Contract, Unit, Property, Invoice } from "../types";

export default function Tenants() {
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingContract, setGeneratingContract] = useState(false);
  const [renewingContract, setRenewingContract] = useState<Contract | null>(null);
  const [terminationModal, setTerminationModal] = useState<{
    isOpen: boolean;
    tenantId: string;
    data: any;
  } | null>(null);
  
  const queryClient = useQueryClient();
  const { prompt: confirmAction, ConfirmationModal } = useConfirmation();

  const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list('-created_at'),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });
  
  useEffect(() => {
    if (!loadingContracts && contracts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const updatesToPerform: { contractId: string; unitId?: string }[] = [];

      contracts.forEach(contract => {
        const endDate = new Date(contract.end_date);
        if (contract.status === 'active' && endDate < today) {
          updatesToPerform.push({ contractId: contract.id, unitId: contract.unit_id });
        }
      });

      if (updatesToPerform.length > 0) {
        const updatePromises = updatesToPerform.flatMap(({ contractId, unitId }) => {
          const promises = [base44.entities.Contract.update(contractId, { status: 'expired' })];
          if (unitId) {
            promises.push(base44.entities.Unit.update(unitId, { status: 'vacant' }));
          }
          return promises;
        });

        Promise.all(updatePromises).then(() => {
          queryClient.invalidateQueries(['contracts', 'units']);
        });
      }
    }
  }, [contracts, loadingContracts, queryClient]);

  const deleteTenantAndRelations = async (tenantId: string) => {
    const tenantContracts = contracts.filter(c => c.tenant_id === tenantId);
    const contractIds = tenantContracts.map(c => c.id);
    const invoiceIds = invoices.filter(i => contractIds.includes(i.contract_id)).map(i => i.id);

    await base44.entities.Invoice.bulkDelete(invoiceIds);
    await base44.entities.Contract.bulkDelete(contractIds);
    
    for (const contract of tenantContracts) {
        if (contract.unit_id) {
            await base44.entities.Unit.update(contract.unit_id, { status: 'vacant' });
        }
    }
    await base44.entities.Tenant.delete(tenantId);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteTenantAndRelations,
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants', 'contracts', 'invoices', 'units']);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteTenantAndRelations(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['tenants', 'contracts', 'invoices', 'units']);
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async ({ tenantId, condition }: { tenantId: string, condition: string }) => {
      const tenantContracts = contracts.filter(c => c.tenant_id === tenantId && c.status === 'active');
      for (const contract of tenantContracts) {
        await base44.entities.Contract.update(contract.id, { 
            status: 'terminated',
            condition_at_move_out: condition 
        });
        if (contract.unit_id) {
          await base44.entities.Unit.update(contract.unit_id, { status: 'vacant' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts', 'units']);
      setTerminationModal(null);
    },
  });
  
  const restoreMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const tenantContract = contracts.find(c => c.tenant_id === tenantId && c.status === 'terminated');
      if (tenantContract) {
        await base44.entities.Contract.update(tenantContract.id, { status: 'active' });
        if (tenantContract.unit_id) {
          await base44.entities.Unit.update(tenantContract.unit_id, { status: 'occupied' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts', 'units']);
    }
  });

  const renewMutation = useMutation({
    mutationFn: async ({ contract, newRent, newEndDate, newFrequency }: { contract: Contract, newRent: number, newEndDate: string, newFrequency: Contract['payment_frequency'] }) => {
        await base44.entities.Contract.update(contract.id, { status: 'expired' });

        const newContractData = {
          tenant_id: contract.tenant_id,
          unit_id: contract.unit_id,
          start_date: contract.end_date,
          end_date: newEndDate,
          total_rent: newRent,
          payment_frequency: newFrequency,
          contract_url: contract.contract_url,
          status: 'active' as 'active',
          security_deposit: contract.security_deposit, // Carry over deposit
          advance_payment: 0 // Reset advance
        };
        const newContract = await base44.entities.Contract.create(newContractData);
        
        if (contract.unit_id) {
          await base44.entities.Unit.update(contract.unit_id, { status: 'occupied' });
        }

        const startDate = new Date(`${newContract.start_date}T00:00:00Z`);
        const endDate = new Date(`${newContract.end_date}T00:00:00Z`);
        
        let monthsIncrement = 12;
        if (newFrequency === "3_months") monthsIncrement = 3;
        else if (newFrequency === "6_months") monthsIncrement = 6;
        else if (newFrequency === "monthly") monthsIncrement = 1;
        
        const newInvoices: Omit<Invoice, 'id' | 'created_at'>[] = [];
        let currentDate = new Date(startDate);
        
        while (currentDate < endDate) {
            newInvoices.push({ contract_id: newContract.id, due_date: format(currentDate, "yyyy-MM-dd"), amount: 0, paid_amount: 0, status: "unpaid" });
            currentDate = addHijriMonths(currentDate, monthsIncrement);
        }
        
        if (newInvoices.length > 0) {
            const amountPerPayment = newRent / newInvoices.length;
            newInvoices.forEach(inv => inv.amount = amountPerPayment);
            await base44.entities.Invoice.bulkCreate(newInvoices);
        }
        
        return newContract;
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['contracts', 'invoices', 'units', 'tenants']);
        setRenewingContract(null);
    }
  });

  const handleDelete = async (tenant: Tenant) => {
    const confirmed = await confirmAction({
        title: 'Delete Tenant',
        message: `Are you sure you want to delete ${tenant.name}? This will remove all associated contracts and invoices.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteMutation.mutate(tenant.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmAction({
        title: `Delete ${selectedIds.length} Tenants`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected tenants and their related data? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const handleTerminate = (tenant: Tenant) => {
    const activeContract = contracts.find(c => c.tenant_id === tenant.id && c.status === 'active');
    
    if (!activeContract) {
        alert("No active contract found for this tenant.");
        return;
    }

    // Robust UTC date parsing from YYYY-MM-DD string
    const parseToUtcMidnight = (dateStr?: string) => {
        if (!dateStr) return null;
        // Split explicitly to avoid browser timezone interference
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const day = parseInt(parts[2]);
        return new Date(Date.UTC(year, month, day));
    };

    const startDate = parseToUtcMidnight(activeContract.start_date);
    const endDate = parseToUtcMidnight(activeContract.end_date);
    
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    if (!startDate || !endDate) {
        alert("Invalid contract dates. Cannot calculate settlement.");
        return;
    }

    // Calculate Difference in Days (Inclusive of start and end date)
    // Note: (End - Start) gives difference. Adding +1 makes it inclusive count.
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDurationDays = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
    
    // Cap termination date to end date (cannot serve more than contract)
    const effectiveTerminationDate = today > endDate ? endDate : today;
    const servedDurationDays = Math.round((effectiveTerminationDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    if (totalDurationDays <= 0) {
        alert("Invalid contract duration (End date is before or equal to Start date).");
        return;
    }

    let ratio = servedDurationDays / totalDurationDays;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;

    const rentDue = activeContract.total_rent * ratio;

    const tenantInvoices = invoices.filter(i => i.contract_id === activeContract.id);
    const totalRentPaid = tenantInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const deposit = activeContract.security_deposit || 0;
    
    const amountOwed = rentDue - totalRentPaid;

    setTerminationModal({
      isOpen: true,
      tenantId: tenant.id,
      data: {
        tenantName: tenant.name,
        contractValue: activeContract.total_rent,
        rentDue,
        totalPaid: totalRentPaid,
        outstanding: amountOwed,
        deposit,
        refund: deposit - amountOwed
      }
    });
  };

  const confirmTermination = (condition: string) => {
    if (terminationModal) {
      terminateMutation.mutate({ tenantId: terminationModal.tenantId, condition });
    }
  };
  
  const handleRestore = async (tenant: Tenant) => {
    const confirmed = await confirmAction({
        title: 'Restore Contract',
        message: `Are you sure you want to restore the contract for ${tenant.name}? This will set their status back to Active.`,
        variant: 'default',
        confirmText: 'Restore'
    });
    if (confirmed) {
      restoreMutation.mutate(tenant.id);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingTenant(null);
    setShowForm(true);
  };

  const handleRenew = (tenant: Tenant) => {
    const contract = contracts.find(c => c.tenant_id === tenant.id && (c.status === 'active' || c.status === 'expired'));
    if(contract) {
      setRenewingContract(contract);
    }
  };

  const handleGenerateContract = async (tenant: Tenant, contract: Contract) => {
    setGeneratingContract(true);
    
    try {
      const unit = units.find(u => u.id === contract.unit_id);
      const property = properties.find(p => p.id === unit?.property_id);
      
      const startDate = new Date(contract.start_date);
      const fullEndDate = new Date(contract.end_date);
      const frequency = contract.payment_frequency;

      let monthsToAdd = 12;
      let rentPeriodLabel = "1 Year";
      if (frequency === "3_months") {
          monthsToAdd = 3;
          rentPeriodLabel = "3 Months";
      } else if (frequency === "6_months") {
          monthsToAdd = 6;
          rentPeriodLabel = "6 Months";
      } else if (frequency === "monthly") {
          monthsToAdd = 1;
          rentPeriodLabel = "1 Month";
      }

      const displayEndDate = addHijriMonths(new Date(startDate), monthsToAdd);
      const totalContractMonths = Math.max(1, Math.round(((fullEndDate.getTime()) - (startDate.getTime())) / (1000 * 60 * 60 * 24 * 30.44)));
      const rentPerMonth = contract.total_rent / totalContractMonths;
      const periodRent = rentPerMonth * monthsToAdd;

      const tenantInvoices = invoices.filter(i => i.contract_id === contract.id);
      const totalPaid = tenantInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
      
      const advancePayment = contract.advance_payment || 0;
      const remainingBalance = contract.total_rent - totalPaid;

      const contractHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>Tenancy Contract</title>
          <style>
              body { 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #f8fafc;
                  -webkit-print-color-adjust: exact;
                  font-size: 12px;
                  color: #334155;
              }
              .page {
                  width: 210mm;
                  min-height: 297mm;
                  margin: auto;
                  background: white;
                  padding: 15mm 20mm;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
              }
              .header {
                  text-align: center;
                  border-bottom: 2px solid #e2e8f0;
                  padding-bottom: 10px;
                  margin-bottom: 15px;
              }
              .header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: 700;
                  color: #2563eb;
              }
              .main-content {
                  flex-grow: 1;
              }
              .column {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
              }
              .details-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 12px;
              }
              .section {
                  background-color: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 10px 12px;
              }
              .section h2 {
                  margin: 0 0 8px;
                  font-size: 15px;
                  font-weight: 600;
                  color: #2563eb;
                  border-bottom: 1px solid #d1d5db;
                  padding-bottom: 6px;
              }
              .detail-item {
                  display: flex;
                  justify-content: space-between;
                  align-items: baseline;
                  margin: 4px 0;
                  font-size: 12px;
                  gap: 8px;
              }
              .detail-item strong {
                  font-weight: 600;
                  color: #1e293b;
                  white-space: nowrap;
              }
              .detail-item span {
                  text-align: right;
              }
              .terms-list {
                  list-style-type: none;
                  padding: 0;
                  margin: 0;
              }
              .terms-list li {
                  padding: 4px 0;
                  font-size: 12px;
                  display: flex;
                  justify-content: space-between;
              }
              .terms-list li strong {
                  padding-right: 15px;
              }
              .clauses-list {
                  list-style-position: inside;
                  padding-left: 0;
                  margin: 12px 0 0 0;
                  font-size: 11px;
                  line-height: 1.5;
                  border-top: 1px solid #e2e8f0;
                  padding-top: 12px;
              }
              .clauses-list li {
                  margin-bottom: 4px;
              }
              .signatures {
                  margin-top: auto;
                  padding-top: 15px;
                  border-top: 1px solid #e2e8f0;
                  display: flex;
                  justify-content: space-around;
                  gap: 25px;
              }
              .sig-item {
                  font-size: 12px;
                  margin-top: 15px;
                  flex: 1;
              }
              .sig-item strong {
                  font-weight: 600;
              }
              .sig-line {
                  border-bottom: 1px solid #94a3b8;
                  margin-top: 20px;
                  margin-bottom: 6px;
              }
              @media print {
                  body { background-color: white; }
                  .page { box-shadow: none; margin: 0; border: none; }
              }
          </style>
      </head>
      <body>
          <div class="page">
              <div class="header"><h1>TENANCY CONTRACT</h1></div>
              <div class="main-content">
                <div class="column">
                  <div class="details-grid">
                      <div class="section">
                          <h2>Tenant Details</h2>
                          <div class="detail-item"><strong>Name of Tenant:</strong> <span>${tenant.name || ''}</span></div>
                          <div class="detail-item"><strong>Mobile #:</strong> <span>${tenant.phone || ''}</span></div>
                          <div class="detail-item"><strong>Iqama #:</strong> <span>${tenant.iqama_number || ''}</span></div>
                      </div>
                      <div class="section">
                          <h2>Property Details</h2>
                          <div class="detail-item"><strong>Property Name:</strong> <span>${property?.name || ''}</span></div>
                          <div class="detail-item"><strong>Location of Flat:</strong> <span>${property?.address || ''}</span></div>
                          <div class="detail-item"><strong>Flat #:</strong> <span>${unit?.unit_number || ''}</span></div>
                      </div>
                  </div>
                  <div class="section">
                      <h2>TERMS & CONDITIONS</h2>
                      <ul class="terms-list">
                          <li><strong>Starting date of flat rent:</strong> <span>Hijri: ${formatHijri(startDate)}<br/>Gregorian: ${format(startDate, 'dd/MM/yyyy')}</span></li>
                          <li><strong>Finishing date of rental contract:</strong> <span>Hijri: ${formatHijri(displayEndDate)}<br/>Gregorian: ${format(displayEndDate, 'dd/MM/yyyy')}</span></li>
                          <li><strong>Total flat rent for ${rentPeriodLabel}:</strong> <span>SAR ${periodRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                          <li><strong>Security Deposit:</strong> <span>SAR ${(contract.security_deposit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                          <li><strong>Advance payment:</strong> <span>SAR ${advancePayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                          <li><strong>Remaining balance:</strong> <span>SAR ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                          <li><strong>Total payment received from tenant:</strong> <span>SAR ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></li>
                          <li><strong>Electricity bill to be paid by the undersigned tenant.</strong></li>
                          <li><strong>Water bill to be paid by the undersigned tenant.</strong></li>
                          <li><strong>Electricity bill #:</strong> <span>${unit?.electricity_account || '____________________'}</span></li>
                      </ul>
                      <ol class="clauses-list">
                          <li>Rent paid in advance will not be refunded under any circumstances, even in cases of natural disasters, fire, or war.</li>
                          <li>Electricity bill must be paid within 5 days from the issue date. Failure to do so will result in power supply disconnection, and the tenant will be fully responsible.</li>
                          <li>Any water leakage in washrooms or kitchen must be reported immediately. If a heavy water bill is due to tenant negligence, the tenant will be responsible for paying it.</li>
                          <li>Tenant will be fully responsible for any damages to the property during the rental period and must bear the full cost of repairs.</li>
                          <li>Upon vacating the flat, the tenant must return it in the same condition as received, ensuring no damages, broken fixtures, or unpaid bills.</li>
                          <li>Tenant cannot sublet the property without prior written approval from the owner.</li>
                          <li>Tenant must provide a notice period of <strong>____ days/months</strong> before vacating the property.</li>
                          <li>In case of legal disputes, the matter will be resolved as per the laws of Saudi Arabia.</li>
                      </ol>
                  </div>
                </div>
              </div>
              <div class="signatures">
                  <div class="sig-item">
                      <strong>Tenant Name & Signature:</strong>
                      <div class="sig-line"></div>
                      <p>Date: ___ / ___ / ______</p>
                  </div>
                  <div class="sig-item">
                      <strong>Authorized Person Name & Signature:</strong>
                      <div class="sig-line"></div>
                      <p>Date: ___ / ___ / ______</p>
                      <p>Mobile #: ______________</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `;
      
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(contractHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      } else {
        alert("Please allow pop-ups to print the contract.");
      }
      
    } catch (error) {
      alert('Failed to generate contract. Please try again.');
      console.error(error);
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTenant(null);
  };

  const isLoading = loadingTenants || loadingContracts || loadingInvoices;

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteMutation.isPending || deleteSelectedMutation.isPending || terminateMutation.isPending || restoreMutation.isPending} />
      {renewingContract && (
        <RenewContractModal 
            contract={renewingContract} 
            onClose={() => setRenewingContract(null)}
            onSubmit={renewMutation.mutate}
            isProcessing={renewMutation.isPending}
        />
      )}
      {terminationModal && (
        <TerminationModal
            isOpen={terminationModal.isOpen}
            onClose={() => setTerminationModal(null)}
            onConfirm={confirmTermination}
            data={terminationModal.data}
            isProcessing={terminateMutation.isPending}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
            <p className="text-slate-600 mt-1">Manage tenants and their contracts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="cursor-pointer text-sm">Show Inactive Tenants</Label>
            </div>
            {selectedIds.length > 0 ? (
               <Button onClick={handleDeleteSelected} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" disabled={deleteSelectedMutation.isPending}>
                <Trash2 className="w-5 h-5 mr-2" /> Delete Selected ({selectedIds.length})
              </Button>
            ): null}
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" /> Add Tenant
            </Button>
          </div>
        </div>

        {showForm && (
          <TenantContractForm
            tenantToEdit={editingTenant}
            contracts={contracts}
            properties={properties}
            units={units}
            onClose={handleFormClose}
          />
        )}
        {generatingContract && (
          <Card className="shadow-lg border-blue-200 bg-blue-50">
            <CardContent className="py-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-900 font-medium">Generating contract...</span>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md border-none">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> All Tenants
              </CardTitle>
              <div className="w-full max-w-xs">
                <Input 
                  type="search"
                  placeholder="Search by name, Iqama, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TenantTable
              tenants={tenants}
              contracts={contracts}
              units={units}
              properties={properties}
              invoices={invoices}
              showInactive={showInactive}
              isLoading={isLoading}
              onDelete={handleDelete}
              onTerminate={handleTerminate}
              onEdit={handleEdit}
              onGenerateContract={handleGenerateContract}
              onRenew={handleRenew}
              onRestore={handleRestore}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              searchTerm={searchTerm}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
