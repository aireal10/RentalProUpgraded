
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Pencil, Trash2 } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { Expense, Property, Unit } from "../../types";
import { DateDisplay } from "../ui/DateDisplay";

const CATEGORY_COLORS: Record<string, string> = {
  "Maintenance": "bg-blue-100 text-blue-800 border-blue-200", "Utilities": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Insurance": "bg-purple-100 text-purple-800 border-purple-200", "Taxes": "bg-red-100 text-red-800 border-red-200",
  "Management Fee": "bg-green-100 text-green-800 border-green-200", "Repairs": "bg-orange-100 text-orange-800 border-orange-200",
  "Cleaning": "bg-cyan-100 text-cyan-800 border-cyan-200", "Marketing": "bg-pink-100 text-pink-800 border-pink-200",
  "Legal": "bg-indigo-100 text-indigo-800 border-indigo-200", "Other": "bg-slate-100 text-slate-800 border-slate-200",
};

interface ExpenseTableProps {
  expenses: Expense[];
  properties: Property[];
  units: Unit[];
  isLoading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function ExpenseTable({ expenses, properties, units, isLoading, onEdit, onDelete, selectedIds, setSelectedIds }: ExpenseTableProps) {
  const getPropertyName = (propertyId: string) => properties.find(p => p.id === propertyId)?.name || 'Unknown';
  const getUnitName = (unitId?: string) => {
    if(!unitId) return null;
    const unit = units.find(u => u.id === unitId);
    return unit ? `Unit ${unit.unit_number}` : 'Unknown Unit';
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? expenses.map(e => e.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(eId => eId !== id));
  };


  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (expenses.length === 0) return <div className="text-center py-12 text-slate-500"><p className="text-lg">No expenses yet</p><p className="text-sm mt-1">Add your first expense to get started</p></div>;

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
            <TableRow className="bg-slate-50">
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={selectedIds.length === expenses.length && expenses.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all expenses"
                    />
                </TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const unitName = getUnitName(expense.unit_id);
            return (
            <TableRow key={expense.id} className="hover:bg-slate-50">
              <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(expense.id)}
                    onCheckedChange={(checked) => handleSelectOne(expense.id, !!checked)}
                    aria-label={`Select expense`}
                  />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{getPropertyName(expense.property_id)}</span>
                    {unitName && <span className="text-xs text-slate-500">{unitName}</span>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={CATEGORY_COLORS[expense.category]}>{expense.category}</Badge>
                {expense.deduct_from_deposit && <Badge variant="outline" className="ml-2 bg-red-50 text-red-600 border-red-100 text-[10px]">Deduct Deposit</Badge>}
              </TableCell>
              <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
              <TableCell className="font-semibold text-red-600">SAR {expense.amount?.toLocaleString()}</TableCell>
              <TableCell><DateDisplay dateString={expense.date} /></TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => onEdit(expense)}><Pencil className="w-4 h-4 text-blue-600" /></Button><Button variant="ghost" size="icon" onClick={() => onDelete(expense)}><Trash2 className="w-4 h-4 text-red-600" /></Button></div></TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
