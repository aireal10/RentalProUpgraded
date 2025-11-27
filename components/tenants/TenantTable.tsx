
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Trash2, Ban, ExternalLink, Pencil, FileText, RefreshCw } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { Tenant, Contract, Unit, Property, Invoice } from "../../types";
import { DateDisplay } from "../ui/DateDisplay";
import { useSettings } from "../../context/SettingsContext";

interface TenantTableProps {
  tenants: Tenant[];
  contracts: Contract[];
  units: Unit[];
  properties: Property[];
  invoices: Invoice[];
  showInactive: boolean;
  isLoading: boolean;
  onDelete: (tenant: Tenant) => void;
  onTerminate: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onRenew: (tenant: Tenant) => void;
  onRestore: (tenant: Tenant) => void;
  onGenerateContract: (tenant: Tenant, contract: Contract) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  searchTerm: string;
}

export default function TenantTable({ tenants, contracts, units, properties, invoices, showInactive, isLoading, onDelete, onTerminate, onEdit, onRenew, onRestore, onGenerateContract, selectedIds, setSelectedIds, searchTerm }: TenantTableProps) {
  const { t } = useSettings();
  const getContractInfo = (tenantId: string) => contracts.find(c => c.tenant_id === tenantId);
  
  const filteredTenants = React.useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const activeStatusTenants = showInactive ? tenants : tenants.filter(t => {
      const contract = getContractInfo(t.id);
      return contract?.status === 'active';
    });

    if (!searchTerm) {
      return activeStatusTenants;
    }

    return activeStatusTenants.filter(t => 
      t.name.toLowerCase().includes(lowercasedSearch) ||
      t.iqama_number.toLowerCase().includes(lowercasedSearch) ||
      t.phone.toLowerCase().includes(lowercasedSearch)
    );

  }, [tenants, contracts, showInactive, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredTenants.map(t => t.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(tId => tId !== id));
  };

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (filteredTenants.length === 0) return <div className="text-center py-12 text-slate-500"><p className="text-lg">No tenants found</p><p className="text-sm mt-1">{searchTerm ? "Try a different search term." : (showInactive ? "Add your first tenant to get started" : "No active tenants to display")}</p></div>;

  return (
    <div className="rounded-lg border border-slate-200 overflow-x-auto">
      <Table>
        <TableHeader>
            <TableRow className="bg-slate-50">
                <TableHead className="w-[50px]">
                    <Checkbox 
                        checked={selectedIds.length === filteredTenants.length && filteredTenants.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all tenants"
                    />
                </TableHead>
                <TableHead className="whitespace-nowrap">#</TableHead>
                <TableHead className="whitespace-nowrap">{t('fullName')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('status')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('properties')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('units')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('totalRent')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('paid')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('balance')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('contractEnd')}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{t('actions')}</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTenants.map((tenant, index) => {
            const contract = getContractInfo(tenant.id);
            const unit = contract ? units.find(u => u.id === contract.unit_id) : null;
            const property = unit ? properties.find(p => p.id === unit.property_id) : null;
            const tenantInvoices = contract ? invoices.filter(i => i.contract_id === contract.id) : [];
            const totalPaid = tenantInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
            const balance = contract ? contract.total_rent - totalPaid : 0;
            const isActive = contract?.status === 'active';
            const isExpired = contract?.status === 'expired';
            const isTerminated = contract?.status === 'terminated';
            const isRenewable = isActive || isExpired;
            
            return (
              <TableRow key={tenant.id} className="hover:bg-slate-50">
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(tenant.id)}
                    onCheckedChange={(checked) => handleSelectOne(tenant.id, !!checked)}
                    aria-label={`Select tenant ${tenant.name}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{index + 1}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{tenant.name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className={isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                    {contract?.status ? t(contract.status) : t('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{property?.name || 'N/A'}</TableCell>
                <TableCell className="whitespace-nowrap">{unit ? `Unit ${unit.unit_number}`: 'N/A'}</TableCell>
                <TableCell className="whitespace-nowrap">SAR {contract?.total_rent.toLocaleString() || '0'}</TableCell>
                <TableCell className="text-green-600 whitespace-nowrap">SAR {totalPaid.toLocaleString()}</TableCell>
                <TableCell className={(balance > 0 ? 'text-red-600' : '') + ' whitespace-nowrap'}>SAR {balance.toLocaleString()}</TableCell>
                <TableCell className="whitespace-nowrap">
                    <DateDisplay dateString={contract?.end_date} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap items-center">
                    {tenant.id_copy_url && (
                        <Button variant="ghost" size="icon" title={t('idCopy')} onClick={() => window.open(tenant.id_copy_url, '_blank')}>
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                        </Button>
                    )}
                    {contract && (
                      <Button variant="ghost" size="icon" onClick={() => onGenerateContract(tenant, contract)} className="text-green-600" title={t('makeContract')}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                     {isRenewable && (
                      <Button variant="ghost" size="icon" onClick={() => onRenew(tenant)} className="text-teal-600" title={t('renewContract')}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    {isTerminated && (
                      <Button variant="ghost" size="icon" onClick={() => onRestore(tenant)} className="text-green-600" title={t('restoreContract')}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(tenant)} title={t('edit')}>
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                    {isActive && (
                      <Button variant="ghost" size="icon" onClick={() => onTerminate(tenant)} className="text-orange-600" title={t('terminate')}>
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onDelete(tenant)} title={t('delete')}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
