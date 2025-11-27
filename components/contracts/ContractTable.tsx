
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Trash2, ExternalLink } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { Contract, Tenant, Unit, Property } from "../../types";
import { DateDisplay } from "../ui/DateDisplay";

interface ContractTableProps {
  contracts: Contract[];
  tenants: Tenant[];
  units: Unit[];
  properties: Property[];
  isLoading: boolean;
  onDelete: (contract: Contract) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function ContractTable({ contracts, tenants, units, properties, isLoading, onDelete, selectedIds, setSelectedIds }: ContractTableProps) {
  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || 'Unknown';
  const getUnitInfo = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return 'Unknown';
    const property = properties.find(p => p.id === unit.property_id);
    return `${property?.name || 'Unknown'} - Unit ${unit.unit_number}`;
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? contracts.map(c => c.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(cId => cId !== id));
  };


  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (contracts.length === 0) return <div className="text-center py-12 text-slate-500"><p className="text-lg">No contracts found</p><p className="text-sm mt-1">Try adjusting your search</p></div>;

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'terminated': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
            <TableRow className="bg-slate-50">
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={selectedIds.length === contracts.length && contracts.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all contracts"
                    />
                </TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total Rent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id} className="hover:bg-slate-50">
              <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(contract.id)}
                    onCheckedChange={(checked) => handleSelectOne(contract.id, !!checked)}
                    aria-label={`Select contract for tenant ${getTenantName(contract.tenant_id)}`}
                  />
              </TableCell>
              <TableCell className="font-medium">{getTenantName(contract.tenant_id)}</TableCell>
              <TableCell>{getUnitInfo(contract.unit_id)}</TableCell>
              <TableCell className="text-sm">
                 <div className="flex flex-col gap-1">
                    <div><strong>From:</strong> <DateDisplay dateString={contract.start_date} /></div>
                    <div><strong>To:</strong> <DateDisplay dateString={contract.end_date} /></div>
                </div>
              </TableCell>
              <TableCell>SAR {contract.total_rent?.toLocaleString()}</TableCell>
              <TableCell className="font-medium text-slate-600">{contract.security_deposit ? `SAR ${contract.security_deposit.toLocaleString()}` : '-'}</TableCell>
              <TableCell className="capitalize">{contract.payment_frequency?.replace('_', ' ')}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusClass(contract.status)}>
                  {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {contract.contract_url && <a href={contract.contract_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="text-blue-600"><ExternalLink className="w-3 h-3 mr-1" />Contract</Button></a>}
                </div>
              </TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => onDelete(contract)}><Trash2 className="w-4 h-4 text-red-600" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
