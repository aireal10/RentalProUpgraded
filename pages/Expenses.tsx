
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Plus, Trash2, RiyalIcon } from "../components/Icons";
import ExpenseForm from "../components/expenses/ExpenseForm";
import ExpenseTable from "../components/expenses/ExpenseTable";
import { Expense, Property, Unit } from "../types";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Expenses() {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const filteredExpenses = useMemo(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    return expenses.filter(expense => {
      const propertyMatch = selectedProperty === 'all' || expense.property_id === selectedProperty;
      const fromMatch = !dateFrom || expense.date >= dateFrom;
      const toMatch = !dateTo || expense.date <= dateTo;
      
      const propertyName = properties.find(p => p.id === expense.property_id)?.name || '';
      const searchMatch = !searchTerm || 
        expense.description.toLowerCase().includes(lowercasedSearch) ||
        expense.category.toLowerCase().includes(lowercasedSearch) ||
        propertyName.toLowerCase().includes(lowercasedSearch);

      return propertyMatch && fromMatch && toMatch && searchMatch;
    });
  }, [expenses, selectedProperty, dateFrom, dateTo, searchTerm, properties]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await base44.entities.Expense.delete(id);
      }
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['expenses']);
    },
  });

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = async (expense: Expense) => {
    const confirmed = await confirmDelete({
        title: 'Delete Expense',
        message: 'Are you sure you want to delete this expense?',
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteMutation.mutate(expense.id);
    }
  };

  const handleDeleteSelected = async () => {
    const confirmed = await confirmDelete({
        title: `Delete ${selectedIds.length} Expenses`,
        message: `Are you sure you want to delete the ${selectedIds.length} selected expenses? This action cannot be undone.`,
        variant: 'destructive',
        confirmText: 'Delete'
    });
    if (confirmed) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const handleClearFilters = () => {
    setSelectedProperty('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteMutation.isPending || deleteSelectedMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
            <p className="text-slate-600 mt-1">Track property-related expenses</p>
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
              Add Expense
            </Button>
          </div>
        </div>

        {showForm && (
          <ExpenseForm
            expense={editingExpense}
            properties={properties}
            units={units}
            onClose={handleFormClose}
          />
        )}

        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-slate-50 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-grow">
                <Input 
                  type="search" 
                  placeholder="Search description, category, property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full max-w-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="property-filter" className="text-xs font-semibold text-slate-600">FILTER BY BUILDING</Label>
                <Select id="property-filter" value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="w-full md:w-48 bg-white">
                  <option value="all">All Buildings</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-from" className="text-xs font-semibold text-slate-600">FROM DATE</Label>
                <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full md:w-40 bg-white" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-to" className="text-xs font-semibold text-slate-600">TO DATE</Label>
                <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full md:w-40 bg-white" />
              </div>
              <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
            </div>
          </CardHeader>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiyalIcon className="w-5 h-5"/>
              All Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseTable
              expenses={filteredExpenses}
              properties={properties}
              units={units}
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
