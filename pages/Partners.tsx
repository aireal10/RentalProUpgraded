
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "../hooks/useApi";
import { useConfirmation } from "../hooks/useConfirmation";
import { base44 } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Plus, Trash2, Briefcase, Pencil, AlertCircle, Printer } from "../components/Icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import PartnerForm from "../components/partners/PartnerForm";
import { Partner, Invoice, Expense, Property, Unit, Contract } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { format } from "../utils/helpers";

const printHTML = (htmlContent: string, title: string) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(`<html><head><title>${title}</title><style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
            th { background-color: #f8fafc; }
            h1, h2, h3 { color: #1e293b; }
            .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #cbd5e1; padding-bottom: 1rem; }
            .summary-card { background-color: #f1f5f9; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; }
            .total { font-weight: bold; }
        </style></head><body>${htmlContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    }
};

export default function Partners() {
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryClient = useQueryClient();
  const { prompt: confirmDelete, ConfirmationModal } = useConfirmation();

  const { data: partners = [] } = useQuery<Partner[]>({ queryKey: ['partners'], queryFn: () => base44.entities.Partner.list() });
  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ['properties'], queryFn: () => base44.entities.Property.list() });
  const { data: units = [] } = useQuery<Unit[]>({ queryKey: ['units'], queryFn: () => base44.entities.Unit.list() });
  const { data: contracts = [] } = useQuery<Contract[]>({ queryKey: ['contracts'], queryFn: () => base44.entities.Contract.list() });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  
  const isLoading = !partners || !properties || !invoices || !expenses || !units || !contracts;

  const { propertyProfits, totalNetProfit } = useMemo(() => {
    const profits = new Map<string, number>();
    properties.forEach(p => profits.set(p.id, 0));

    const propertyUnitIds = new Map<string, string[]>();
    properties.forEach(p => propertyUnitIds.set(p.id, units.filter(u => u.property_id === p.id).map(u => u.id)));
    
    const unitPropertyMap = new Map<string, string>();
    units.forEach(u => unitPropertyMap.set(u.id, u.property_id));
    
    const contractUnitMap = new Map<string, string>();
    contracts.forEach(c => contractUnitMap.set(c.id, c.unit_id));

    const filteredInvoices = invoices.filter(inv => {
        const fromMatch = !dateFrom || inv.due_date >= dateFrom;
        const toMatch = !dateTo || inv.due_date <= dateTo;
        return fromMatch && toMatch;
    });

    const filteredExpenses = expenses.filter(exp => {
        const fromMatch = !dateFrom || exp.date >= dateFrom;
        const toMatch = !dateTo || exp.date <= dateTo;
        return fromMatch && toMatch;
    });

    filteredInvoices.forEach(inv => {
        const unitId = contractUnitMap.get(inv.contract_id);
        if(!unitId) return;
        const propertyId = unitPropertyMap.get(unitId);
        if (propertyId && profits.has(propertyId)) {
            profits.set(propertyId, profits.get(propertyId)! + (inv.paid_amount || 0));
        }
    });

    filteredExpenses.forEach(exp => {
        if (profits.has(exp.property_id)) {
            profits.set(exp.property_id, profits.get(exp.property_id)! - exp.amount);
        }
    });
    
    let totalNetProfit = 0;
    const finalProfits = selectedProperty === 'all'
      ? profits
      : new Map(Array.from(profits.entries()).filter(([id]) => id === selectedProperty));

    finalProfits.forEach(profit => totalNetProfit += profit);

    return { propertyProfits: finalProfits, totalNetProfit };
  }, [dateFrom, dateTo, selectedProperty, properties, units, contracts, invoices, expenses]);
  
  const partnerProfits = useMemo(() => {
    return partners.map(partner => {
      const profitDetails = partner.shares.map(share => {
        const profit = propertyProfits.get(share.property_id) || 0;
        const profitShare = profit * (share.share_percentage / 100);
        return { propertyId: share.property_id, sharePercentage: share.share_percentage, profitShare };
      }).filter(detail => propertyProfits.has(detail.propertyId)); // Only include properties in the current filter
      
      const totalProfit = profitDetails.reduce((sum, detail) => sum + detail.profitShare, 0);
      return { ...partner, profitDetails, totalProfit };
    });
  }, [partners, propertyProfits]);

  const propertyShareTotals = useMemo(() => {
    const totals = new Map<string, number>();
    properties.forEach(p => totals.set(p.id, 0));
    partners.forEach(p => {
      p.shares.forEach(s => {
        totals.set(s.property_id, (totals.get(s.property_id) || 0) + s.share_percentage);
      });
    });
    return totals;
  }, [partners, properties]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Partner.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['partners']),
  });
  
  const deleteAllMutation = useMutation({
      mutationFn: async () => {
          for (const partner of partners) await base44.entities.Partner.delete(partner.id);
      },
      onSuccess: () => queryClient.invalidateQueries(['partners']),
  });

  const handleEdit = (partner: Partner) => { setEditingPartner(partner); setShowForm(true); };
  const handleDelete = async (partner: Partner) => {
      if (await confirmDelete({ 
          title: 'Delete Partner', 
          message: `Are you sure you want to delete ${partner.name}?`,
          variant: 'destructive',
          confirmText: 'Delete'
      })) {
          deleteMutation.mutate(partner.id);
      }
  };
  const handleDeleteAll = async () => {
      if (await confirmDelete({ 
          title: 'Delete All Partners', 
          message: 'Are you sure you want to delete ALL partners?',
          variant: 'destructive',
          confirmText: 'Delete All'
      })) {
          deleteAllMutation.mutate();
      }
  };
  const handleFormClose = () => { setShowForm(false); setEditingPartner(null); };

  const handleGeneratePartnerReport = (partnerProfit: typeof partnerProfits[0]) => {
        const propertyMap = new Map(properties.map(p => [p.id, p.name]));
        const html = `
            <div class="header"><h1>Partner Profit Report</h1><h2>${partnerProfit.name}</h2></div>
            <div class="summary-card">
              <h3>Report Summary</h3>
              <p><strong>Property Filter:</strong> ${selectedProperty === 'all' ? 'All Properties' : propertyMap.get(selectedProperty) || 'N/A'}</p>
              <p><strong>Date Range:</strong> ${dateFrom || 'Start'} to ${dateTo || 'End'}</p>
              <p class="total">Total Calculated Profit Share: SAR ${partnerProfit.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <h3>Profit Breakdown by Property</h3>
            <table><thead><tr><th>Property</th><th>Your Share %</th><th>Profit Share (SAR)</th></tr></thead><tbody>
              ${partnerProfit.profitDetails.map(d => `<tr>
                <td>${propertyMap.get(d.propertyId) || 'Unknown'}</td>
                <td>${d.sharePercentage}%</td>
                <td>${d.profitShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>`).join('')}
            </tbody></table>`;
        printHTML(html, `Report for ${partnerProfit.name}`);
  };

  const handleGenerateOverallReport = () => {
        const propertyMap = new Map(properties.map(p => [p.id, p.name]));
        const html = `
            <div class="header"><h1>Overall Partner Profit Report</h1></div>
            <div class="summary-card">
              <h3>Report Summary</h3>
              <p><strong>Property Filter:</strong> ${selectedProperty === 'all' ? 'All Properties' : propertyMap.get(selectedProperty) || 'N/A'}</p>
              <p><strong>Date Range:</strong> ${dateFrom || 'Start'} to ${dateTo || 'End'}</p>
              <p class="total">Total Net Profit for Period: SAR ${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            ${partnerProfits.map(p => `
                <h3>${p.name}</h3>
                <p class="total">Total Share: SAR ${p.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <table><thead><tr><th>Property</th><th>Share %</th><th>Profit Share (SAR)</th></tr></thead><tbody>
                ${p.profitDetails.map(d => `<tr>
                    <td>${propertyMap.get(d.propertyId) || 'Unknown'}</td>
                    <td>${d.sharePercentage}%</td>
                    <td>${d.profitShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`).join('')}
                </tbody></table>
            `).join('<br/>')}
        `;
        printHTML(html, 'Overall Partner Report');
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <ConfirmationModal isProcessing={deleteMutation.isPending || deleteAllMutation.isPending} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div><h1 className="text-3xl font-bold text-slate-900">Partners & Profit</h1><p className="text-slate-600 mt-1">Manage partners and view their profit shares</p></div>
          <div className="flex gap-3">
             {Array.isArray(partners) && partners.length > 0 && <Button onClick={handleDeleteAll} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" disabled={deleteAllMutation.isPending}><Trash2 className="w-5 h-5 mr-2" /> Delete All</Button>}
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-5 h-5 mr-2" /> Add Partner</Button>
          </div>
        </div>

        {showForm && <PartnerForm partner={editingPartner} existingPartners={partners} properties={properties} onClose={handleFormClose} />}
        
        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1"><Label htmlFor="property-filter" className="text-xs font-semibold text-slate-600">FILTER BY BUILDING</Label><Select id="property-filter" value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="w-full md:w-48 bg-white"><option value="all">All Buildings</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
                <div className="space-y-1"><Label htmlFor="date-from" className="text-xs font-semibold text-slate-600">FROM DATE</Label><Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full md:w-40 bg-white" /></div>
                <div className="space-y-1"><Label htmlFor="date-to" className="text-xs font-semibold text-slate-600">TO DATE</Label><Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full md:w-40 bg-white" /></div>
                <div className="flex items-end pt-5"><Button variant="outline" onClick={() => { setSelectedProperty('all'); setDateFrom(''); setDateTo(''); }}>Clear</Button></div>
            </div>
          </CardHeader>
          <CardHeader className="flex flex-row justify-between items-center">
            <div><CardTitle>Portfolio Summary</CardTitle><p className="text-sm text-slate-500">Based on selected filters</p></div>
            <div><p className="text-sm text-slate-600">Total Net Profit</p><p className={`text-2xl font-bold ${totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>SAR {totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          </CardHeader>
        </Card>
        
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Partners</h2>
            <Button onClick={handleGenerateOverallReport} variant="outline"><Printer className="w-4 h-4 mr-2"/>Generate Overall Report</Button>
        </div>
        
        {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{Array(2).fill(0).map((_,i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
        : partnerProfits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partnerProfits.map(p => (
                  <Card key={p.id} className="shadow-md border-none flex flex-col">
                      <CardHeader className="flex flex-row justify-between items-start">
                          <div><CardTitle className="text-xl">{p.name}</CardTitle></div>
                          <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleGeneratePartnerReport(p)}><Printer className="w-4 h-4 text-gray-600"/></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="w-4 h-4 text-blue-600"/></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}><Trash2 className="w-4 h-4 text-red-600"/></Button>
                          </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-4">
                           <div className={`p-4 rounded-lg ${p.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                              <p className="text-sm text-slate-600">Calculated Profit Share</p>
                              <p className={`text-3xl font-bold ${p.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>SAR {p.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                              <h4 className="font-semibold mb-2 text-slate-700">Profit Breakdown</h4>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader><TableRow className="bg-slate-50"><TableHead>Building</TableHead><TableHead>Share %</TableHead><TableHead>Profit</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {p.profitDetails.length > 0 ? p.profitDetails.map(d => (
                                            <TableRow key={d.propertyId}>
                                                <TableCell>{properties.find(prop => prop.id === d.propertyId)?.name}</TableCell>
                                                <TableCell>{d.sharePercentage}%</TableCell>
                                                <TableCell className={d.profitShare >= 0 ? 'text-green-600' : 'text-red-600'}>{d.profitShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={3} className="text-center text-slate-500">No profit from selected properties</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                              </div>
                          </div>
                          {p.shares.map(s => propertyShareTotals.get(s.property_id)! > 100 && (
                            <div key={s.property_id} className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-xs rounded-md flex items-center gap-2">
                                <AlertCircle className="w-4 h-4"/>
                                <span>Warning: Total share for {properties.find(prop => prop.id === s.property_id)?.name} is {propertyShareTotals.get(s.property_id)}%.</span>
                            </div>
                          ))}
                      </CardContent>
                  </Card>
                ))}
            </div>
        ) : (
             <div className="text-center py-16 text-slate-500 bg-white rounded-lg shadow-md">
                <Briefcase className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-lg font-semibold">No partners yet</p>
                <p className="text-sm mt-1">Add your first partner to calculate profit shares</p>
            </div>
        )}
      </div>
    </div>
  );
}