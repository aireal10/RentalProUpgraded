
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Pencil, Trash2, ExternalLink } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { Property, Unit, Contract, Invoice, LeasePayment } from "../../types";
import { DateDisplay } from "../ui/DateDisplay";
import { addHijriMonths } from "../../utils/helpers";
import { useSettings } from "../../context/SettingsContext";

interface PropertyTableProps {
  properties: Property[];
  units: Unit[];
  contracts: Contract[];
  invoices: Invoice[];
  leasePayments: LeasePayment[];
  isLoading: boolean;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function PropertyTable({ properties, units, contracts, invoices, leasePayments, isLoading, onEdit, onDelete, selectedIds, setSelectedIds }: PropertyTableProps) {
  const { t } = useSettings();

  const getNextDueDateForProperty = React.useCallback((property: Property): string | null => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (property.is_leased) {
        const dueLeasePayments = leasePayments
            .filter(lp => lp.property_id === property.id && lp.status !== 'paid' && new Date(lp.due_date) >= today)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        
        return dueLeasePayments.length > 0 ? dueLeasePayments[0].due_date : null;
    }

    const propertyUnits = units.filter(u => u.property_id === property.id);
    if (!propertyUnits.length) return null;
    const propertyUnitIds = propertyUnits.map(u => u.id);

    const activeContracts = contracts.filter(c => propertyUnitIds.includes(c.unit_id) && c.status === 'active');
    if (!activeContracts.length) return null;
    const activeContractIds = activeContracts.map(c => c.id);

    const dueInvoices = invoices.filter(i => activeContractIds.includes(i.contract_id) && (i.status === 'unpaid' || i.status === 'partial'));

    if (dueInvoices.length > 0) {
        dueInvoices.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        return dueInvoices[0].due_date;
    }

    let potentialNextDueDates: Date[] = [];
    for (const contract of activeContracts) {
        const contractInvoices = invoices.filter(i => i.contract_id === contract.id).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
        
        if (contractInvoices.length > 0) {
            const lastDueDate = new Date(`${contractInvoices[0].due_date}T00:00:00Z`);
            const contractEndDate = new Date(`${contract.end_date}T00:00:00Z`);
            
            let monthsToAdd = 0;
            switch(contract.payment_frequency) {
                case 'monthly': monthsToAdd = 1; break;
                case '3_months': monthsToAdd = 3; break;
                case '6_months': monthsToAdd = 6; break;
                case 'yearly': monthsToAdd = 12; break;
            }

            if (monthsToAdd > 0) {
                const nextDueDate = addHijriMonths(lastDueDate, monthsToAdd);
                if (nextDueDate <= contractEndDate) {
                    potentialNextDueDates.push(nextDueDate);
                }
            }
        }
    }
    
    if (potentialNextDueDates.length > 0) {
        potentialNextDueDates.sort((a, b) => a.getTime() - b.getTime());
        return potentialNextDueDates[0].toISOString().split('T')[0];
    }

    activeContracts.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    return activeContracts[0].end_date;
  }, [units, contracts, invoices, leasePayments]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? properties.map(p => p.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(pId => pId !== id));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg">No properties found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={selectedIds.length === properties.length && properties.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Select all properties"
              />
            </TableHead>
            <TableHead>{t('propertyName')}</TableHead>
            <TableHead>{t('address')}</TableHead>
            <TableHead>{t('investment')}</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('ownerRent')}</TableHead>
            <TableHead>{t('rentDue')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => {
            const nextDueDate = getNextDueDateForProperty(property);
            return (
              <TableRow key={property.id} className="hover:bg-slate-50">
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(property.id)}
                    onCheckedChange={(checked) => handleSelectOne(property.id, !!checked)}
                    aria-label={`Select property ${property.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div>{property.name}</div>
                </TableCell>
                <TableCell>{property.address}</TableCell>
                <TableCell>SAR {property.total_investment?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={property.is_leased ? "bg-orange-100 text-orange-800 border-orange-200" : "bg-green-100 text-green-800 border-green-200"}>
                    {property.is_leased ? t('leased') : t('owned')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {property.is_leased && property.owner_rent_amount 
                    ? `SAR ${property.owner_rent_amount.toLocaleString()}` 
                    : '-'}
                </TableCell>
                <TableCell>
                  {nextDueDate ? <DateDisplay dateString={nextDueDate} /> : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {property.lease_invoice_url && (
                        <Button variant="ghost" size="icon" title="View Lease Invoice" onClick={() => window.open(property.lease_invoice_url, '_blank')}>
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(property)} title={t('edit')}>
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(property)} title={t('delete')}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
}