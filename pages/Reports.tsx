
import React, { useState, useMemo } from "react";
import { useQuery } from "../hooks/useApi";
import { base44 } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { TrendingUp, DollarSign, TrendingDown, Sparkles, Building2, Calculator, AlertCircle } from "../components/Icons";
import { Skeleton } from "../components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Invoice, Expense, Property, Unit, Contract } from "../types";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string; }) => (
  <Card className="relative overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
    <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-10 rounded-full -mr-16 -mt-16`} />
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className={`p-2.5 ${color} bg-opacity-10 rounded-lg`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-slate-900 whitespace-nowrap">{value}</div>
    </CardContent>
  </Card>
);

export default function Reports() {
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });
  
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const isLoading = loadingInvoices || loadingExpenses || loadingProperties;

  const filteredData = useMemo(() => {
    const targetProperties = selectedProperty === 'all'
        ? properties
        : properties.filter(p => p.id === selectedProperty);
    const targetPropertyIds = targetProperties.map(p => p.id);

    const filteredExpenses = expenses.filter(expense => {
        const isPropertyMatch = targetPropertyIds.includes(expense.property_id);
        const fromMatch = !dateFrom || expense.date >= dateFrom;
        const toMatch = !dateTo || expense.date <= dateTo;
        return isPropertyMatch && fromMatch && toMatch;
    });

    const propertyUnitIds = units.filter(u => targetPropertyIds.includes(u.property_id)).map(u => u.id);
    const propertyContractIds = contracts.filter(c => propertyUnitIds.includes(c.unit_id)).map(c => c.id);

    const filteredInvoices = invoices.filter(invoice => {
        const isPropertyMatch = propertyContractIds.includes(invoice.contract_id);
        const fromMatch = !dateFrom || invoice.due_date >= dateFrom;
        const toMatch = !dateTo || invoice.due_date <= dateTo;
        return isPropertyMatch && fromMatch && toMatch;
    });

    return { filteredExpenses, filteredInvoices, targetProperties };
  }, [selectedProperty, dateFrom, dateTo, properties, units, contracts, invoices, expenses]);

  const totalIncome = useMemo(() => filteredData.filteredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0), [filteredData.filteredInvoices]);
  const totalExpenses = useMemo(() => filteredData.filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0), [filteredData.filteredExpenses]);
  const totalInvestment = useMemo(() => filteredData.targetProperties.reduce((sum, prop) => sum + (prop.total_investment || 0), 0), [filteredData.targetProperties]);
  const netProfit = totalIncome - totalExpenses;

  const rentVarianceData = useMemo(() => {
      if (selectedProperty === 'all' && properties.length > 0) {
          // Global view: variance by property
          return properties.map(prop => {
             const propUnits = units.filter(u => u.property_id === prop.id);
             const propContracts = contracts.filter(c => propUnits.some(u => u.id === c.unit_id) && c.status === 'active');
             
             const projectedTotal = propUnits.reduce((sum, u) => sum + u.rent_amount, 0);
             
             // Calculate actual monthly rent from active contracts
             const actualTotal = propContracts.reduce((sum, c) => {
                 // Normalize to yearly then monthly? Let's stick to yearly for simplicity of 'Projected vs Actual'
                 let yearlyRent = c.total_rent;
                 // Adjust if total_rent is for a shorter period? 
                 // Assuming total_rent is the contract value. We need annualized value for comparison if units have annual rent.
                 // Better: Assume Unit.rent_amount is MARKET RATE (Yearly).
                 // And we normalize Contract Rent to Yearly.
                 
                 const startDate = new Date(c.start_date);
                 const endDate = new Date(c.end_date);
                 const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                 const yearlyMultiplier = 365 / diffDays;
                 
                 return sum + (c.total_rent * yearlyMultiplier);
             }, 0);

             return {
                 name: prop.name,
                 Projected: projectedTotal,
                 Actual: actualTotal,
                 Variance: actualTotal - projectedTotal
             };
          });
      } else {
          // Single property view: variance by unit
          const propUnits = units.filter(u => u.property_id === selectedProperty);
          return propUnits.map(u => {
              const activeContract = contracts.find(c => c.unit_id === u.id && c.status === 'active');
              let actual = 0;
              if (activeContract) {
                 const startDate = new Date(activeContract.start_date);
                 const endDate = new Date(activeContract.end_date);
                 const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                 const yearlyMultiplier = 365 / diffDays;
                 actual = activeContract.total_rent * yearlyMultiplier;
              }
              
              return {
                  name: u.unit_number,
                  Projected: u.rent_amount,
                  Actual: actual,
                  Variance: actual - u.rent_amount
              };
          }).filter(x => x.Projected > 0 || x.Actual > 0); // Filter out empty/unset units
      }
  }, [selectedProperty, properties, units, contracts]);

  const breakevenInfo = useMemo(() => {
    const targetPropertyIds = selectedProperty === 'all'
        ? properties.map(p => p.id)
        : [selectedProperty];

    const allTimeInvestment = (selectedProperty === 'all' ? properties : properties.filter(p => p.id === selectedProperty))
        .reduce((sum, prop) => sum + (prop.total_investment || 0), 0);

    if (allTimeInvestment <= 0) {
        return { value: "N/A", color: "bg-purple-500", title: "Breakeven Point" };
    }

    const allExpensesForSelected = expenses.filter(expense => targetPropertyIds.includes(expense.property_id));
    const propertyUnitIds = units.filter(u => targetPropertyIds.includes(u.property_id)).map(u => u.id);
    const propertyContractIds = contracts.filter(c => propertyUnitIds.includes(c.unit_id)).map(c => c.id);
    const allInvoicesForSelected = invoices.filter(invoice => propertyContractIds.includes(invoice.contract_id));
    
    const totalIncomeAllTime = allInvoicesForSelected.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalExpensesAllTime = allExpensesForSelected.reduce((sum, exp) => sum + exp.amount, 0);
    const totalProfitAllTime = totalIncomeAllTime - totalExpensesAllTime;

    const remainingToBreakeven = allTimeInvestment - totalProfitAllTime;

    if (remainingToBreakeven <= 0) {
      return { 
          value: `+ SAR ${Math.abs(remainingToBreakeven).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          color: "bg-emerald-500",
          title: "Profit (Post-Breakeven)"
      };
    }

    return {
        value: `SAR ${remainingToBreakeven.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        color: "bg-purple-500",
        title: "Breakeven Point"
    };
  }, [selectedProperty, properties, units, contracts, invoices, expenses]);


  const propertyFinancials = useMemo(() => {
    const propertyMap = new Map<string, { name: string, income: number, expenses: number }>();
    
    filteredData.targetProperties.forEach(p => {
        propertyMap.set(p.id, { name: p.name, income: 0, expenses: 0 });
    });

    filteredData.filteredInvoices.forEach(invoice => {
        const contract = contracts.find(c => c.id === invoice.contract_id);
        if (!contract) return;
        const unit = units.find(u => u.id === contract.unit_id);
        if (!unit || !propertyMap.has(unit.property_id)) return;
        const property = propertyMap.get(unit.property_id)!;
        property.income += (invoice.paid_amount || 0);
    });

    filteredData.filteredExpenses.forEach(expense => {
        if (!propertyMap.has(expense.property_id)) return;
        const property = propertyMap.get(expense.property_id)!;
        property.expenses += expense.amount;
    });

    return Array.from(propertyMap.values());
  }, [filteredData, contracts, units]);
  
  const expensesByCategory = useMemo(() => {
    return filteredData.filteredExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [filteredData.filteredExpenses]);

  const categoryData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

  const profitabilityInsights = useMemo(() => {
    if (properties.length < 1) return null;

    const analysis = properties.map(property => {
        const investment = property.total_investment;
        if (investment <= 0) return { name: property.name, roi: -Infinity };

        const propertyUnitIds = units.filter(u => u.property_id === property.id).map(u => u.id);
        const propertyContractIds = contracts.filter(c => propertyUnitIds.includes(c.unit_id)).map(c => c.id);
        
        const income = invoices.filter(inv => {
             const isPropertyMatch = propertyContractIds.includes(inv.contract_id);
             const fromMatch = !dateFrom || inv.due_date >= dateFrom;
             const toMatch = !dateTo || inv.due_date <= dateTo;
             return isPropertyMatch && fromMatch && toMatch;
        }).reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
        
        const expenseTotal = expenses.filter(exp => {
            const isPropertyMatch = exp.property_id === property.id;
            const fromMatch = !dateFrom || exp.date >= dateFrom;
            const toMatch = !dateTo || exp.date <= dateTo;
            return isPropertyMatch && fromMatch && toMatch;
        }).reduce((sum, exp) => sum + exp.amount, 0);

        const netProfit = income - expenseTotal;
        const roi = (netProfit / investment) * 100;

        return { name: property.name, roi };
    }).filter(p => isFinite(p.roi));

    if (analysis.length < 1) return null;
    const topPerformer = analysis.reduce((max, p) => p.roi > max.roi ? p : max, analysis[0]);
    const needsAttention = analysis.reduce((min, p) => p.roi < min.roi ? p : min, analysis[0]);
    
    if (analysis.length === 1) return { topPerformer, needsAttention: null };

    return { topPerformer, needsAttention };
  }, [dateFrom, dateTo, properties, units, contracts, invoices, expenses]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-600 mt-1">Comprehensive income and expense analytics</p>
        </div>

        <Card className="shadow-md border-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
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
              <div className="flex items-end pt-5">
                <Button variant="outline" onClick={() => { setSelectedProperty('all'); setDateFrom(''); setDateTo(''); }}>Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {isLoading ? Array(5).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          )) : (
            <>
              <StatCard title="Total Investment" value={`SAR ${totalInvestment.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Building2} color="bg-blue-500" />
              <StatCard title="Total Income" value={`SAR ${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="bg-green-500" />
              <StatCard title="Total Expenses" value={`SAR ${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={TrendingDown} color="bg-red-500" />
              <StatCard title="Net Profit" value={`SAR ${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={DollarSign} color={netProfit >= 0 ? "bg-emerald-500" : "bg-red-500"} />
              <StatCard title={breakevenInfo.title} value={breakevenInfo.value} icon={Calculator} color={breakevenInfo.color} />
            </>
          )}
        </div>

        <Card className="shadow-md border-none bg-gradient-to-br from-blue-50 to-indigo-100">
            <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 bg-white/70 rounded-lg"><Sparkles className="w-6 h-6 text-blue-600"/></div>
                <CardTitle className="text-xl font-semibold text-slate-900">Profitability Insights</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-24 w-full"/> : profitabilityInsights ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white/50 p-4 rounded-lg">
                           <h4 className="font-semibold text-green-700">Top Performer</h4>
                           <p className="text-2xl font-bold text-slate-800">{profitabilityInsights.topPerformer.name}</p>
                           <p className="text-sm text-slate-600">Highest return on investment in this period at <span className="font-bold text-green-600">{profitabilityInsights.topPerformer.roi.toFixed(2)}% ROI</span>.</p>
                        </div>
                        {profitabilityInsights.needsAttention && profitabilityInsights.topPerformer.name !== profitabilityInsights.needsAttention.name ? (
                           <div className="bg-white/50 p-4 rounded-lg">
                               <h4 className="font-semibold text-red-700">Needs Attention</h4>
                               <p className="text-2xl font-bold text-slate-800">{profitabilityInsights.needsAttention.name}</p>
                               <p className="text-sm text-slate-600">Lowest return on investment in this period at <span className="font-bold text-red-600">{profitabilityInsights.needsAttention.roi.toFixed(2)}% ROI</span>.</p>
                           </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-center p-8 text-slate-500 bg-white/50 rounded-lg">
                        <p>Not enough data for insights.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="shadow-md border-none lg:col-span-3">
            <CardHeader>
              <CardTitle>Income vs Expenses by Property</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-80 w-full" /> : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={propertyFinancials} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value: number) => `SAR ${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md border-none lg:col-span-2">
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
               {isLoading ? <Skeleton className="h-80 w-full" /> : categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `SAR ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                 <div className="h-80 flex items-center justify-center text-slate-500">
                    <p>No expense data for this period.</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projected vs Actual Variance Report */}
        <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500"/>
                  Projected vs Actual Rent (Annualized)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-80 w-full" /> : rentVarianceData && rentVarianceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={rentVarianceData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value: number) => `SAR ${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="Projected" fill="#94a3b8" name="Projected (Market)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#3b82f6" name="Actual (Contract)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                  <div className="h-80 flex items-center justify-center text-slate-500">
                    <p>No data available for variance analysis.</p>
                 </div>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
