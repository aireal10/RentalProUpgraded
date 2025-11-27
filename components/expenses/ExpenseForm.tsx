
import React, { useState } from "react";
import { useMutation, useQueryClient } from "../../hooks/useApi";
import { base44 } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { X, Save } from "../Icons";
import { Expense, Property, Unit } from "../../types";
import { DatePickerWithHijri } from "../ui/DatePickerWithHijri";

const EXPENSE_CATEGORIES = ["Maintenance", "Utilities", "Insurance", "Taxes", "Management Fee", "Repairs", "Cleaning", "Marketing", "Legal", "Other"];

interface ExpenseFormProps {
  expense: Expense | null;
  properties: Property[];
  units: Unit[];
  onClose: () => void;
}

export default function ExpenseForm({ expense, properties, units, onClose }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    property_id: expense?.property_id || "",
    unit_id: expense?.unit_id || "",
    category: expense?.category || "Maintenance",
    description: expense?.description || "",
    amount: expense?.amount || 0,
    deduct_from_deposit: expense?.deduct_from_deposit || false,
    date: expense?.date || new Date().toISOString().split('T')[0],
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (expense) return base44.entities.Expense.update(expense.id, data);
      return base44.entities.Expense.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };
  
  const filteredUnits = units.filter(u => u.property_id === formData.property_id);

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-slate-50 border-b"><div className="flex justify-between items-center"><CardTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</CardTitle><Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button></div></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="property_id">Property *</Label><Select value={formData.property_id} onChange={(e) => setFormData({ ...formData, property_id: e.target.value, unit_id: "" })} required><option value="" disabled>Select property</option>{properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</Select></div>
            <div className="space-y-2"><Label htmlFor="unit_id">Unit (Optional)</Label><Select value={formData.unit_id} onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })} disabled={!formData.property_id}><option value="">None / General</option>{filteredUnits.map((u) => (<option key={u.id} value={u.id}>Unit {u.unit_number}</option>))}</Select></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="category">Category *</Label><Select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}>{EXPENSE_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}</Select></div>
            <div className="space-y-2">
                <DatePickerWithHijri 
                    label="Date *" 
                    id="date" 
                    value={formData.date} 
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                    required 
                />
            </div>
          </div>
          <div className="space-y-2"><Label htmlFor="description">Description *</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the expense" rows={3} required/></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="amount">Amount (SAR) *</Label><Input id="amount" type="number" min="0" step="0.01" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} required/></div>
            <div className="flex items-center space-x-2 pt-8">
                <Checkbox id="deduct_from_deposit" checked={formData.deduct_from_deposit} onCheckedChange={(c) => setFormData({...formData, deduct_from_deposit: !!c})} />
                <Label htmlFor="deduct_from_deposit" className="cursor-pointer text-sm text-slate-700">Deduct from Security Deposit?</Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}><Save className="w-4 h-4 mr-2" />{saveMutation.isPending ? 'Saving...' : 'Save Expense'}</Button></CardFooter>
      </form>
    </Card>
  );
}
