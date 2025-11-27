
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { RiyalIcon, Trash2, Printer } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { Invoice, Contract, Tenant, Unit, Property } from "../../types";
import { DateDisplay } from "../ui/DateDisplay";

interface InvoiceTableProps {
  invoices: Invoice[];
  contracts: Contract[];
  tenants: Tenant[];
  units: Unit[];
  properties: Property[];
  isLoading: boolean;
  onPayment: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onPrintReceipt: (invoice: Invoice) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function InvoiceTable({ invoices, contracts, tenants, units, properties, isLoading, onPayment, onDelete, onPrintReceipt, selectedIds, setSelectedIds }: InvoiceTableProps) {
  const getTenantName = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract ? tenants.find(t => t.id === contract.tenant_id)?.name || 'N/A' : 'N/A';
  };
  const getUnitInfo = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    const unit = contract ? units.find(u => u.id === contract.unit_id) : undefined;
    return unit ? `Unit ${unit.unit_number}` : 'N/A';
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? invoices.map(i => i.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(iId => iId !== id));
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };


  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (invoices.length === 0) return <div className="text-center py-12 text-slate-500"><p className="text-lg">No invoices yet</p><p className="text-sm mt-1">Invoices will be generated when tenants are added</p></div>;

  return (
    <div className="rounded-lg border border-slate-200 overflow-x-auto">
      <Table>
        <TableHeader>
            <TableRow className="bg-slate-50">
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={selectedIds.length === invoices.length && invoices.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all invoices"
                    />
                </TableHead>
                <TableHead>Id</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice, index) => {
            const balance = invoice.amount - (invoice.paid_amount || 0);
            return (
              <TableRow key={invoice.id} className="hover:bg-slate-50">
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(invoice.id)}
                    onCheckedChange={(checked) => handleSelectOne(invoice.id, !!checked)}
                    aria-label={`Select invoice`}
                  />
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{getTenantName(invoice.contract_id)}</TableCell>
                <TableCell>{getUnitInfo(invoice.contract_id)}</TableCell>
                <TableCell><DateDisplay dateString={invoice.due_date} /></TableCell>
                <TableCell className="font-semibold">SAR {invoice.amount?.toLocaleString()}</TableCell>
                <TableCell className="text-green-600 font-medium">SAR {(invoice.paid_amount || 0).toLocaleString()}</TableCell>
                <TableCell className={balance > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}>SAR {balance.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusClass(invoice.status)}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1">{invoice.paid_amount > 0 && <Button variant="ghost" size="icon" onClick={() => onPrintReceipt(invoice)} title="Print Receipt"><Printer className="w-4 h-4 text-gray-600" /></Button>}{invoice.status !== 'paid' && <Button variant="ghost" size="sm" onClick={() => onPayment(invoice)} className="text-blue-600"><RiyalIcon className="w-4 h-4 mr-1" />Pay</Button>}<Button variant="ghost" size="icon" onClick={() => onDelete(invoice)}><Trash2 className="w-4 h-4 text-red-600" /></Button></div></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
