
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { RiyalIcon, Trash2 } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { LeasePayment, Property } from "../../types";
import { DateDisplay } from "../ui/DateDisplay";

interface LeasePaymentTableProps {
  leasePayments: LeasePayment[];
  properties: Property[];
  isLoading: boolean;
  onPayment: (payment: LeasePayment) => void;
  onRecordPayment: () => void;
  onDelete: (payment: LeasePayment) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function LeasePaymentTable({ leasePayments, properties, isLoading, onPayment, onRecordPayment, onDelete, selectedIds, setSelectedIds }: LeasePaymentTableProps) {
  const getPropertyName = (propertyId: string) => properties.find(p => p.id === propertyId)?.name || 'Unknown';

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? leasePayments.map(p => p.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(pId => pId !== id));
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
  if (leasePayments.length === 0) return <div className="text-center py-12 text-slate-500"><p className="text-lg">No lease payment obligations yet</p><p className="text-sm mt-1">Obligations will be generated when leased properties are added</p></div>;

  return (
    <div className="space-y-4">
      <Button className="bg-blue-600 hover:bg-blue-700" onClick={onRecordPayment}>Record Owner Payment</Button>
      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={selectedIds.length === leasePayments.length && leasePayments.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all lease payments"
                    />
                </TableHead>
                <TableHead>Id</TableHead>
                <TableHead>Property Name</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leasePayments.map((payment, index) => {
              const balance = payment.amount - (payment.paid_amount || 0);
              return (
                <TableRow key={payment.id} className="hover:bg-slate-50">
                  <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(payment.id)}
                        onCheckedChange={(checked) => handleSelectOne(payment.id, !!checked)}
                        aria-label={`Select lease payment`}
                      />
                  </TableCell>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{getPropertyName(payment.property_id)}</TableCell>
                  <TableCell><DateDisplay dateString={payment.due_date} /></TableCell>
                  <TableCell className="font-semibold">SAR {payment.amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-green-600 font-medium">SAR {(payment.paid_amount || 0).toLocaleString()}</TableCell>
                  <TableCell className={balance > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}>SAR {balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusClass(payment.status)}>
                      {payment.status === 'unpaid' ? 'Due' : payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2">{payment.status !== 'paid' && <Button variant="ghost" size="sm" onClick={() => onPayment(payment)} className="text-blue-600"><RiyalIcon className="w-4 h-4 mr-1" />Pay</Button>}<Button variant="ghost" size="icon" onClick={() => onDelete(payment)}><Trash2 className="w-4 h-4 text-red-600" /></Button></div></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
